/*
 * The card details window: the details on the left and the engines panel on the right (below on a narrow window).
 * Every screen that shows a card's details opens it through here, so the panel is in all of them.
 *
 *   showCardDetailWindow({ card, title, detailHtml, buttons, pull })
 *
 * `pull` is null, or the pull context a page gives for a card just pulled or picked (see card-engines.js).
 * `engines: false` shows the details alone, without the engines panel (used while playing a duel).
 * Needs modal.js (showModal); the panel itself comes from card-engines.js when that script is loaded.
 */
function showCardDetailWindow({ card, title, detailHtml, buttons, pull = null, engines = true }) {
  if (!engines) {
    // the duel simulator: details only, nothing here may change the player's collection
    showModal({ title, bodyHtml: detailHtml, buttons });
    return;
  }
  const bodyHtml =
    '<div class="card-detail-layout">' +
    `<div class="card-detail-main">${detailHtml}</div>` +
    '<aside class="card-detail-engines" aria-label="Engines"></aside>' +
    "</div>";
  showModal({ title, bodyHtml, buttons });
  const column = document.querySelector("#modalRoot .card-detail-engines");
  if (column && typeof mountEnginesPanel === "function") mountEnginesPanel(column, card, pull);
}
