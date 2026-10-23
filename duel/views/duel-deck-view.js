/*
 * Deck choice screen of the Duel Room: the player's Workshop decks, who is ready, and the way to play without cards.
 * DOM only, no state and no rules.
 *
 *   renderDeckChoice(rootEl, model, handlers)
 *   model    = { decks: [{ id, name, mainCount, extraCount, usable }], chosen, suggested, ready: [bool, bool], names: [string, string],
 *                you, error }
 *   handlers = { onChoose(deckId), onNoCards() }
 */
function renderDeckChoice(rootEl, model, handlers) {
  rootEl.innerHTML = "";
  const panel = el("section", "panel");
  panel.appendChild(el("h2", null, "Choose your deck"));
  panel.appendChild(el("p", "duel-explain", "Pick one of your Workshop decks. Your deck stays on your device: the other player only sees how many cards it has. When both of you are ready the decks are shuffled and each player draws the starting hand."));

  if (model.decks.length === 0) {
    panel.appendChild(el("p", "duel-status", "You have no decks yet. Build one in the Workshop (Deckbuilding), or play without cards."));
  } else {
    const list = el("ul", "duel-decks");
    model.decks.forEach((deck) => {
      const suggested = !model.chosen && deck.id === model.suggested; // the deck used before a rematch
      const li = el("li", "duel-deck" + (deck.id === model.chosen || suggested ? " duel-deck-chosen" : ""));
      const pick = el("button", "duel-deck-btn");
      pick.type = "button";
      pick.disabled = !deck.usable;
      pick.setAttribute("aria-pressed", String(deck.id === model.chosen));
      pick.appendChild(el("strong", null, deck.name));
      pick.appendChild(el("span", "duel-deck-counts", `${deck.mainCount} main · ${deck.extraCount} extra${deck.usable ? "" : " · no main cards: cannot be used"}${suggested ? " · your last deck" : ""}`));
      pick.addEventListener("click", () => handlers.onChoose(deck.id));
      li.appendChild(pick);
      list.appendChild(li);
    });
    panel.appendChild(list);
  }
  if (model.error) panel.appendChild(el("p", "duel-error", model.error));

  const ready = el("p", "duel-status");
  ready.setAttribute("aria-live", "polite");
  ready.textContent = model.names.map((name, i) => `${name}: ${model.ready[i] ? "ready" : "choosing a deck…"}${i === model.you ? " (you)" : ""}`).join(" · ");
  panel.appendChild(ready);
  panel.appendChild(button("Play without cards", handlers.onNoCards));
  rootEl.appendChild(panel);
}
