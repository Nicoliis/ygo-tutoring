/*
 * What the card details window may do with a draft card (see shared/card-engines.js): a card the user has picked can
 * be saved to the backlog early, by putting it in an engine; the final merge then skips it. A card not picked yet
 * cannot go into an engine (unless the user already owns it).
 */
function draftContextFor(card) {
  if (!session.keptCards.includes(card)) return { canSave: false };
  return {
    canSave: true,
    availableCopies: () => (card.savedEarly ? 0 : 1),
    saveEarly() {
      if (card.savedEarly) return true;
      if (!mergeCardsIntoBacklog([card])) return false;
      card.savedEarly = true;
      return true;
    },
  };
}

/* The shared pack reveal asks for this when a card of the face-down booster is opened: nothing there is picked yet. */
function pullContextFor() {
  return { canSave: false };
}

function handlePick(card) {
  session.keptCards.push(card);
  session.pickQueue.shift();
  if (session.pickQueue.length === 0) {
    session.status = "finished";
  }
  renderAll();
}
