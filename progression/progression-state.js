/* Progression Run state (pure logic + persistence). Stages are identified by booster name, never by index. */
const BOX_PACKS = 24;
const STAGE_WIN_REWARD_CENTS = 4000; // 40.00 for winning the duel that completes a stage
const STAGE_LOSS_REWARD_CENTS = 2000; // 20.00 for losing it
const STAGE_LOSS_PACKS = 5; // packs of the set being left behind, given for a lost duel

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

/* ---- Box progress (the 24 packs of the current stage) ---- */

function emptyBox() {
  return { packsOpened: 0, pack: null, pulled: [] };
}

function getBox(run) {
  return run.box && typeof run.box === "object" ? run.box : emptyBox();
}

/* "not-started" | "in-progress" | "finished". A legacy run saved with boxOpened:true counts as finished. */
function boxPhase(run) {
  const box = getBox(run);
  if (run.boxOpened || box.packsOpened >= BOX_PACKS) return "finished";
  if (box.pack !== null || box.packsOpened > 0) return "in-progress";
  return "not-started";
}

/* pack = { cards, revealed } with revealed.length === cards.length */
function startPack(run, pack) {
  const box = getBox(run);
  return { ...run, box: { ...box, pack: { cards: pack.cards, revealed: pack.cards.map(() => false) } } };
}

function revealInPack(run, index) {
  const box = getBox(run);
  const pack = box.pack;
  if (!pack || pack.revealed[index]) return run;
  const revealed = pack.revealed.slice();
  revealed[index] = true;
  return {
    ...run,
    box: { ...box, pack: { ...pack, revealed }, pulled: box.pulled.concat(pack.cards[index]) },
  };
}

/* Call once every card of the pack is revealed. Returns { run, cards } where cards must be merged into the backlog
 * (copies already saved early, from the card details window, are left out). */
function finishPack(run) {
  const box = getBox(run);
  const cards = box.pack ? box.pack.cards.filter((card) => !card.savedEarly) : [];
  const packsOpened = box.packsOpened + 1;
  return {
    cards,
    run: {
      ...run,
      boxOpened: packsOpened >= BOX_PACKS ? true : run.boxOpened,
      box: { ...box, packsOpened, pack: null },
    },
  };
}

function canOpenBox(run) {
  if (run.current === null) return { ok: false, reason: "This run is finished." };
  if (boxPhase(run) !== "not-started") return { ok: false, reason: "This stage's box is already started." };
  return { ok: true, reason: "" };
}

function canCompleteStage(run) {
  if (run.current === null) return { ok: false, reason: "This run is finished." };
  if (!run.boxOpened) return { ok: false, reason: "Open all packs of this stage's box before completing it." };
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
    box: emptyBox(),
    finishedAt: next === null ? new Date().toISOString() : null,
  };
}

/*
 * Completes the current stage after its duel. Winning adds STAGE_WIN_REWARD_CENTS to the balance; losing adds
 * STAGE_LOSS_REWARD_CENTS and STAGE_LOSS_PACKS unopened packs of the set being left behind (the stage just completed).
 */
function completeStageWithDuel(run, boosterList, won) {
  const leaving = run.current;
  const balance = Number.isInteger(run.balanceCents) && run.balanceCents > 0 ? run.balanceCents : 0;
  const completed = completeStage(run, boosterList);
  if (won) return { ...completed, balanceCents: balance + STAGE_WIN_REWARD_CENTS };
  const inventory = run.packInventory || {};
  return {
    ...completed,
    balanceCents: balance + STAGE_LOSS_REWARD_CENTS,
    packInventory: { ...inventory, [leaving]: (inventory[leaving] || 0) + STAGE_LOSS_PACKS },
  };
}

/* Stages after the current one that are not completed, in list order. */
function remainingStages(run, boosterList) {
  if (run.current === null) return [];
  const index = boosterList.indexOf(run.current);
  return boosterList.slice(index + 1).filter((name) => !run.completed.includes(name));
}

