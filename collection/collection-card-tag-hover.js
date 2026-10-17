/*
 * Places a floating card overlay next to an anchor rectangle without ever leaving the viewport:
 * it goes below the anchor when there is room (above otherwise) and is kept inside the screen.
 * Overlays are position:fixed, so the scrolling backlog list can never clip them or grow a scrollbar.
 */
function positionFloating(overlayEl, anchorRect, preferBelow) {
  const margin = 8;
  const width = overlayEl.offsetWidth;
  const height = overlayEl.offsetHeight;
  const left = Math.min(Math.max(margin, anchorRect.left), Math.max(margin, window.innerWidth - width - margin));
  let top;
  if (preferBelow) {
    top = anchorRect.bottom + 4;
    if (top + height > window.innerHeight - margin) top = anchorRect.top - height - 4;
  } else {
    top = anchorRect.top;
  }
  top = Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin));
  overlayEl.style.left = `${left}px`;
  overlayEl.style.top = `${top}px`;
}

// Every floating overlay currently on screen, so a redraw of the lists can drop them all
// (they live on <body>, so they are not removed together with the tag they belong to).
const floatingOverlays = [];

function clearFloatingOverlays() {
  while (floatingOverlays.length > 0) floatingOverlays.pop().remove();
}

function wireCardTagHover(el, card) {
  let hoverOverlay = null;

  function hideHoverOverlay() {
    if (hoverOverlay) {
      hoverOverlay.remove();
      const index = floatingOverlays.indexOf(hoverOverlay);
      if (index !== -1) floatingOverlays.splice(index, 1);
      hoverOverlay = null;
    }
  }

  function showHoverOverlay() {
    if (expandedCardId === card.id) return;
    maybeBackfillCardDetails(card);
    hideHoverOverlay();
    hoverOverlay = document.createElement("div");
    hoverOverlay.className = "card-tag-hover-overlay";
    hoverOverlay.innerHTML = buildKeyDetailsHtml(card);
    document.body.appendChild(hoverOverlay);
    floatingOverlays.push(hoverOverlay);
    positionFloating(hoverOverlay, el.getBoundingClientRect(), true);
  }

  el.addEventListener("mouseenter", showHoverOverlay);
  el.addEventListener("mouseleave", hideHoverOverlay);
  el.addEventListener("focus", showHoverOverlay);
  el.addEventListener("blur", hideHoverOverlay);

  return hideHoverOverlay;
}
