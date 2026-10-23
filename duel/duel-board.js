/*
 * The public board of a duel: what both players may see. Pure and deterministic: no DOM, no network, no storage.
 * Each player's side holds the stacks of the field zones, the graveyard, the banished zone and the COUNTS of the hand,
 * the deck and the extra deck (never their contents). A card's data is in the board only while the card is visible.
 *
 *   applyBoardEvent(sim, event) -> { sim, ok, reason, inverse, note }
 *
 * `inverse` is an event that applies after this one and restores the previous board (used by Undo). Events only touch
 * the side of the player named in `event.by`. See data-model.md for the events.
 */
const STACK_ZONES = ["field", "shared"]; // places whose slots hold stacks of cards
const COUNT_PILES = ["hand", "deck", "extra"]; // places known only by how many cards they hold
const PUBLIC_PILES = ["gy", "banished"]; // places whose cards are listed
const DEFAULT_POSITION = "atk";
const STARTING_HAND_SIZE = 5; // cards drawn when the duel starts (the same value as duel-cards.js STARTING_HAND)

/*
 * The board as drawn for the viewer: uppercase is the viewer's own cells, lowercase the opponent's, S a shared zone,
 * X a cell with no cards. p/P playable zone, d/D deck, e/E extra deck, g/G graveyard, b/B banished zone.
 */
const BOARD_LAYOUT = ["dpppppe", "gpppppp", "bXSXSXB", "PPPPPPG", "EPPPPPD"];
const BOARD_LAYOUT_VERSION = 2; // stored in sim.layout; an older saved duel lacks it
const BOARD_PILE_LETTERS = { d: "deck", e: "extra", g: "gy", b: "banished" };
const SIGNAL_KINDS = ["activate", "target", "attack"];
const BOARD_ROWS = BOARD_LAYOUT.length;
const BOARD_COLUMNS = BOARD_LAYOUT[0].length;
const OWN_FIELD_CELLS = []; // [row, column] of the viewer's playable zones in reading order; the index is the slot
BOARD_LAYOUT.forEach((line, row) => {
  [...line].forEach((letter, col) => {
    if (letter === "P") OWN_FIELD_CELLS.push([row, col]);
  });
});
const FIELD_SLOTS = OWN_FIELD_CELLS.length; // playable zones per player
const SHARED_SLOTS = BOARD_LAYOUT.join("").split("S").length - 1;

/*
 * The 35 cells of the board as { row, col, kind, side, slot } (kind: field, shared, deck, extra, gy, banished, empty;
 * side: "own" | "opp" | null). A player's slot is its index among their playable zones in reading order of their OWN
 * view, so the opponent's slots follow the layout turned 180 degrees: slot n is the same cell on both players' screens.
 */
function boardCells() {
  const cells = [];
  let shared = 0;
  BOARD_LAYOUT.forEach((line, row) => {
    [...line].forEach((letter, col) => {
      const lower = letter.toLowerCase();
      const side = letter === "X" || letter === "S" ? null : letter === lower ? "opp" : "own";
      if (letter === "X") return cells.push({ row, col, kind: "empty", side, slot: null });
      if (letter === "S") return cells.push({ row, col, kind: "shared", side, slot: shared++ });
      if (lower === "p") {
        const local = side === "own" ? [row, col] : [BOARD_ROWS - 1 - row, BOARD_COLUMNS - 1 - col];
        const slot = OWN_FIELD_CELLS.findIndex(([r, c]) => r === local[0] && c === local[1]);
        return cells.push({ row, col, kind: "field", side, slot });
      }
      return cells.push({ row, col, kind: BOARD_PILE_LETTERS[lower], side, slot: null });
    });
  });
  return cells;
}

/* The player a card belongs to: the side prefix of its uid "<side>-<n>". */
const ownerOf = (uid) => Number(String(uid).split("-")[0]);

/* A saved duel board made before this layout existed. */
const isOldBoard = (sim) => Boolean(sim) && sim.layout !== BOARD_LAYOUT_VERSION;

function emptySide() {
  const field = Array.from({ length: FIELD_SLOTS }, () => []);
  return { deckName: "", ready: false, handCount: 0, deckCount: 0, extraCount: 0, field, gy: [], banished: [], revealed: {} };
}