/* "opened" (darkened) | "next" (clean) | "locked" (light gray) */
function stageState(run, name, boosterList) {
  if (run.completed.includes(name)) return "opened";
  if (name === run.current) return run.boxOpened ? "opened" : "next";
  return "locked";
}

function runSummary(run, boosterList) {
  const state = run || newRun(boosterList);
  if (state.current === null) return "Finished";
  const stage = state.completed.length + 1;
  return `Stage ${stage}/${boosterList.length} – ${state.boxOpened ? "Box opened" : "Box not opened"}`;
}

/* ---- Bought packs opened outside the stage box (run.extraPack) ---- */

function getExtraPack(run) {
  return run.extraPack && run.extraPack.pack ? run.extraPack : null;
}

/*
 * Starts opening one bought pack: the inventory drops by one and the generated pack becomes run.extraPack, in a
 * single new record. Throws when there is no such pack in the inventory or another bought pack is open.
 */
function startExtraPack(run, setName, cards) {
  const owned = (run.packInventory && run.packInventory[setName]) || 0;
  if (!(owned >= 1)) throw new Error("No such booster in your inventory.");
  if (getExtraPack(run)) throw new Error("Finish the pack you are opening first.");
  return {
    ...run,
    packInventory: { ...run.packInventory, [setName]: owned - 1 },
    extraPack: { setName, pack: { cards, revealed: cards.map(() => false) } },
  };
}

function revealInExtraPack(run, index) {
  const extra = getExtraPack(run);
  if (!extra || extra.pack.revealed[index]) return run;
  const revealed = extra.pack.revealed.slice();
  revealed[index] = true;
  return { ...run, extraPack: { ...extra, pack: { ...extra.pack, revealed } } };
}

/* Call once every card is revealed: returns { run, cards } (cards must be merged into the backlog). */
function finishExtraPack(run) {
  const extra = getExtraPack(run);
  return { cards: extra ? extra.pack.cards.filter((card) => !card.savedEarly) : [], run: { ...run, extraPack: null } };
}

/* Completed stages plus the current one, in booster-list order (the boosters a run can buy and browse). */
function reachedBoosters(run, boosterList) {
  return boosterList.filter((name) => run.completed.includes(name) || name === run.current);
}

/* ---- Copies saved early: a pulled card put into an engine is saved to the backlog before its pack is finished ---- */

const PACK_SOURCE_BOX = "box"; // the pack of the stage's box
const PACK_SOURCE_EXTRA = "extra"; // a bought booster being opened

function openPackOf(run, source) {
  if (source === PACK_SOURCE_EXTRA) return run.extraPack ? run.extraPack.pack : null;
  return run.box && run.box.pack ? run.box.pack : null;
}

function isSamePulledCopy(a, b) {
  return a.name === b.name && a.set === b.set && a.rarity === b.rarity && (a.setCode || null) === (b.setCode || null);
}

/* Index of the first revealed copy of `card` in the open pack that is not saved early yet, or -1. */
function unsavedCopyIndex(run, source, card) {
  const pack = openPackOf(run, source);
  if (!pack) return -1;
  return pack.cards.findIndex((c, i) => pack.revealed[i] && !c.savedEarly && isSamePulledCopy(c, card));
}

/* How many revealed copies of `card` in the open pack could still be saved early. */
function unsavedCopiesOf(run, source, card) {
  const pack = openPackOf(run, source);
  if (!pack) return 0;
  return pack.cards.filter((c, i) => pack.revealed[i] && !c.savedEarly && isSamePulledCopy(c, card)).length;
}

/* A new run where one unsaved copy of `card` is flagged as saved early; the same run when there is none. */
function markCardSavedEarly(run, source, card) {
  const index = unsavedCopyIndex(run, source, card);
  if (index === -1) return run;
  const pack = openPackOf(run, source);
  const cards = pack.cards.map((c, i) => (i === index ? { ...c, savedEarly: true } : c));
  if (source === PACK_SOURCE_EXTRA) return { ...run, extraPack: { ...run.extraPack, pack: { ...pack, cards } } };
  return { ...run, box: { ...run.box, pack: { ...pack, cards } } };
}
