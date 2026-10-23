/*
 * The card menu of the duel as data: what each fan offers and what a chosen path means. Pure: no DOM, no state.
 *
 *   menuFor(context)      -> the first-level nodes for a card; context = { place, isExtraDeckCard }
 *   deckMenu()            -> the nodes of the deck pile's fan
 *   resolvePath(nodes, ids) -> { node, action } | null      (action is null while the path still has children)
 *   playEvent(...)        -> the events that play a card face-up/down, straight/sideways in a zone
 *
 * node   = { id, label, children?, action?, needsZone? }
 * action = { kind: "play", faceUp, pos } | { kind: "move", to, faceUp?, end?, shuffle? } | { kind: "give" } |
 *          { kind: "signal", signal } | { kind: "reveal" } | { kind: "hide" } | { kind: "details" } |
 *          { kind: "draw" | "mill" | "search" | "lookTop" | "shuffle" }
 * Straight is the attack position ("atk"), sideways the defense position ("def").
 */
const EXTRA_DECK_TYPES = ["Fusion", "Synchro", "Xyz", "Link"]; // cards that return to the extra deck, not the deck

function isExtraDeckCard(card) {
  return Boolean(card && card.type && EXTRA_DECK_TYPES.some((t) => card.type.includes(t)));
}

const leaf = (id, label, action, extra = {}) => ({ id, label, action, ...extra });
const FIELD_ZONES_OF_MENU = ["field", "shared"]; // places where a card is on the board

const orientations = (faceUp) => [
  leaf("straight", "Straight", { kind: "play", faceUp, pos: "atk" }, { needsZone: true }),
  leaf("sideways", "Sideways", { kind: "play", faceUp, pos: "def" }, { needsZone: true }),
];

function menuFor(context) {
  const zone = context.place.zone;
  const onBoard = FIELD_ZONES_OF_MENU.includes(zone);
  const moveTo = [
    leaf("grave", "Graveyard", { kind: "move", to: "gy" }),
    {
      id: "banish", label: "Banish", children: [
        leaf("banish-up", "Face up", { kind: "move", to: "banished", faceUp: true }),
        leaf("banish-down", "Face down", { kind: "move", to: "banished", faceUp: false }),
      ],
    },
    leaf("hand", "Hand", { kind: "move", to: "hand" }),
    {
      id: "deck", label: "Deck", children: [
        leaf("deck-top", "On top", { kind: "move", to: "deck", end: "top" }),
        leaf("deck-bottom", "On bottom", { kind: "move", to: "deck", end: "bottom" }),
        leaf("deck-shuffle", "Shuffle", { kind: "move", to: "deck", end: "top", shuffle: true }),
      ],
    },
  ];
  if (context.isExtraDeckCard) moveTo.push(leaf("extra", "Extra deck", { kind: "move", to: "extra" }));
  if (onBoard) moveTo.push(leaf("give", "Give control", { kind: "give" }, { needsZone: true }));
  if (zone === "hand") {
    moveTo.splice(moveTo.findIndex((n) => n.id === "hand"), 1); // it is in the hand already
  }
  const signal = ["activate", "target", "attack"].map((s) => leaf(s, { activate: "Activate", target: "Target", attack: "Attacks" }[s], { kind: "signal", signal: s }));
  const signals = zone === "hand" ? [context.revealed ? leaf("hide", "Hide", { kind: "hide" }) : leaf("reveal", "Reveal", { kind: "reveal" })] : signal;
  return [
    { id: "play", label: "Play", children: [
      { id: "face-up", label: "Face up", children: orientations(true) },
      { id: "face-down", label: "Face down", children: orientations(false) },
    ] },
    { id: "move", label: "Move to", children: moveTo },
    { id: "signal", label: "Signal", children: signals },
    leaf("details", "Details", { kind: "details" }), // the card details window, as in the earlier menu
  ];
}

function deckMenu() {
  return [
    leaf("draw", "Draw", { kind: "draw" }),
    leaf("mill", "Mill", { kind: "mill" }),
    leaf("search", "Search", { kind: "search" }),
    leaf("look", "Look at top", { kind: "lookTop" }),
    leaf("shuffle", "Shuffle", { kind: "shuffle" }),
  ];
}

/* Follows `ids` (node ids, one per level) down the tree. */
function resolvePath(nodes, ids) {
  let level = nodes;
  let node = null;
  for (const id of ids) {
    node = (level || []).find((n) => n.id === id) || null;
    if (!node) return null;
    level = node.children;
  }
  return node ? { node, action: node.action || null } : null;
}

/*
 * The events that carry out Play for a card. `from` is where it is now ({ zone, slot? }), `to` the chosen zone
 * ({ zone: "field"|"shared", slot }). `entry` is the card's stack entry when it is already on the board, else null.
 * A card from the hand or a pile is one move; a card on the board is turned or flipped where it is when the zone is
 * the same (a flip, a position change, or both), and moved when the zone changes.
 */
function playEvent({ uid, from, to, faceUp, pos, entry, card }) {
  const sameZone = entry && from.zone === to.zone && from.slot === to.slot;
  if (!sameZone) {
    return [{ kind: "move", uid, from, to, faceUp, pos, ...(faceUp && card ? { card } : {}) }];
  }
  const events = [];
  if (Boolean(entry.faceUp) !== Boolean(faceUp)) events.push({ kind: "flip", uid, zone: to.zone, slot: to.slot, faceUp, ...(faceUp ? { card } : {}) });
  if (entry.pos !== pos) events.push({ kind: "position", uid, zone: to.zone, slot: to.slot, pos });
  return events;
}
