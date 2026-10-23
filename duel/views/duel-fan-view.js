/*
 * The fan menu: round buttons on a semicircle that opens above a card, and further fans from the chosen button.
 * DOM only: no state and no rules (the tree is in duel-menu.js, the positions in fan-layout.js).
 *
 *   renderFan(rootEl, fan, handlers)
 *   fan      = { anchor: { x, y }, levels: [{ nodes: [{ id, label, children? }], chosenId: string | null }], bounds? }
 *              anchor and bounds are in window coordinates; bounds defaults to the window
 *   handlers = { onChoose(levelIndex, nodeId), onClose() }
 *
 * The first level opens upward from the anchor; each further level opens outward from the chosen button of the
 * level before. Arrow keys and Tab move between the buttons of the last level, Enter or Space chooses, Escape or a
 * click outside the buttons closes. Needs duel-view.js (el) and fan-layout.js.
 */
const FAN_FIRST_DIRECTION_DEG = -90; // straight up
const FAN_CLOSE_KEY = "Escape";

function fanBounds(fan) {
  if (fan.bounds) return fan.bounds;
  const view = window.visualViewport;
  return { left: 0, top: 0, right: view ? view.width : window.innerWidth, bottom: view ? view.height : window.innerHeight };
}

/* The centre of every button of every level, computed level after level. */
function fanPositions(fan) {
  const bounds = fanBounds(fan);
  const all = [];
  let anchor = fan.anchor;
  let direction = FAN_FIRST_DIRECTION_DEG;
  let span = FAN_FIRST_SPAN_DEG;
  fan.levels.forEach((level, index) => {
    const points = fanLayout({ anchor, count: level.nodes.length, direction, span, bounds, avoid: all.flat() });
    all.push(points);
    const chosen = level.nodes.findIndex((n) => n.id === level.chosenId);
    if (chosen !== -1) {
      const next = points[chosen];
      direction = Math.atan2(next.y - anchor.y, next.x - anchor.x) * 180 / Math.PI;
      anchor = next;
      span = FAN_SUB_SPAN_DEG;
    }
  });
  return all;
}

function renderFan(rootEl, fan, handlers) {
  rootEl.innerHTML = "";
  if (!fan) return;
  const layer = el("div", "duel-fan");
  layer.setAttribute("role", "menu");
  layer.addEventListener("click", (e) => {
    if (e.target === layer) handlers.onClose();
  });
  const positions = fanPositions(fan);
  const last = fan.levels.length - 1;
  fan.levels.forEach((level, levelIndex) => {
    level.nodes.forEach((node, i) => {
      const p = positions[levelIndex][i];
      const btn = el("button", "duel-fan-btn" + (node.id === level.chosenId ? " duel-fan-chosen" : "") + (levelIndex < last ? " duel-fan-past" : ""));
      btn.type = "button";
      btn.setAttribute("role", "menuitem");
      btn.dataset.id = node.id;
      btn.dataset.level = String(levelIndex);
      btn.setAttribute("aria-label", node.children ? `${node.label}, opens more choices` : node.label);
      if (node.children) btn.setAttribute("aria-haspopup", "menu");
      btn.style.left = `${p.x}px`;
      btn.style.top = `${p.y}px`;
      btn.appendChild(el("span", "duel-fan-label", node.label));
      btn.addEventListener("click", () => handlers.onChoose(levelIndex, node.id));
      layer.appendChild(btn);
    });
  });
  layer.addEventListener("keydown", (e) => {
    if (e.key === FAN_CLOSE_KEY) {
      e.preventDefault();
      handlers.onClose();
      return;
    }
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const buttons = [...layer.querySelectorAll(`.duel-fan-btn[data-level="${last}"]`)];
    const at = buttons.indexOf(document.activeElement);
    const next = buttons[(at + step + buttons.length) % buttons.length];
    if (next) next.focus();
  });
  rootEl.appendChild(layer);
  const first = layer.querySelector(`.duel-fan-btn[data-level="${last}"]`);
  if (first) first.focus();
}
