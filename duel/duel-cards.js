/*
 * Cards of a duel: building a duel deck from a saved Workshop deck, the card data that travels with a visible card,
 * and shuffling. Pure: no DOM, no network, no storage (the caller reads the collection).
 *
 *   buildDuelDeck(collection, deckId, side) -> { ok, name, main: [instance], extra: [instance] } | { ok: false, reason }
 *   instance = { uid: "<side>-<n>", card: snapshot }
 *
 * Needs nothing else; duel-private.js and duel-board.js use these shapes.
 */
const STARTING_HAND = 5; // cards each player draws when the duel starts
const SNAPSHOT_FIELDS = [
  "apiId", "name", "type", "humanReadableCardType", "frameType", "race", "attribute", "archetype", "level", "scale",
  "linkval", "linkmarkers", "atk", "def", "pendDesc", "monsterDesc", "imageSmall", "imageFull",
];

/* The data the details window needs for a card, and nothing of the player's collection (quantities, printings...). */
function snapshotOf(card) {
  const snapshot = {};
  SNAPSHOT_FIELDS.forEach((field) => {
    if (card[field] !== undefined && card[field] !== null) snapshot[field] = card[field];
  });
  const text = card.desc || card.effect;
  if (text) snapshot.desc = text;
  return snapshot;
}

/* Every copy of every entry becomes its own instance, numbered from `next`. */
function instancesOf(collection, entries, side, counter) {
  const cards = Array.isArray(collection.cards) ? collection.cards : [];
  const list = [];
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const card = cards.find((c) => c.id === entry.cardId);
    if (!card) return; // a card removed from the collection after the deck was made
    for (let i = 0; i < entry.quantity; i++) list.push({ uid: `${side}-${counter.next++}`, card: snapshotOf(card) });
  });
  return list;
}

function buildDuelDeck(collection, deckId, side) {
  const decks = Array.isArray(collection.decks) ? collection.decks : [];
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return { ok: false, reason: "That deck was not found." };
  const counter = { next: 0 };
  const main = instancesOf(collection, deck.main, side, counter);
  const extra = instancesOf(collection, deck.extra, side, counter);
  if (main.length === 0) return { ok: false, reason: "That deck has no cards in its main deck." };
  return { ok: true, name: deck.name, main, extra };
}

/* A new list in random order (Fisher-Yates); `random` is injected so tests are deterministic. */
function shuffled(list, random = Math.random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
