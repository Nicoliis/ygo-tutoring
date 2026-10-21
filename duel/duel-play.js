/*
 * Duel Simulator behaviour: choosing a deck, starting, this device's private state and (later) moving cards.
 * The rules are in duel-cards.js / duel-private.js / duel-board.js / duel-table.js, the order of events in
 * duel-session.js, the drawing in views/. It reads the room's `room` object (duel-room.js) at call time.
 * Needs save-utils.js (loadData, saveData, removeData) and profiles.js (profileKey).
 */
const PRIVATE_KEY_BASE = "ygoDuelPrivate"; // where this device keeps its private part of the duel (one key per side)
const privateKey = (side) => `${PRIVATE_KEY_BASE}_${side}`;
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
  saveData({ duelId: play.priv.duelId, side: room.role, deckId: play.chosenDeckId, priv: play.priv }, privateKey(room.role));
}

/* The saved private state of this device when it belongs to this duel, else null. */
function restorePrivate(table) {
  const saved = loadData(privateKey(room.role));
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
    drawRoom(); // the hand only exists now
    return;
  }
  if (event.kind === "rematch-accept" && room.role === ROLE_CREATOR) {
    room.session.intent({ kind: "reset" }); // both agreed: the creator starts the new duel
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
    drawRoom(); // the board was drawn before the private side followed the event
  }
}

/* ---- rematch ---- */

function rematchState() {
  const table = room.session ? room.session.getTable() : null;
  const sim = table && table.sim;
  if (!sim || !sim.started) return "none";
  if (sim.rematch === null) return "none";
  return sim.rematch === room.role ? "proposed-by-me" : "proposed-by-them";
}

function proposeRematch() {
  room.session.intent({ kind: "rematch" });
}

function acceptRematch() {
  room.session.intent({ kind: "rematch-accept" });
}

function declineRematch() {
  room.session.intent({ kind: "rematch-decline" });
}

/* ---- the board ---- */

play.selected = null; // the uid of the card whose menu is open
play.menu = null;
play.picking = null;

function boardModel() {
  const table = room.session ? room.session.getTable() : null;
  if (!table || !table.sim || !table.sim.started) return null;
  return {
    sim: table.sim,
    you: room.role,
    hand: play.priv ? play.priv.hand : [],
    cardOf: (uid) => (play.priv ? cardAt(play.priv, uid) : null),
    picking: play.picking,
    menu: play.menu,
    selected: play.selected,
  };
}

/* The details window during a duel: the card alone, nothing that could change the player's collection. */
function showCardDetails(card) {
  openCardDetailModal(card, undefined, "", null, false);
}

/* ---- moving cards: the card menu and the zone picker ---- */

const EXTRA_DECK_TYPES = ["Fusion", "Synchro", "Xyz", "Link"]; // cards that return to the extra deck, not the deck

function isExtraDeckCard(card) {
  return Boolean(card && card.type && EXTRA_DECK_TYPES.some((t) => card.type.includes(t)));
}

const ACTION_LABELS = {
  summon: "Normal summon", set: "Set face-down", special: "Special summon", place: "Place face-up (spell/trap/field)",
  move: "Move to another zone", position: "Change position", flipUp: "Flip face-up", flipDown: "Flip face-down",
  gy: "Send to graveyard", banish: "Banish", banishDown: "Banish face-down", hand: "Return to hand",
  deckTop: "Return to top of deck", deckBottom: "Return to bottom of deck", extra: "Return to extra deck",
  reveal: "Reveal to opponent", hide: "Hide again", details: "View card",
  draw: "Draw", shuffle: "Shuffle deck", search: "Search deck", lookTop: "Look at the top card",
};
const ZONES_FOR = {
  summon: [["monster"]], special: [["monster"]], set: [["monster", "spell"]], place: [["spell", "field", "pendulum"]], move: [["monster", "spell", "field", "pendulum"]],
};

function actionList(ids) {
  return ids.map((id) => ({ id, label: ACTION_LABELS[id] }));
}

