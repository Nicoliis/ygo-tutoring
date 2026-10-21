/*
 * This device's private part of a duel: which of the player's own cards are in the hand, the deck (in order) and the
 * extra deck. It is never sent to the other player. Pure: no DOM, no network, no storage (the caller saves it).
 *
 *   priv = { duelId, side, deckName, cards: { uid: snapshot }, hand: [uid], deck: [uid] (top first), extra: [uid], undo }
 *   newPrivate(duelId, side, builtDeck, random)   shuffled deck, empty hand (dealHand draws the starting hand)
 *   applyPrivate(priv, event, random)             the owner's side of an event the table confirmed
 *
 * Needs duel-cards.js (shuffled, STARTING_HAND). The public side of the same events is in duel-board.js.
 */
function newPrivate(duelId, side, builtDeck, random = Math.random) {
  const cards = {};
  builtDeck.main.concat(builtDeck.extra).forEach((instance) => {
    cards[instance.uid] = instance.card;
  });
  return {
    duelId,
    side,
    deckName: builtDeck.name,
    cards,
    hand: [],
    deck: shuffled(builtDeck.main.map((i) => i.uid), random),
    extra: builtDeck.extra.map((i) => i.uid),
    undo: null,
  };
}

/* Draws the starting hand (fewer when the deck is smaller). */
function dealHand(priv, count = STARTING_HAND) {
  const taken = priv.deck.slice(0, count);
  return { ...priv, deck: priv.deck.slice(taken.length), hand: priv.hand.concat(taken), undo: null };
}

function cardAt(priv, uid) {
  return priv.cards[uid] || null;
}

function without(list, uid) {
  const index = list.indexOf(uid);
  return index === -1 ? null : list.filter((u) => u !== uid);
}

/* Removes the uid from the private pile named by `zone`; null when it is not there (or the zone is public). */
function takePrivate(priv, zone, uid) {
  if (zone !== "hand" && zone !== "deck" && zone !== "extra") return { ok: true, priv };
  const rest = without(priv[zone], uid);
  if (rest === null) return { ok: false };
  return { ok: true, priv: { ...priv, [zone]: rest } };
}

function putPrivate(priv, place, uid) {
  if (place.zone === "hand") return { ...priv, hand: priv.hand.concat(uid) };
  if (place.zone === "extra") return { ...priv, extra: priv.extra.concat(uid) };
  if (place.zone === "deck") return { ...priv, deck: place.end === "bottom" ? priv.deck.concat(uid) : [uid].concat(priv.deck) };
  return priv;
}

const UNDOABLE = ["draw", "move", "flip", "position", "reveal", "hide"]; // events that have an inverse on the public board

function applyPrivate(priv, event, random = Math.random) {
  const snapshot = { hand: priv.hand, deck: priv.deck, extra: priv.extra };
  let next = priv;
  switch (event.kind) {
    case "draw": {
      if (priv.deck.length === 0) break;
      next = { ...priv, deck: priv.deck.slice(1), hand: priv.hand.concat(priv.deck[0]) };
      break;
    }
    case "move": {
      const taken = takePrivate(priv, event.from.zone, event.uid);
      if (!taken.ok) return { priv, ok: false, reason: "That card is not where it should be." };
      next = putPrivate(taken.priv, event.to, event.uid);
      break;
    }
    case "shuffle":
      next = { ...priv, deck: shuffled(priv.deck, random) };
      return { priv: { ...next, undo: null }, ok: true };
    case "undo": {
      if (!priv.undo) return { priv, ok: true };
      return { priv: { ...priv, ...priv.undo.before, undo: null }, ok: true };
    }
    default:
      break;
  }
  return { priv: { ...next, undo: UNDOABLE.includes(event.kind) ? { before: snapshot } : null }, ok: true };
}
