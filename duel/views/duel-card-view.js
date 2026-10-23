/*
 * The card display: the picture and the details of the card the player last pointed at, always visible beside the
 * board. DOM only; the only thing it remembers is which card is shown, so a redraw of the table keeps it.
 *
 *   buildCardDisplay() -> the panel element
 *   showInCardDisplay(card)    the card to show (a snapshot the viewer may see), or null for the empty panel
 *
 * Needs duel-view.js (el), card-tags-builder.js and card-effect-builder.js (buildCardTagsHtml, buildEffectHtml).
 */
const CARD_DISPLAY_EMPTY = "Point at a card to read it here.";
let displayedCard = null;

function fillCardDisplay(host, card) {
  host.innerHTML = "";
  if (!card) {
    host.appendChild(el("p", "duel-explain", CARD_DISPLAY_EMPTY));
    return;
  }
  const picture = card.imageFull || card.imageSmall;
  if (picture) {
    const img = document.createElement("img");
    img.className = "duel-card-display-image";
    img.src = picture;
    img.alt = card.name;
    host.appendChild(img);
  }
  host.appendChild(el("h2", "duel-card-display-name", card.name));
  const text = document.createElement("div");
  text.className = "duel-card-display-text";
  text.innerHTML = buildCardTagsHtml(card) + buildEffectHtml(card);
  host.appendChild(text);
}

function buildCardDisplay() {
  const panel = el("section", "panel duel-card-display");
  panel.setAttribute("aria-label", "Card details");
  panel.setAttribute("aria-live", "polite");
  fillCardDisplay(panel, displayedCard);
  return panel;
}

function showInCardDisplay(card) {
  if (card === displayedCard) return;
  displayedCard = card;
  const host = document.querySelector(".duel-card-display");
  if (host) fillCardDisplay(host, card);
}
