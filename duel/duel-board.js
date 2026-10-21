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
const MONSTER_ZONES = 5;
const SPELL_ZONES = 5;
const FIELD_ZONES = 1;
const PENDULUM_ZONES = 2;
const ZONE_SIZES = { monster: MONSTER_ZONES, spell: SPELL_ZONES, field: FIELD_ZONES, pendulum: PENDULUM_ZONES };
const ZONE_KINDS = Object.keys(ZONE_SIZES); // zones whose slots hold stacks of cards
const COUNT_PILES = ["hand", "deck", "extra"]; // places known only by how many cards they hold
const PUBLIC_PILES = ["gy", "banished"]; // places whose cards are listed
const DEFAULT_POSITION = "atk";
const STARTING_HAND_SIZE = 5; // cards drawn when the duel starts (the same value as duel-cards.js STARTING_HAND)

function emptySide() {
  const zones = {};
  ZONE_KINDS.forEach((kind) => {
    zones[kind] = Array.from({ length: ZONE_SIZES[kind] }, () => []);
  });
  return { deckName: "", ready: false, handCount: 0, deckCount: 0, extraCount: 0, zones, gy: [], banished: [], revealed: {} };
}

function newSim() {
  return { started: false, nocards: false, generation: 0, rematch: null, players: [emptySide(), emptySide()] };
}

const copyOf = (value) => JSON.parse(JSON.stringify(value));
const refuseBoard = (sim, reason) => ({ sim, ok: false, reason });
const countKey = (zone) => `${zone}Count`;
const isZone = (zone) => ZONE_KINDS.includes(zone);

function stackOf(side, place) {
  if (!isZone(place.zone) || !Number.isInteger(place.slot)) return null;
  return side.zones[place.zone][place.slot] || null;
}

/* Takes the card out of where it was; returns what it was (so it can go back) or an error. */
function takeCard(side, from, uid) {
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
  const stack = stackOf(side, from);
  if (!stack) return { error: "That zone does not exist." };
  const index = stack.findIndex((c) => c.uid === uid);
  if (index === -1) return { error: "That card is not there any more." };
  const [entry] = stack.splice(index, 1);
  return { place: { zone: from.zone, slot: from.slot, index }, entry };
}

/* Puts the card in its new place; returns an error text or null. `index` (used by Undo) restores a position. */
function putCard(side, to, uid, shown) {
  const { faceUp, pos, card } = shown;
  if (COUNT_PILES.includes(to.zone)) {
    side[countKey(to.zone)] += 1;
    return null;
  }
  if (to.zone === "gy") {
    if (!card) return "A card sent to the graveyard needs its card data.";
    insertAt(side.gy, { uid, card }, to.index);
    return null;
  }
  if (to.zone === "banished") {
    if (faceUp && !card) return "A face-up banished card needs its card data.";
    insertAt(side.banished, { uid, card: faceUp ? card : null }, to.index);
    return null;
  }
  const stack = stackOf(side, to);
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
  const taken = takeCard(side, event.from || {}, event.uid);
  if (taken.error) return { error: taken.error };
  const before = visibleBefore(taken);
  // the card data that is already public stays available for the new place (face-up cards keep their data)
  const card = event.card || before.card;
  const shown = { faceUp: event.faceUp, pos: event.pos, card };
  const problem = putCard(side, event.to || {}, event.uid, shown);
  if (problem) return { error: problem };
  // where the card is now, so Undo can take it from there and put it back where it was
  const nowAt = { ...(event.to || {}) };
  if (isZone(nowAt.zone) || PUBLIC_PILES.includes(nowAt.zone)) delete nowAt.index;
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
      const stack = stackOf(side, event);
      const entry = stack && stack.find((c) => c.uid === event.uid);
      if (!entry) return { error: "That card is not there any more." };
      const previous = { faceUp: entry.faceUp, card: entry.card };
      const card = event.faceUp ? event.card || entry.card : null;
      if (event.faceUp && !card) return { error: "A face-up card needs its card data." };
      entry.faceUp = Boolean(event.faceUp);
      entry.card = card;
      return { inverse: { kind: "flip", by: event.by, uid: event.uid, zone: event.zone, slot: event.slot, faceUp: previous.faceUp, ...(previous.card ? { card: previous.card } : {}) } };
    }
    case "position": {
      const stack = stackOf(side, event);
      const entry = stack && stack.find((c) => c.uid === event.uid);
      if (!entry) return { error: "That card is not there any more." };
      const previous = entry.pos;
      entry.pos = event.pos === "def" ? "def" : DEFAULT_POSITION;
      return { inverse: { kind: "position", by: event.by, uid: event.uid, zone: event.zone, slot: event.slot, pos: previous } };
    }
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
  for (const kind of ZONE_KINDS) {
    for (const stack of s.zones[kind]) {
      const entry = stack.find((c) => c.uid === uid);
      if (entry) return entry.card ? entry.card.name : null;
    }
  }
  for (const pile of PUBLIC_PILES) {
    const entry = s[pile].find((c) => c.uid === uid);
    if (entry) return entry.card ? entry.card.name : null;
  }
  return null;
}

function applyBoardEvent(sim, event) {
  const next = copyOf(sim || newSim());
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