function newSim() {
  return {
    layout: BOARD_LAYOUT_VERSION,
    started: false,
    nocards: false,
    generation: 0,
    rematch: null,
    players: [emptySide(), emptySide()],
    shared: Array.from({ length: SHARED_SLOTS }, () => []),
    signal: null, // the last signal: { uid, kind, by, n }
    signalCount: 0, // signals made so far (n of the next one), so a cleared marker is never confused with a new one
  };
}

const copyOf = (value) => JSON.parse(JSON.stringify(value));
const refuseBoard = (sim, reason) => ({ sim, ok: false, reason });
const countKey = (zone) => `${zone}Count`;
const isZone = (zone) => STACK_ZONES.includes(zone);

/* The stack at a place ({ zone: "field"|"shared", slot }): the player's own field slot or a shared zone. */
function stackOf(sim, side, place) {
  if (!isZone(place.zone) || !Number.isInteger(place.slot)) return null;
  return (place.zone === "shared" ? sim.shared : side.field)[place.slot] || null;
}

/* Takes the card out of where it was; returns what it was (so it can go back) or an error. */
function takeCard(sim, side, from, uid) {
  if (COUNT_PILES.includes(from.zone)) {
    const key = countKey(from.zone);
    if (side[key] <= 0) return { error: `There is no card in the ${from.zone === "hand" ? "hand" : from.zone === "deck" ? "deck" : "extra deck"}.` };
    side[key] -= 1;
    let revealed;
    if (from.zone === "hand" && uid && side.revealed[uid]) {
      revealed = side.revealed[uid];
      delete side.revealed[uid];
    }
    return { place: { zone: from.zone }, revealed };
  }
  if (PUBLIC_PILES.includes(from.zone)) {
    const index = side[from.zone].findIndex((c) => c.uid === uid);
    if (index === -1) return { error: "That card is not there any more." };
    const [entry] = side[from.zone].splice(index, 1);
    return { place: { zone: from.zone, index }, entry };
  }
  const stack = stackOf(sim, side, from);
  if (!stack) return { error: "That zone does not exist." };
  const index = stack.findIndex((c) => c.uid === uid);
  if (index === -1) return { error: "That card is not there any more." };
  const [entry] = stack.splice(index, 1);
  return { place: { zone: from.zone, slot: from.slot, index }, entry };
}

/*
 * Puts the card in its new place; returns an error text or null. `index` (used by Undo) restores a position. A card
 * on the board goes to the field of the mover (`side`) or a shared zone; a card that leaves the board goes to the
 * piles of its owner, whoever moves it.
 */
function putCard(sim, side, owner, to, uid, shown) {
  const { faceUp, pos, card } = shown;
  if (COUNT_PILES.includes(to.zone)) {
    owner[countKey(to.zone)] += 1;
    return null;
  }
  if (to.zone === "gy") {
    if (!card) return "A card sent to the graveyard needs its card data.";
    insertAt(owner.gy, { uid, card }, to.index);
    return null;
  }
  if (to.zone === "banished") {
    if (faceUp && !card) return "A face-up banished card needs its card data.";
    insertAt(owner.banished, { uid, card: faceUp ? card : null }, to.index);
    return null;
  }
  const stack = stackOf(sim, side, to);
  if (!stack) return "That zone does not exist.";
  if (faceUp && !card) return "A face-up card needs its card data.";
  insertAt(stack, { uid, faceUp: Boolean(faceUp), pos: pos || DEFAULT_POSITION, card: faceUp ? card : null }, to.index);
  return null;
}

function insertAt(list, entry, index) {
  if (Number.isInteger(index) && index >= 0 && index < list.length) list.splice(index, 0, entry);
  else list.push(entry);
}

/* What the moved card looked like before, to restore it exactly with Undo. */
function visibleBefore(taken) {
  const entry = taken.entry;
  if (!entry) return { faceUp: false, pos: DEFAULT_POSITION, card: undefined };
  if (taken.place.zone === "gy") return { faceUp: true, pos: DEFAULT_POSITION, card: entry.card };
  if (taken.place.zone === "banished") return { faceUp: entry.card !== null, pos: DEFAULT_POSITION, card: entry.card || undefined };
  return { faceUp: entry.faceUp, pos: entry.pos, card: entry.card || undefined };
}

