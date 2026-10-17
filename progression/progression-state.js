/* Progression Run state (pure logic + persistence). Stages are identified by booster name, never by index. */
function runKey(profileId) {
  return `ygoRun_${profileId}`;
}

function loadRun(profileId) {
  const run = loadData(runKey(profileId));
  return run && typeof run === "object" && Array.isArray(run.completed) ? run : null;
}

function saveRun(profileId, run) {
  return saveData(run, runKey(profileId));
}

function newRun(boosterList) {
  return {
    completed: [],
    current: boosterList.length > 0 ? boosterList[0] : null,
    boxOpened: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
}

function canOpenBox(run) {
  if (run.current === null) return { ok: false, reason: "This run is finished." };
  if (run.boxOpened) return { ok: false, reason: "This stage's box is already opened." };
  return { ok: true, reason: "" };
}

function canCompleteStage(run) {
  if (run.current === null) return { ok: false, reason: "This run is finished." };
  if (!run.boxOpened) return { ok: false, reason: "Open this stage's box before completing it." };
  return { ok: true, reason: "" };
}

function openBoxApplied(run) {
  return { ...run, boxOpened: true };
}

function nextBooster(boosterList, current) {
  const index = boosterList.indexOf(current);
  return index === -1 ? null : boosterList[index + 1] || null;
}

function completeStage(run, boosterList) {
  const next = nextBooster(boosterList, run.current);
  return {
    ...run,
    completed: run.completed.concat(run.current),
    current: next,
    boxOpened: false,
    finishedAt: next === null ? new Date().toISOString() : null,
  };
}

/* Stages after the current one that are not completed, in list order. */
function remainingStages(run, boosterList) {
  if (run.current === null) return [];
  const index = boosterList.indexOf(run.current);
  return boosterList.slice(index + 1).filter((name) => !run.completed.includes(name));
}

function runSummary(run, boosterList) {
  const state = run || newRun(boosterList);
  if (state.current === null) return "Finished";
  const stage = state.completed.length + 1;
  return `Stage ${stage}/${boosterList.length} – ${state.boxOpened ? "Box opened" : "Box not opened"}`;
}
