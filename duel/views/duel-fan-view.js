/*
 * The fan menu: round buttons on a semicircle that opens above a card, and tight submenus on the chosen button.
 * DOM only: no state and no rules (the tree is in duel-menu.js, the positions in fan-layout.js).
 *
 *   renderFan(rootEl, fan, handlers)
 *   fan      = { anchor: { x, y }, levels: [{ nodes: [{ id, label, children? }], chosenId: string | null }], bounds? }
 *              anchor and bounds are in window coordinates; bounds defaults to the window
 *   handlers = { onChoose(levelIndex, nodeId), onClose() }
 *
 * The first level opens above the anchor; each further level is a tight block right on the chosen button of the
 * level before (so the mouse hardly moves), and only that button stays visible in the levels below it (choosing it
 * again closes the levels above). Arrow keys and Tab move between the buttons of the last level, Enter or Space chooses, Escape or a
 * click outside the buttons closes. Needs duel-view.js (el) and fan-layout.js.
 */
const FAN_CLOSE_KEY = "Escape";

function fanBounds(fan) {
  if (fan.bounds) return fan.bounds;
  const view = window.visualViewport;
  return { left: 0, top: 0, right: view ? view.width : window.innerWidth, bottom: view ? view.height : window.innerHeight };
}

/*
 * The centre of every button of every level: the first level is a fan above the anchor, each further level a block on
 * the button chosen before; the whole set is then slid, never turned, to fit the window.
 */
function fanPositions(fan) {
  const all = [];
  let anchor = fan.anchor;
  fan.levels.forEach((level, index) => {
    const points = index === 0 ? fanLayout({ anchor, count: level.nodes.length }) : fanSubmenu({ anchor, count: level.nodes.length });
    all.push(points);
    const chosen = level.nodes.findIndex((n) => n.id === level.chosenId);
    if (chosen !== -1) anchor = points[chosen];
  });
  // the buttons that are on screen: the chosen one of each level below, and every button of the last level
  const shown = all.flatMap((points, i) => (i < all.length - 1 ? points.filter((_, k) => fan.levels[i].nodes[k].id === fan.levels[i].chosenId) : points));
  const { dx, dy } = fanShift(shown, fanBounds(fan), FAN_BUTTON_PX / 2);
  return all.map((points) => points.map((p) => ({ x: p.x + dx, y: p.y + dy })));
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
      if (levelIndex < last && node.id !== level.chosenId) return; // only the path taken stays on screen
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