function applyMove(next, event) {
  const side = next.players[event.by];
  const owner = next.players[ownerOf(event.uid)];
  const from = event.from || {};
  const to = event.to || {};
  if (!owner) return { error: "That is not a card of this duel." };
  if (!isZone(from.zone) && ownerOf(event.uid) !== event.by) return { error: "That card is not yours." }; // hand, deck, extra deck and piles are the owner's
  const taken = takeCard(next, side, from, event.uid);
  if (taken.error) return { error: taken.error };
  const before = visibleBefore(taken);
  const foreign = ownerOf(event.uid) !== event.by; // a card the mover controls but does not own
  if (foreign && before.faceUp && !event.faceUp && isZone(to.zone)) return { error: "Only its owner can turn that card face-down." };
  // the card data that is already public stays available for the new place (face-up cards keep their data)
  const card = event.card || before.card;
  const shown = { faceUp: event.faceUp, pos: event.pos, card };
  if (foreign && !card && (to.zone === "gy" || (to.zone === "banished" && event.faceUp))) return { error: "Only its owner can send that face-down card there." };
  const problem = putCard(next, side, owner, to, event.uid, shown);
  if (problem) return { error: problem };
  // where the card is now, so Undo can take it from there and put it back where it was
  const nowAt = { ...(event.to || {}) };
  if (isZone(nowAt.zone) || PUBLIC_PILES.includes(nowAt.zone)) delete nowAt.index;
  if (foreign) return {}; // a card of the other player moved by its controller cannot be undone from this side
  const inverse = {
    kind: "move",
    by: event.by,
    uid: event.uid,
    from: nowAt,
    to: taken.place,
    faceUp: before.faceUp,
    pos: before.pos,
    ...(before.card ? { card: before.card } : {}),
    ...(taken.revealed ? { revealedBack: taken.revealed } : {}),
  };
  return { inverse };
}

function applyEventToSide(next, event) {
  const side = next.players[event.by];
  switch (event.kind) {
    case "ready":
      if (next.started) return { error: "The duel already started." };
      side.ready = true;
      side.deckName = String(event.deckName || "");
      side.deckCount = Math.max(0, event.mainCount | 0);
      side.extraCount = Math.max(0, event.extraCount | 0);
      side.handCount = 0;
      return {};
    case "draw":
      if (side.deckCount <= 0) return { note: "empty-deck" };
      side.deckCount -= 1;
      side.handCount += 1;
      return { inverse: { kind: "draw-back", by: event.by } };
    case "draw-back":
      side.deckCount += 1;
      side.handCount = Math.max(0, side.handCount - 1);
      return {};
    case "move": {
      const result = applyMove(next, event);
      if (result.error) return result;
      if (event.revealedBack && event.to && event.to.zone === "hand") side.revealed[event.uid] = event.revealedBack;
      return result;
    }
    case "flip": {
      const stack = stackOf(next, side, event);
      const entry = stack && stack.find((c) => c.uid === event.uid);
      if (!entry) return { error: "That card is not there any more." };
      const previous = { faceUp: entry.faceUp, card: entry.card };
      if (!event.faceUp && entry.faceUp && ownerOf(event.uid) !== event.by) return { error: "Only its owner can turn that card face-down." };
      const card = event.faceUp ? event.card || entry.card : null;
      if (event.faceUp && !card) return { error: "A face-up card needs its card data." };
      entry.faceUp = Boolean(event.faceUp);
      entry.card = card;
      if (ownerOf(event.uid) !== event.by) return {};
      return { inverse: { kind: "flip", by: event.by, uid: event.uid, zone: event.zone, slot: event.slot, faceUp: previous.faceUp, ...(previous.card ? { card: previous.card } : {}) } };
    }
    case "position": {
      const stack = stackOf(next, side, event);
      const entry = stack && stack.find((c) => c.uid === event.uid);
      if (!entry) return { error: "That card is not there any more." };
      const previous = entry.pos;
      entry.pos = event.pos === "def" ? "def" : DEFAULT_POSITION;
      return { inverse: { kind: "position", by: event.by, uid: event.uid, zone: event.zone, slot: event.slot, pos: previous } };
    }
    case "give": {
      const from = event.from || {};
      const to = event.to || {};
      if (!isZone(from.zone)) return { error: "Only a card on the board can be given." };
      if (to.zone !== "field" || to.side !== 1 - event.by) return { error: "Control can only be given to a zone of the other player." };
      const target = next.players[to.side].field[to.slot];
      if (!target) return { error: "That zone does not exist." };
      const taken = takeCard(next, side, from, event.uid);
      if (taken.error) return { error: taken.error };
      const card = event.card || taken.entry.card;
      if (!card) return { error: "Only a face-up card can be given." };
      target.push({ uid: event.uid, faceUp: true, pos: taken.entry.pos, card });
      return {};
    }
    case "signal": {
      if (!SIGNAL_KINDS.includes(event.signal)) return { error: "Unknown signal." };
      const onBoard = next.shared.concat(side.field).some((stack) => stack.some((c) => c.uid === event.uid)) || PUBLIC_PILES.some((pile) => side[pile].some((c) => c.uid === event.uid));
      if (!onBoard) return { error: "Only a card on the board can signal." };
      next.signalCount += 1;
      next.signal = { uid: event.uid, kind: event.signal, by: event.by, n: next.signalCount };
      return {};
    }
    case "signal-clear":
      next.signal = null;
      return {};
    case "reveal":
      if (!event.card || !event.uid) return { error: "A revealed card needs its card data." };
      side.revealed[event.uid] = event.card;
      return { inverse: { kind: "hide", by: event.by, uid: event.uid } };
    case "hide": {
      const card = side.revealed[event.uid];
      delete side.revealed[event.uid];
      return card ? { inverse: { kind: "reveal", by: event.by, uid: event.uid, card } } : {};
    }
    case "search":
    case "shuffle":
      return {};
    default:
      return { error: "Unknown board change." };
  }
}

