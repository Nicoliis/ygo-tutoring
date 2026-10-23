/*
 * A list of cards in a pile (graveyard, banished zone, extra deck, a search of the deck), shown in a window.
 * DOM only, no state and no rules.
 *
 *   renderPileList(containerEl, items, handlers)
 *   items    = [{ uid, card | null, menu?: true, note?: string, actions?: [{ id, label }] }]  (card null: a face-down card of the viewer's opponent)
 *   handlers = { onDetails(card), onMenu(uid, anchor), onAction(actionId, uid) }
 * A card with `menu` opens the same fan menu as any of the player's cards when it is clicked (`anchor` is where the
 * fan opens); the others show their details. Pointing at a card shows it in the card display. Needs
 * duel-card-view.js (showInCardDisplay).
 */
function renderPileList(containerEl, items, handlers) {
  containerEl.innerHTML = "";
  if (items.length === 0) {
    containerEl.appendChild(el("p", "duel-explain", "There are no cards here."));
    return;
  }
  const list = el("ul", "duel-pile-list");
  items.forEach((item) => {
    const li = el("li", "duel-pile-item");
    const open = el("button", "duel-card duel-pile-card");
    open.type = "button";
    open.appendChild(cardFace(item.card, !item.card));
    open.setAttribute("aria-label", item.card ? `${item.card.name} — ${item.menu ? "choose what to do" : "view details"}` : "Face-down card");
    open.title = item.card ? item.card.name : "Face-down card";
    if (item.card) open.addEventListener("mouseenter", () => showInCardDisplay(item.card));
    open.addEventListener("click", () => {
      if (item.menu) handlers.onMenu(item.uid, anchorOf(open));
      else if (item.card) handlers.onDetails(item.card);
    });
    li.appendChild(open);
    li.appendChild(el("span", "duel-pile-name", item.card ? item.card.name : "Face-down card"));
    if (item.note) li.appendChild(el("span", "duel-pile-note", item.note));
    (item.actions || []).forEach((action) => li.appendChild(button(action.label, () => handlers.onAction(action.id, item.uid))));
    list.appendChild(li);
  });
  containerEl.appendChild(list);
}
