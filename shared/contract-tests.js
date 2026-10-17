/*
 * Contract tests for profiles, per-profile storage and Progression Run rules.
 * Needs these globals loaded first: save-utils.js, profiles.js, progression/progression-state.js
 * and a (mock) global `localStorage`. Used by shared/profiles.test.js (Node) and shared/tests.html (browser).
 */
function runContractTests() {
  const results = [];

  function check(name, fn) {
    localStorage.clear();
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  }

  function expect(condition, message) {
    if (!condition) throw new Error(message || "assertion failed");
  }

  function expectThrows(fn, fragment) {
    let threw = false;
    try {
      fn();
    } catch (err) {
      threw = true;
      if (fragment) expect(err.message.includes(fragment), `wrong error: ${err.message}`);
    }
    expect(threw, "expected an error");
  }

  const LIST = ["A", "B", "C"];

  check("profileKey: sandbox keeps legacy keys, others are suffixed, none throws", () => {
    localStorage.setItem("ygoCollection", "{}");
    listProfiles();
    expectThrows(() => profileKey("ygoCollection"), "No active profile");
    setActiveProfile(SANDBOX_ID);
    expect(profileKey("ygoCollection") === "ygoCollection");
    const p = createProfile("Run1", "progression");
    expect(profileKey("ygoCollection") === `ygoCollection_${p.id}`);
    expect(profileKey("ygoDeck") === `ygoDeck_${p.id}`);
  });

  check("migration: legacy data creates Sandbox and never touches legacy keys", () => {
    localStorage.setItem("ygoCollection", '{"cards":[1],"future":true}');
    localStorage.setItem("ygoDeck", "[2]");
    const profiles = listProfiles();
    expect(profiles.length === 1 && profiles[0].id === SANDBOX_ID && profiles[0].mode === "sandbox");
    expect(localStorage.getItem("ygoCollection") === '{"cards":[1],"future":true}');
    expect(localStorage.getItem("ygoDeck") === "[2]");
  });

  check("migration: no legacy data creates no profile and writes nothing", () => {
    expect(listProfiles().length === 0);
    expect(localStorage.getItem(PROFILES_KEY) === null);
  });

  check("names: empty, duplicate (case-insensitive) and invalid mode are rejected", () => {
    expectThrows(() => createProfile("  ", "progression"), "name");
    createProfile("Alpha", "progression");
    expectThrows(() => createProfile("alpha", "progression"), "already exists");
    expectThrows(() => createProfile("Beta", "sandbox"), "game mode");
    expectThrows(() => createProfile("Beta", "nope"), "game mode");
  });

  check("rename: allows own name changes, rejects other profile's name", () => {
    const a = createProfile("Alpha", "progression");
    const b = createProfile("Beta", "progression");
    renameProfile(a.id, "ALPHA");
    expectThrows(() => renameProfile(b.id, "alpha"), "already exists");
  });

  check("unknown registry fields are preserved on write", () => {
    saveData({ activeId: null, profiles: [], futureField: { x: 1 } }, PROFILES_KEY);
    createProfile("Alpha", "progression");
    expect(loadData(PROFILES_KEY).futureField.x === 1);
  });

  check("delete: removes only that profile's keys; legacy and other profiles untouched", () => {
    localStorage.setItem("ygoCollection", "{}");
    const a = createProfile("Alpha", "progression");
    const b = createProfile("Beta", "progression");
    localStorage.setItem(`ygoCollection_${a.id}`, "{}");
    localStorage.setItem(`ygoRun_${a.id}`, "{}");
    localStorage.setItem(`ygoCollection_${b.id}`, "{}");
    deleteProfile(a.id);
    expect(localStorage.getItem(`ygoCollection_${a.id}`) === null);
    expect(localStorage.getItem(`ygoRun_${a.id}`) === null);
    expect(localStorage.getItem(`ygoCollection_${b.id}`) !== null);
    expect(localStorage.getItem("ygoCollection") !== null);
    expect(listProfiles().length === 2);
  });

  check("export covers profile registry, per-profile collection and run keys", () => {
    const p = createProfile("Alpha", "progression");
    saveData({ cards: [] }, profileKey("ygoCollection"));
    saveRun(p.id, newRun(LIST));
    const keys = Object.keys(buildBackup().data);
    expect(keys.includes(PROFILES_KEY));
    expect(keys.includes(`ygoCollection_${p.id}`));
    expect(keys.includes(`ygoRun_${p.id}`));
  });

  check("removeData removes a key", () => {
    saveData({ a: 1 }, "ygoTmp");
    expect(removeData("ygoTmp") && loadData("ygoTmp") === null);
  });

  check("run: starts at first booster with box closed", () => {
    const run = newRun(LIST);
    expect(run.current === "A" && run.completed.length === 0 && run.boxOpened === false);
    expect(runSummary(null, LIST) === "Stage 1/3 – Box not opened");
  });

  check("run: cannot complete before opening, cannot open twice", () => {
    let run = newRun(LIST);
    expect(!canCompleteStage(run).ok && canCompleteStage(run).reason.length > 0);
    expect(canOpenBox(run).ok);
    run = openBoxApplied(run);
    expect(!canOpenBox(run).ok && canOpenBox(run).reason.length > 0);
    expect(canCompleteStage(run).ok);
    expect(runSummary(run, LIST) === "Stage 1/3 – Box opened");
  });

  check("run: completing advances in list order, keeps history, finishes at the end", () => {
    let run = openBoxApplied(newRun(LIST));
    run = completeStage(run, LIST);
    expect(run.current === "B" && run.completed.join() === "A" && run.boxOpened === false);
    run = completeStage(openBoxApplied(run), LIST);
    run = completeStage(openBoxApplied(run), LIST);
    expect(run.current === null && run.completed.join() === "A,B,C" && run.finishedAt);
    expect(runSummary(run, LIST) === "Finished");
    expect(!canOpenBox(run).ok && !canCompleteStage(run).ok);
  });

  check("run: booster added mid-run appears in remaining; finished run stays finished", () => {
    let run = completeStage(openBoxApplied(newRun(LIST)), LIST);
    const extended = ["A", "B", "B2", "C"];
    expect(remainingStages(run, extended).join() === "B2,C");
    run = completeStage(openBoxApplied(run), extended);
    expect(run.current === "B2" && run.completed.join() === "A,B");

    let done = newRun(["A"]);
    done = completeStage(openBoxApplied(done), ["A"]);
    expect(done.current === null);
    expect(remainingStages(done, ["A", "Z"]).length === 0);
  });

  check("run: persists via saveData and unknown fields survive", () => {
    const run = { ...newRun(LIST), future: "keep" };
    saveRun("p1", run);
    saveRun("p1", completeStage(openBoxApplied(loadRun("p1")), LIST));
    const stored = loadRun("p1");
    expect(stored.future === "keep" && stored.current === "B");
  });

  return results;
}
