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

  /* ---- Pull history, rarity and pack opening (spec 010) ---- */

  check("printings: same set+rarity increments, different set/rarity adds, price stays at first pull", () => {
    const card = { name: "X", quantityOwned: 0 };
    addPrinting(card, { set: "S1", rarity: "Ultra Rare", price: 5 });
    addPrinting(card, { set: "S1", rarity: "Ultra Rare", price: 9 });
    addPrinting(card, { set: "S2", rarity: "Common", price: 0.1 });
    expect(card.printings.length === 2);
    expect(card.printings[0].quantity === 2 && card.printings[0].price === 5);
    expect(card.printings[1].set === "S2" && card.printings[1].rarity === "Common");
  });

  check("printingSummary: unknown copies for old cards, none for fresh ones", () => {
    expect(printingSummary({ quantityOwned: 3 }).unknownQuantity === 3);
    const card = { quantityOwned: 3, printings: [{ set: "S", rarity: "Rare", price: 1, quantity: 2 }] };
    const summary = printingSummary(card);
    expect(summary.unknownQuantity === 1 && summary.printings.length === 1);
    expect(printingSummary({ quantityOwned: 0, printings: [] }).unknownQuantity === 0);
  });

  check("trimPrintings keeps quantityOwned >= sum of printings (oldest trimmed first)", () => {
    const card = {
      quantityOwned: 2,
      printings: [
        { set: "A", rarity: "Rare", price: 1, quantity: 2 },
        { set: "B", rarity: "Common", price: 0, quantity: 2 },
      ],
    };
    trimPrintings(card);
    expect(printingsTotal(card) === 2);
    expect(card.printings.length === 1 && card.printings[0].set === "B");
    card.quantityOwned = 0;
    trimPrintings(card);
    expect(card.printings.length === 0);
  });

  check("rarityRank orders rarities and treats unknown as common", () => {
    expect(rarityRank("Common") === 0 && rarityRank(null) === 0 && rarityRank("") === 0);
    expect(rarityRank("Rare") > rarityRank("Common"));
    expect(rarityRank("Super Rare") > rarityRank("Rare"));
    expect(rarityRank("Secret Rare") > rarityRank("Super Rare"));
    expect(rarityRank("Ultra Secret Rare") > rarityRank("Secret Rare"));
    expect(rarityLabel(null) === "Unknown rarity" && rarityLabel("Ultra Rare") === "Ultra Rare");
  });

  check("every rarity tier has its own look and specific names beat generic ones", () => {
    const looks = RARITY_GLOW_TIERS.map((t) => t.color || (t.shine ? t.shine.join("+") : "rainbow"));
    expect(new Set(looks).size === looks.length, "two tiers share the same color");
    expect(!looks.includes(DEFAULT_RARITY_GLOW.color), "a tier reuses the common color");
    const glow = (r) => getRarityGlow(r).id;
    expect(glow("Common") === "common" && glow(null) === "common");
    expect(glow("Short Print") === "short-print" && glow("Super Short Print") === "super-short-print");
    expect(glow("Rare") === "rare" && glow("Super Rare") === "super-rare" && glow("Ultra Rare") === "ultra-rare");
    expect(glow("Ultra Rare") !== glow("Rare"), "Ultra Rare must not look like Rare");
    expect(glow("Secret Rare") === "secret" && glow("Ultra Secret Rare") === "ultra-secret");
    expect(glow("Duel Terminal Normal Parallel Rare") === "normal-parallel");
    expect(glow("Ultra Parallel Rare") === "ultra-parallel" && glow("Secret Parallel Rare") === "secret-parallel");
    expect(glow("Starlight Rare") === "starlight" && glow("Gold Secret Rare") === "gold-secret");
    expect(rarityRank("Short Print") > rarityRank("Common") && rarityRank("Rare") > rarityRank("Short Print"));
    expect(rarityRank("Ultra Rare") > rarityRank("Super Rare") && rarityRank("Ultimate Rare") > rarityRank("Ultra Rare"));
  });

  check("sortPackByRarity: rarest last, ties by price, input untouched", () => {
    const pack = [
      { name: "a", rarity: "Secret Rare", price: 1 },
      { name: "b", rarity: "Common", price: 2 },
      { name: "c", rarity: "Common", price: 1 },
      { name: "d", rarity: "Rare", price: 1 },
      { name: "e", rarity: null, price: 0 },
    ];
    const sorted = sortPackByRarity(pack);
    expect(sorted.map((c) => c.name).join("") === "ecbda");
    expect(pack[0].name === "a");
  });

  check("mergeCardsIntoBacklog records printings and preserves unknown fields", () => {
    createProfile("Merge", "progression");
    const key = profileKey("ygoCollection");
    saveData({ cards: [], decks: [{ x: 1 }], futureField: "keep" }, key);
    const ok = mergeCardsIntoBacklog([
      { name: "Dragon", set: "S1", rarity: "Ultra Rare", price: 5 },
      { name: "Dragon", set: "S2", rarity: "Common", price: 0.2 },
      { name: "Dragon", set: "S1", rarity: "Ultra Rare", price: 7 },
    ]);
    expect(ok === true);
    const blob = loadData(key);
    expect(blob.futureField === "keep" && blob.decks.length === 1);
    expect(blob.cards.length === 1 && blob.cards[0].quantityOwned === 3);
    expect(blob.cards[0].printings.length === 2 && blob.cards[0].printings[0].quantity === 2);
    expect(blob.cards[0].printings[0].price === 5);
  });

  check("box: phases, reveal, finish and stage completion", () => {
    let run = newRun(LIST);
    expect(boxPhase(run) === "not-started" && canOpenBox(run).ok);
    const pack = { cards: [{ name: "a" }, { name: "b" }] };
    run = startPack(run, pack);
    expect(boxPhase(run) === "in-progress" && !canOpenBox(run).ok);
    expect(run.box.pack.revealed.length === 2 && run.box.pack.revealed.every((r) => r === false));
    run = revealInPack(run, 0);
    run = revealInPack(run, 0); // revealing twice changes nothing
    expect(run.box.pulled.length === 1 && run.box.pack.revealed[0] === true);
    run = revealInPack(run, 1);
    const finished = finishPack(run);
    expect(finished.cards.length === 2 && finished.run.box.packsOpened === 1 && finished.run.box.pack === null);
    expect(!finished.run.boxOpened && boxPhase(finished.run) === "in-progress");
    expect(!canCompleteStage(finished.run).ok);
  });

  check("box: the 24th pack opens the box; stage completion resets box progress", () => {
    let run = newRun(LIST);
    for (let i = 0; i < BOX_PACKS; i++) {
      run = startPack(run, { cards: [{ name: "a" }] });
      run = revealInPack(run, 0);
      run = finishPack(run).run;
    }
    expect(run.boxOpened === true && boxPhase(run) === "finished" && run.box.packsOpened === BOX_PACKS);
    expect(canCompleteStage(run).ok);
    run = completeStage(run, LIST);
    expect(run.current === "B" && run.box.packsOpened === 0 && run.box.pulled.length === 0);
    expect(boxPhase(run) === "not-started");
  });

  check("box: legacy runs (boxOpened without box, or no box at all) still work", () => {
    const legacyOpened = { completed: [], current: "A", boxOpened: true };
    expect(boxPhase(legacyOpened) === "finished" && canCompleteStage(legacyOpened).ok);
    const legacyClosed = { completed: [], current: "A", boxOpened: false };
    expect(boxPhase(legacyClosed) === "not-started");
  });

  check("stageState: opened / next / locked", () => {
    let run = newRun(LIST);
    expect(stageState(run, "A", LIST) === "next");
    expect(stageState(run, "B", LIST) === "locked");
    run = openBoxApplied(run);
    expect(stageState(run, "A", LIST) === "opened");
    run = completeStage(run, LIST);
    expect(stageState(run, "A", LIST) === "opened" && stageState(run, "B", LIST) === "next" && stageState(run, "C", LIST) === "locked");
  });

  return results;
}