/* The name of a card the opponent can currently see (a face-up card, a graveyard or banished card, a revealed one). */
function publicCardName(sim, side, uid) {
  if (!sim || !uid) return null;
  const s = sim.players[side];
  if (s.revealed[uid]) return s.revealed[uid].name;
  for (const stack of s.field.concat(sim.shared)) {
    const entry = stack.find((c) => c.uid === uid);
    if (entry) return entry.card ? entry.card.name : null;
  }
  for (const pile of PUBLIC_PILES) {
    const entry = s[pile].find((c) => c.uid === uid);
    if (entry) return entry.card ? entry.card.name : null;
  }
  return null;
}

const ONLY_AFTER_OLD_BOARD = ["rematch", "rematch-accept", "rematch-decline", "reset"]; // all an old started duel can still do

function applyBoardEvent(sim, event) {
  let base = sim;
  if (isOldBoard(sim)) {
    // a duel saved with the earlier board: not started it simply starts again on the new board, started it can only be restarted
    if (!sim.started) base = { ...newSim(), nocards: Boolean(sim.nocards) };
    else if (!ONLY_AFTER_OLD_BOARD.includes(event.kind)) return refuseBoard(sim, "This duel used the old board and cannot continue.");
  }
  const next = copyOf(base || newSim());
  switch (event.kind) {
    case "start": {
      if (next.started) return refuseBoard(sim, "The duel already started.");
      if (!next.players[0].ready || !next.players[1].ready) return refuseBoard(sim, "Both players must choose a deck first.");
      next.started = true;
      next.rematch = null;
      next.players.forEach((side) => {
        const hand = Math.min(STARTING_HAND_SIZE, side.deckCount);
        side.handCount = hand;
        side.deckCount -= hand;
      });
      return { sim: next, ok: true };
    }
    case "nocards":
      if (next.started) return refuseBoard(sim, "The duel already started.");
      next.nocards = true; // both players play with the life point table only
      return { sim: next, ok: true };
    case "rematch":
      next.rematch = event.by;
      return { sim: next, ok: true };
    case "rematch-decline":
      next.rematch = null;
      return { sim: next, ok: true };
    case "rematch-accept":
      if (next.rematch === null || next.rematch === event.by) return refuseBoard(sim, "There is no rematch to accept.");
      return { sim: next, ok: true };
    case "reset": {
      const fresh = newSim();
      fresh.generation = next.generation + 1;
      fresh.players.forEach((side, i) => {
        side.deckName = next.players[i].deckName;
      });
      return { sim: fresh, ok: true };
    }
    default: {
      if (event.by !== 0 && event.by !== 1) return refuseBoard(sim, "Unknown player.");
      if (!next.started && event.kind !== "ready") return refuseBoard(sim, "The duel has not started yet.");
      const result = applyEventToSide(next, event);
      if (result.error) return refuseBoard(sim, result.error);
      return { sim: next, ok: true, inverse: result.inverse || null, note: result.note };
    }
  }
}