/* The actions that make sense for a card of this player where it is now. */
function menuFor(place, uid) {
  const card = cardAt(play.priv, uid);
  const returns = isExtraDeckCard(card) ? ["extra"] : ["deckTop", "deckBottom"];
  if (place.zone === "hand") {
    const revealed = room.session.getTable().sim.players[room.role].revealed[uid];
    return actionList(["summon", "set", "special", "place", "gy", "banish", "banishDown", revealed ? "hide" : "reveal", "details"]);
  }
  if (place.zone === "gy") return actionList(["special", "hand", ...returns, "banish", "details"]);
  if (place.zone === "banished") return actionList(["special", "hand", ...returns, "gy", "details"]);
  if (place.zone === "extra") return actionList(["special", "details"]);
  const entry = fieldEntry(uid, place);
  const flip = entry && entry.faceUp ? "flipDown" : "flipUp";
  return actionList([...(place.zone === "monster" ? ["position"] : []), flip, "move", "gy", "banish", "banishDown", "hand", ...returns, "details"]);
}

/* The card's entry on this player's field (its face and position), or null. */
function fieldEntry(uid, place) {
  const sim = room.session.getTable().sim;
  const stack = sim.players[room.role].zones[place.zone] && sim.players[room.role].zones[place.zone][place.slot];
  return stack ? stack.find((c) => c.uid === uid) || null : null;
}

function closeDuelMenu() {
  play.selected = null;
  play.menu = null;
  play.picking = null;
  drawRoom();
}

function selectCard(uid, place) {
  if (!play.priv || !cardAt(play.priv, uid)) return;
  play.selected = uid;
  play.place = place;
  play.picking = null;
  play.menu = { title: cardAt(play.priv, uid).name, actions: menuFor(place, uid) };
  drawRoom();
}

function closeDuelModal() {
  const close = document.querySelector("#modalRoot .modal-actions button");
  if (close) close.click();
}

/* Starts an action on the selected card: either it needs a zone (picker) or it is sent at once. */
function chooseAction(id) {
  const uid = play.selected;
  if (!uid) return;
  if (id === "details") {
    showCardDetails(cardAt(play.priv, uid));
    return;
  }
  const kinds = ZONES_FOR[id];
  if (kinds) {
    const zones = [];
    kinds[0].forEach((kind) => {
      for (let slot = 0; slot < ZONE_SIZES[kind]; slot++) zones.push({ zone: kind, slot });
    });
    play.picking = { actionId: id, zones };
    play.menu = null;
    drawRoom();
    return;
  }
  performAction(id, uid, play.place, null);
  closeDuelMenu();
}

function pickZone(zone, slot) {
  if (!play.picking || !play.selected) return;
  performAction(play.picking.actionId, play.selected, play.place, { zone, slot });
  closeDuelMenu();
}

/* Builds the public event for an action and sends it; the private side follows when the event is confirmed. */
function performAction(id, uid, place, target) {
  const card = cardAt(play.priv, uid);
  const from = place.slot === undefined ? { zone: place.zone } : { zone: place.zone, slot: place.slot };
  const move = (to, faceUp, pos, withCard) => room.session.intent({ kind: "move", uid, from, to, faceUp, pos, ...(withCard ? { card } : {}) });
  const entry = fieldEntry(uid, place);
  switch (id) {
    case "summon":
    case "special":
      return move(target, true, "atk", true);
    case "set":
      return move(target, false, target.zone === "monster" ? "def" : "atk", false);
    case "place":
      return move(target, true, "atk", true);
    case "move":
      return move(target, entry ? entry.faceUp : true, entry ? entry.pos : "atk", Boolean(entry && entry.faceUp));
    case "gy":
      return move({ zone: "gy" }, true, "atk", true);
    case "banish":
      return move({ zone: "banished" }, true, "atk", true);
    case "banishDown":
      return move({ zone: "banished" }, false, "atk", false);
    case "hand":
      return move({ zone: "hand" }, false, "atk", false);
    case "deckTop":
      return move({ zone: "deck", end: "top" }, false, "atk", false);
    case "deckBottom":
      return move({ zone: "deck", end: "bottom" }, false, "atk", false);
    case "extra":
      return move({ zone: "extra" }, false, "atk", false);
    case "position":
      return room.session.intent({ kind: "position", uid, zone: place.zone, slot: place.slot, pos: entry && entry.pos === "atk" ? "def" : "atk" });
    case "flipUp":
      return room.session.intent({ kind: "flip", uid, zone: place.zone, slot: place.slot, faceUp: true, card });
    case "flipDown":
      return room.session.intent({ kind: "flip", uid, zone: place.zone, slot: place.slot, faceUp: false });
    case "reveal":
      return room.session.intent({ kind: "reveal", uid, card });
    case "hide":
      return room.session.intent({ kind: "hide", uid });
    default:
      return null;
  }
}

