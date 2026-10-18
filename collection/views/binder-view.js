/*
 * Backlog binder view: the page controls and the facing pages. DOM only, no state and no rules here.
 *
 *   renderBinderView(containerEl, model, handlers)
 *   model    = { cards, offset, pagesPerView, focus: "previous" | "next" | null }
 *   handlers = { onPrevious(), onNext(), buildSlot(card) -> element }
 *
 * Needs binder-paging.js (pure rules). `focus` puts the keyboard focus back on a page button after a redraw.
 */
function buildBinderButton(className, text, label, disabled, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `btn btn-secondary ${className}`;
  btn.textContent = text;
  btn.setAttribute("aria-label", label);
  btn.disabled = disabled;
  btn.addEventListener("click", onClick);
  return btn;
}

function renderBinderView(containerEl, model, handlers) {
  const { cards, offset, pagesPerView } = model;
  const atFirst = offset === 0;
  const atLast = offset + binderViewSize(pagesPerView) >= cards.length;
  containerEl.innerHTML = "";

  const root = document.createElement("div");
  root.className = "binder";

  const bar = document.createElement("div");
  bar.className = "binder-controls";
  const previous = buildBinderButton("binder-previous", "◀", "Previous pages", atFirst, handlers.onPrevious);
  const label = document.createElement("span");
  label.className = "binder-position";
  label.setAttribute("aria-live", "polite");
  label.textContent = positionLabel(offset, cards.length, pagesPerView);
  const next = buildBinderButton("binder-next", "▶", "Next pages", atLast, handlers.onNext);
  bar.append(previous, label, next);
  root.appendChild(bar);

  const spread = document.createElement("div");
  spread.className = "binder-spread";
  slotsOfPage(cards, offset, pagesPerView).forEach((slots) => {
    const page = document.createElement("div");
    page.className = "binder-page";
    page.style.gridTemplateColumns = `repeat(${BINDER_COLUMNS}, 1fr)`;
    slots.forEach((card) => page.appendChild(card ? handlers.buildSlot(card) : buildEmptySlot()));
    spread.appendChild(page);
  });
  root.appendChild(spread);
  containerEl.appendChild(root);

  // Redrawing replaced the button that was focused: focus it again, or its neighbour when it is now disabled.
  if (model.focus) {
    const wanted = model.focus === "previous" ? previous : next;
    const other = wanted === previous ? next : previous;
    (wanted.disabled ? other : wanted).focus();
  }
}
