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
  } else if (play.priv && isForeignMoveOfMine(play.priv, event)) {
    play.priv = { ...applyPrivate(play.priv, event).priv, undo: null }; // the other player sent one of my cards back to my hand, deck or extra deck
    savePrivate();
    drawRoom();
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

play.selected = null; // the uid of the card whose fan is open
play.place = null; // where that card is
play.fan = null; // { anchor, nodes, path: [node ids] } while a fan menu is open
play.picking = null; // { slots, action } while the player chooses a zone

function boardModel() {
  const table = room.session ? room.session.getTable() : null;
  if (!table || !table.sim || !table.sim.started) return null;
  return {
    sim: table.sim,
    you: room.role,
    hand: play.priv ? play.priv.hand : [],
    cardOf: (uid) => (play.priv ? cardAt(play.priv, uid) : null),
    picking: play.picking,
    selected: play.selected,
    fan: fanModel(),
  };
}

/* The details window during a duel: the card alone, nothing that could change the player's collection. */
function showCardDetails(card) {
  openCardDetailModal(card, undefined, "", null, false);
}

/* ---- the fan menu ---- */

/* The levels of the open fan: the nodes of each level and the button chosen in it. */
function fanModel() {
  if (play.fan && play.selected && !selectedCardStillThere()) play.fan = null; // the card moved while the menu was open
  if (!play.fan) return null;
  const levels = [];
  let nodes = play.fan.nodes;
  for (const id of play.fan.path) {
    levels.push({ nodes, chosenId: id });
    const chosen = nodes.find((n) => n.id === id);
    nodes = chosen && chosen.children;
    if (!nodes) break;
  }
  if (nodes) levels.push({ nodes, chosenId: null });
  return { anchor: play.fan.anchor, levels };
}

/* Whether the card of the open fan is still where the fan was opened (the other player's event may have moved it). */
function selectedCardStillThere() {
  const { selected: uid, place } = play;
  if (place.zone === "hand") return play.priv.hand.includes(uid);
  if (place.zone === "extra") return play.priv.extra.includes(uid);
  if (place.zone === "gy" || place.zone === "banished") return room.session.getTable().sim.players[room.role][place.zone].some((c) => c.uid === uid);
  return Boolean(fieldEntry(uid, place));
}

function closeDuelMenu() {
  const uid = play.selected;
  play.selected = null;
  play.place = null;
  play.fan = null;
  play.picking = null;
  drawRoom();
  const card = uid && document.querySelector(`.duel-card[data-uid="${uid}"]`);
  if (card) card.focus(); // keyboard users land back on the card
}

function closeDuelModal() {
  const close = document.querySelector("#modalRoot .modal-actions button");
  if (close) close.click();
}

/* Opens the fan of one of this player's cards. */
function selectCard(uid, place, anchor) {
  if (!play.priv) return;
  const entry = fieldEntry(uid, place);
  if (!cardAt(play.priv, uid) && !entry) return; // neither this player's card nor one on the board they control
  play.selected = uid;
  play.place = place;
  play.picking = null;
  const revealed = Boolean(room.session.getTable().sim.players[room.role].revealed[uid]);
  play.fan = { anchor, nodes: menuFor({ place, revealed, isExtraDeckCard: isExtraDeckCard(knownCard(uid, entry)), faceUp: entry ? entry.faceUp : undefined }), path: [] };
  drawRoom();
}

/* The data of a card this player may see: their own card, or a face-up card on the board. */
function knownCard(uid, entry) {
  return cardAt(play.priv, uid) || (entry && entry.card) || null;
}

/* A button of the fan was chosen: open the next level, ask for a zone, or carry the action out. */
function chooseFanNode(levelIndex, id) {
  if (!play.fan) return;
  play.fan.path = play.fan.path.slice(0, levelIndex).concat(id);
  const resolved = resolvePath(play.fan.nodes, play.fan.path);
  if (!resolved) return;
  if (resolved.node.children) {
    drawRoom();
    return;
  }
  if (resolved.action.kind !== "details") closeDuelModal(); // a card chosen from a pile's list: the list is done with
  if (resolved.node.needsZone) {
    startPicking(resolved.action);
    return;
  }
  const { selected, place } = play;
  if (selected === null) deckAction(resolved.action);
  else performAction(resolved.action, selected, place, null);
  closeDuelMenu();
}

/* The zones a card can be put in: the player's own 11 playable zones and the shared ones (to give control: the other player's 11). */
function startPicking(action) {
  const slots = [];
  const side = action.kind === "give" ? 1 - room.role : room.role;
  for (let slot = 0; slot < FIELD_SLOTS; slot++) slots.push({ zone: "field", slot, side });
  if (action.kind !== "give") for (let slot = 0; slot < SHARED_SLOTS; slot++) slots.push({ zone: "shared", slot });
  play.picking = { slots, action };
  play.fan = null;
  drawRoom();
}

function pickZone(zone, slot, side) {
  if (!play.picking || !play.selected) return;
  performAction(play.picking.action, play.selected, play.place, { zone, slot, side });
  closeDuelMenu();
}

/* The card's entry on the board (its face and position), or null when it is not on the board. */
function fieldEntry(uid, place) {
  if (place.zone !== "field" && place.zone !== "shared") return null;
  const sim = room.session.getTable().sim;
  const stack = place.zone === "shared" ? sim.shared[place.slot] : sim.players[room.role].field[place.slot];
  return stack ? stack.find((c) => c.uid === uid) || null : null;
}

/* Builds the public events for an action and sends them; the private side follows when each is confirmed. */
function performAction(action, uid, place, target) {
  const entry = fieldEntry(uid, place);
  const card = knownCard(uid, entry) || undefined;
  const from = place.slot === undefined ? { zone: place.zone } : { zone: place.zone, slot: place.slot };
  const send = (event) => room.session.intent(event);
  switch (action.kind) {
    case "details":
      showCardDetails(card);
      return;
    case "play":
      playEvent({ uid, from, to: target, faceUp: action.faceUp, pos: action.pos, entry, card }).forEach(send);
      return;
    case "move": {
      const faceUp = action.to === "gy" || (action.to === "banished" && action.faceUp);
      const to = action.end ? { zone: action.to, end: action.end } : { zone: action.to };
      send({ kind: "move", uid, from, to, faceUp, pos: "atk", ...(faceUp ? { card } : {}) });
      if (action.shuffle) send({ kind: "shuffle" });
      return;
    }
    case "give":
      send({ kind: "give", uid, from, to: { zone: "field", slot: target.slot, side: target.side }, ...(card ? { card } : {}) });
      return;
    case "reveal":
      send({ kind: "reveal", uid, card });
      return;
    case "hide":
      send({ kind: "hide", uid });
      return;
    default:
      return;
  }
}

/* ---- the deck pile and the piles' lists ---- */

function openDeckMenu(anchor) {
  if (!play.priv) return;
  play.selected = null;
  play.place = null;
  play.picking = null;
  play.fan = { anchor, nodes: deckMenu(), path: [] };
  drawRoom();
}

function deckAction(action) {
  if (action.kind === "draw") room.session.intent({ kind: "draw" });
  else if (action.kind === "shuffle") room.session.intent({ kind: "shuffle" });
  else if (action.kind === "mill") {
    const top = play.priv.deck[0]; // the top card goes to the graveyard, face-up
    if (top) room.session.intent({ kind: "move", uid: top, from: { zone: "deck" }, to: { zone: "gy" }, faceUp: true, pos: "atk", card: cardAt(play.priv, top) });
    else setRoom({ error: "Your deck is empty." });
  }
  else if (action.kind === "lookTop") {
    const top = play.priv.deck[0];
    if (top) showCardDetails(cardAt(play.priv, top));
    else setRoom({ error: "Your deck is empty." });
  } else if (action.kind === "search") openDeckSearch();
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

const PILE_MENU_ACTION = [{ id: "menu", label: "Actions" }]; // a card in a pile list opens the same fan as any card

function pileItems(sideIndex, pile) {
  const table = room.session.getTable();
  const side = table.sim.players[sideIndex];
  const own = sideIndex === room.role && play.priv;
  if (pile === "gy" || pile === "banished") {
    return side[pile].map((e) => ({
      uid: e.uid,
      card: e.card || (own ? cardAt(play.priv, e.uid) : null),
      actions: own ? PILE_MENU_ACTION : [],
    }));
  }
  if (!own) return [];
  return play.priv.extra.map((uid) => ({ uid, card: cardAt(play.priv, uid), actions: PILE_MENU_ACTION }));
}

function openPile(sideIndex, pile, anchor) {
  if (pile === "deck") {
    if (sideIndex === room.role) openDeckMenu(anchor);
    return;
  }
  if (pile === "extra" && sideIndex !== room.role) return; // only the count is known
  const titles = { gy: "Graveyard", banished: "Banished", extra: "Extra deck" };
  showModal({ title: `${sideIndex === room.role ? "Your" : "Opponent's"} ${titles[pile]}`, bodyHtml: '<div id="duelPileList"></div>', buttons: [{ label: "Close", primary: true }] });
  renderPileList(document.getElementById("duelPileList"), pileItems(sideIndex, pile), {
    onDetails: showCardDetails,
    onAction: (_id, uid, itemAnchor) => selectCard(uid, { zone: pile }, itemAnchor),
  });
}

function boardHandlers() {
  return {
    onSelectCard: selectCard,
    onPickZone: pickZone,
    onOpenPile: openPile,
    onDetails: showCardDetails,
    onFaceDown: () => showModal({ title: "Face-down card", bodyHtml: "<p>A face-down card: nothing is known about it until its owner flips or reveals it.</p>", buttons: [{ label: "Close", primary: true }] }),
    onCancel: closeDuelMenu,
    fan: { onChoose: chooseFanNode, onClose: closeDuelMenu },
  };
}
