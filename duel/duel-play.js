/*
 * Duel Simulator behaviour: choosing a deck, starting, this device's private state and (later) moving cards.
 * The rules are in duel-cards.js / duel-private.js / duel-board.js / duel-table.js, the order of events in
 * duel-session.js, the drawing in views/. It reads the room's `room` object (duel-room.js) at call time.
 * Needs save-utils.js (loadData, saveData, removeData) and profiles.js (profileKey).
 */
const PRIVATE_KEY = "ygoDuelPrivate"; // where this device keeps its private part of the duel
const COLLECTION_KEY_BASE = "ygoCollection"; // the saved collection holding the Workshop decks (read only)

let play = {
  decks: [], // the player's Workshop decks, read when the room connects
  collection: null,
  built: null, // the duel deck built from the chosen Workshop deck
  chosenDeckId: null,
  priv: null, // this device's private state
  error: "",
};

/* ---- decks ---- */

function loadWorkshopDecks() {
  const blob = loadData(profileKey(COLLECTION_KEY_BASE)) || {};
  play.collection = { cards: Array.isArray(blob.cards) ? blob.cards : [], decks: Array.isArray(blob.decks) ? blob.decks : [] };
}

function countEntries(entries) {
  const cards = play.collection.cards;
  return (entries || []).reduce((sum, e) => sum + (cards.some((c) => c.id === e.cardId) ? e.quantity : 0), 0);
}

function deckOptions() {
  if (!play.collection) loadWorkshopDecks();
  return play.collection.decks.map((deck) => {
    const mainCount = countEntries(deck.main);
    return { id: deck.id, name: deck.name, mainCount, extraCount: countEntries(deck.extra), usable: mainCount > 0 };
  });
}

/* The model of the deck choice screen, or null when the duel is already on (cards started or chosen without). */
function deckChoiceModel() {
  const table = room.session ? room.session.getTable() : null;
  if (!table || (table.sim && (table.sim.started || table.sim.nocards))) return null;
  const sim = table.sim;
  return {
    decks: deckOptions(),
    chosen: play.chosenDeckId,
    ready: [Boolean(sim && sim.players[0].ready), Boolean(sim && sim.players[1].ready)],
    names: table.players.map((p) => p.name),
    you: room.role,
    error: play.error,
  };
}

function chooseDeck(deckId) {
  const built = buildDuelDeck(play.collection, deckId, room.role);
  if (!built.ok) {
    play.error = built.reason;
    drawRoom();
    return;
  }
  const table = room.session.getTable();
  play.error = "";
  play.built = built;
  play.chosenDeckId = deckId;
  play.priv = newPrivate(table.duelId, room.role, built);
  room.session.intent({ kind: "ready", deckName: built.name, mainCount: built.main.length, extraCount: built.extra.length });
}

function playWithoutCards() {
  room.session.intent({ kind: "nocards" });
}

/* ---- private state ---- */

function savePrivate() {
  if (!play.priv) return;
  saveData({ duelId: play.priv.duelId, side: room.role, deckId: play.chosenDeckId, priv: play.priv }, PRIVATE_KEY);
}

/* The saved private state of this device when it belongs to this duel, else null. */
function restorePrivate(table) {
  const saved = loadData(PRIVATE_KEY);
  if (!saved || !saved.priv || saved.duelId !== table.duelId || saved.side !== room.role) return null;
  return saved;
}

/* Called on both devices after any event is applied (see duel-session.js onApplied). */
function onDuelEvent(event, table) {
  const sim = table.sim;
  if (!sim) return;
  if (event.kind === "ready" && room.role === ROLE_CREATOR && !sim.started && sim.players[0].ready && sim.players[1].ready) {
    room.session.intent({ kind: "start" }); // both are ready: the creator starts the duel
    return;
  }
  if (event.kind === "start") {
    if (play.priv) play.priv = dealHand(play.priv);
    savePrivate();
    return;
  }
  if (event.kind === "reset") {
    // a rematch: the same deck again, reshuffled; each device announces it is ready
    if (play.built) {
      play.priv = newPrivate(table.duelId, room.role, play.built);
      room.session.intent({ kind: "ready", deckName: play.built.name, mainCount: play.built.main.length, extraCount: play.built.extra.length });
    }
    return;
  }
  if (event.by === room.role && play.priv && event.kind !== "ready") {
    play.priv = applyPrivate(play.priv, event).priv;
    savePrivate();
  }
}