/* ---- the deck pile and the piles' lists ---- */

function openDeckMenu() {
  if (!play.priv) return;
  play.selected = null;
  play.picking = null;
  play.menu = { title: `Deck (${play.priv.deck.length})`, actions: actionList(["draw", "shuffle", "search", "lookTop"]) };
  drawRoom();
}

function deckAction(id) {
  if (id === "draw") room.session.intent({ kind: "draw" });
  else if (id === "shuffle") room.session.intent({ kind: "shuffle" });
  else if (id === "lookTop") {
    const top = play.priv.deck[0];
    if (top) showCardDetails(cardAt(play.priv, top));
    else setRoom({ error: "Your deck is empty." });
  } else if (id === "search") openDeckSearch();
}

/* Looking through the deck is private; taking a card to the hand logs "searched the deck", moves the card, then shuffles. */
function openDeckSearch() {
  const items = play.priv.deck.map((uid) => ({ uid, card: cardAt(play.priv, uid), actions: [{ id: "take", label: "Add to hand" }] }));
  showModal({ title: "Search your deck", bodyHtml: '<div id="duelPileList"></div>', buttons: [{ label: "Close", primary: true }] });
  renderPileList(document.getElementById("duelPileList"), items, {
    onDetails: showCardDetails,
    onAction: (_id, uid) => {
      closeDuelModal();
      room.session.intent({ kind: "search" });
      room.session.intent({ kind: "move", uid, from: { zone: "deck" }, to: { zone: "hand" }, faceUp: false });
      room.session.intent({ kind: "shuffle" });
    },
  });
}

function pileItems(sideIndex, pile) {
  const table = room.session.getTable();
  const side = table.sim.players[sideIndex];
  const own = sideIndex === room.role && play.priv;
  if (pile === "gy" || pile === "banished") {
    return side[pile].map((e) => ({
      uid: e.uid,
      card: e.card || (own ? cardAt(play.priv, e.uid) : null),
      actions: own ? menuFor({ zone: pile }, e.uid).filter((a) => a.id !== "details") : [],
    }));
  }
  if (!own) return [];
  return play.priv.extra.map((uid) => ({ uid, card: cardAt(play.priv, uid), actions: menuFor({ zone: "extra" }, uid).filter((a) => a.id !== "details") }));
}

function openPile(sideIndex, pile) {
  if (pile === "deck") {
    if (sideIndex === room.role) openDeckMenu();
    return;
  }
  if (pile === "extra" && sideIndex !== room.role) return; // only the count is known
  const titles = { gy: "Graveyard", banished: "Banished", extra: "Extra deck" };
  showModal({ title: `${sideIndex === room.role ? "Your" : "Opponent's"} ${titles[pile]}`, bodyHtml: '<div id="duelPileList"></div>', buttons: [{ label: "Close", primary: true }] });
  renderPileList(document.getElementById("duelPileList"), pileItems(sideIndex, pile), {
    onDetails: showCardDetails,
    onAction: (id, uid) => {
      closeDuelModal();
      play.selected = uid;
      play.place = { zone: pile };
      chooseAction(id);
    },
  });
}

function boardHandlers() {
  return {
    onSelectCard: selectCard,
    onAction: (id) => (play.selected === null ? deckAction(id) : chooseAction(id)),
    onPickZone: pickZone,
    onOpenPile: openPile,
    onDetails: showCardDetails,
    onFaceDown: () => showModal({ title: "Face-down card", bodyHtml: "<p>A face-down card: nothing is known about it until its owner flips or reveals it.</p>", buttons: [{ label: "Close", primary: true }] }),
    onCancel: closeDuelMenu,
  };
}
