/*
 * The playing field of a duel: both players' zones, stacks, piles and hands. DOM only, no state and no rules.
 *
 *   renderBoard(rootEl, model, handlers)
 *   model    = { sim, you, hand: [uid], cardOf(uid) -> snapshot | null (this player's own cards),
 *                picking: { zones: [{ zone, slot }] } | null, menu: { uid, actions: [{ id, label }] } | null,
 *                selected: uid | null }
 *   handlers = { onSelectCard(uid, place), onAction(id), onPickZone(zone, slot), onOpenPile(side, pile),
 *                onDetails(card), onCancel() }
 *
 * The opponent's field is drawn upside down at the top, the player's own at the bottom. A card is its image (a named
 * placeholder when it has none), a face-down card a card back. Each lower card of a stack is drawn offset by
 * STACK_OFFSET_PX so every card of the stack can be selected. Needs duel-board.js (ZONE_KINDS) and duel-view.js (el, button).
 */
const STACK_OFFSET_PX = 6; // offset of each lower card of a stack (x and y)
const PLACEMENT = {
  // zone name -> [column, row] on the 7 column field grid
  extra: [1, 1], spell: [2, 1], deck: [7, 1], field: [1, 2], monster: [2, 2], gy: [7, 2], banished: [1, 3], pendulum: [2, 3],
};

function cardFace(card, faceDown, label) {
  const face = el("span", "duel-card-face" + (faceDown ? " duel-card-back" : ""));
  if (!faceDown && card && card.imageSmall) {
    const img = document.createElement("img");
    img.src = card.imageSmall;
    img.alt = "";
    img.loading = "lazy";
    img.draggable = false;
    img.addEventListener("error", () => {
      face.innerHTML = "";
      face.appendChild(el("span", "duel-card-name", card.name));
    });
    face.appendChild(img);
  } else if (!faceDown) {
    face.appendChild(el("span", "duel-card-name", card ? card.name : label || "Card"));
  }
  return face;
}

/* One card as a selectable element; `info` is its data when the viewer may see it, `own` tells if it can be moved. */
function buildDuelCard(entry, info, own, handlers, place, extraClass = "") {
  const faceDown = !(entry.faceUp === undefined ? true : entry.faceUp) || (!info && entry.card === null);
  const btn = el("button", `duel-card ${extraClass}${entry.pos === "def" ? " duel-card-def" : ""}${entry.faceUp === false ? " duel-card-facedown" : ""}`);
  btn.type = "button";
  btn.dataset.uid = entry.uid || "";
  const visible = info && !(entry.faceUp === false && !own);
  btn.appendChild(cardFace(visible ? info : null, !visible));
  const name = visible ? info.name : "Face-down card";
  btn.setAttribute("aria-label", `${name}${entry.faceUp === false ? ", face-down" : ""}${entry.pos === "def" ? ", defense position" : ""}`);
  btn.title = name;
  btn.addEventListener("click", () => {
    if (own) handlers.onSelectCard(entry.uid, place);
    else if (visible) handlers.onDetails(info);
  });
  return btn;
}

function buildZone(sideIndex, side, zone, slot, model, handlers) {
  const own = sideIndex === model.you;
  const stack = side.zones[zone][slot];
  const wrapper = el("div", `duel-zone duel-zone-${zone}`);
  wrapper.dataset.zone = zone;
  wrapper.dataset.slot = String(slot);
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", `${own ? "Your" : "Opponent's"} ${zone} zone ${slot + 1}, ${stack.length} card${stack.length === 1 ? "" : "s"}`);
  stack.forEach((entry, i) => {
    const depth = stack.length - 1 - i; // the top card has depth 0
    const info = entry.card || (own ? model.cardOf(entry.uid) : null);
    const card = buildDuelCard(entry, info, own, handlers, { zone, slot }, entry.uid === model.selected ? "duel-card-selected" : "");
    card.style.transform = `translate(${-depth * STACK_OFFSET_PX}px, ${-depth * STACK_OFFSET_PX}px)`;
    card.style.zIndex = String(i + 1);
    wrapper.appendChild(card);
  });
  if (stack.length > 1) wrapper.appendChild(el("span", "duel-stack-count", String(stack.length)));
  const picking = own && model.picking && model.picking.zones.some((z) => z.zone === zone && z.slot === slot);
  if (picking) {
    wrapper.classList.add("duel-zone-pick");
    const pick = el("button", "duel-zone-pick-btn", "Here");
    pick.type = "button";
    pick.setAttribute("aria-label", `Place the card in ${zone} zone ${slot + 1}`);
    pick.addEventListener("click", () => handlers.onPickZone(zone, slot));
    wrapper.appendChild(pick);
  }
  return wrapper;
}

function buildPile(sideIndex, side, pile, model, handlers) {
  const own = sideIndex === model.you;
  const count = pile === "deck" ? side.deckCount : pile === "extra" ? side.extraCount : side[pile].length;
  const label = { deck: "Deck", extra: "Extra deck", gy: "Graveyard", banished: "Banished" }[pile];
  const wrapper = el("div", `duel-zone duel-zone-${pile} duel-pile`);
  const btn = el("button", "duel-pile-btn");
  btn.type = "button";
  btn.setAttribute("aria-label", `${own ? "Your" : "Opponent's"} ${label}, ${count} card${count === 1 ? "" : "s"}`);
  const top = pile === "gy" || pile === "banished" ? side[pile][side[pile].length - 1] : null;
  const info = top && top.card;
  btn.appendChild(info ? cardFace(info, false) : cardFace(null, count > 0 && (pile === "deck" || pile === "extra"), label));
  btn.appendChild(el("span", "duel-pile-label", `${label} ${count}`));
  btn.addEventListener("click", () => handlers.onOpenPile(sideIndex, pile));
  wrapper.appendChild(btn);
  return wrapper;
}

function buildField(sideIndex, model, handlers) {
  const side = model.sim.players[sideIndex];
  const grid = el("div", "duel-field");
  const place = (node, col, row) => {
    node.style.gridColumn = String(col);
    node.style.gridRow = String(row);
    grid.appendChild(node);
  };
  ["extra", "deck", "gy", "banished"].forEach((pile) => {
    const [col, row] = PLACEMENT[pile];
    place(buildPile(sideIndex, side, pile, model, handlers), col, row);
  });
  for (let i = 0; i < MONSTER_ZONES; i++) place(buildZone(sideIndex, side, "monster", i, model, handlers), 2 + i, 2);
  for (let i = 0; i < SPELL_ZONES; i++) place(buildZone(sideIndex, side, "spell", i, model, handlers), 2 + i, 1);
  place(buildZone(sideIndex, side, "field", 0, model, handlers), 1, 2);
  place(buildZone(sideIndex, side, "pendulum", 0, model, handlers), 2, 3);
  place(buildZone(sideIndex, side, "pendulum", 1, model, handlers), 6, 3);
  return grid;
}

function buildHand(sideIndex, model, handlers) {
  const own = sideIndex === model.you;
  const side = model.sim.players[sideIndex];
  const row = el("div", `duel-hand${own ? " duel-hand-own" : ""}`);
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", `${own ? "Your" : "Opponent's"} hand, ${side.handCount} card${side.handCount === 1 ? "" : "s"}`);
  if (own) {
    model.hand.forEach((uid) => {
      const info = model.cardOf(uid);
      const revealed = Boolean(side.revealed[uid]);
      row.appendChild(buildDuelCard({ uid, faceUp: true }, info, true, handlers, { zone: "hand" }, (uid === model.selected ? "duel-card-selected " : "") + (revealed ? "duel-card-revealed" : "")));
    });
  } else {
    const shown = Object.values(side.revealed);
    shown.forEach((card) => row.appendChild(buildDuelCard({ uid: "", faceUp: true }, card, false, handlers, { zone: "hand" }, "duel-card-revealed")));
    for (let i = shown.length; i < side.handCount; i++) {
      const back = el("span", "duel-card duel-card-hand-back");
      back.appendChild(cardFace(null, true));
      row.appendChild(back);
    }
  }
  return row;
}

function buildMenu(model, handlers) {
  const menu = el("div", "duel-menu");
  menu.setAttribute("role", "menu");
  menu.appendChild(el("p", "duel-menu-title", model.menu.title || "Card"));
  model.menu.actions.forEach((action) => {
    const b = button(action.label, () => handlers.onAction(action.id));
    b.setAttribute("role", "menuitem");
    menu.appendChild(b);
  });
  menu.appendChild(button("Cancel", handlers.onCancel));
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") handlers.onCancel();
  });
  return menu;
}

function renderBoard(rootEl, model, handlers) {
  rootEl.innerHTML = "";
  const board = el("div", "duel-board");
  const opp = 1 - model.you;
  const top = el("section", "duel-side duel-side-opponent");
  top.setAttribute("aria-label", "Opponent's side");
  top.append(buildField(opp, model, handlers), buildHand(opp, model, handlers));
  const bottom = el("section", "duel-side duel-side-own");
  bottom.setAttribute("aria-label", "Your side");
  bottom.append(buildField(model.you, model, handlers), buildHand(model.you, model, handlers));
  board.append(top, bottom);
  rootEl.appendChild(board);
  if (model.picking) {
    const note = el("p", "duel-pick-note", "Choose a zone for the card.");
    note.setAttribute("role", "status");
    rootEl.insertBefore(note, board);
  }
  if (model.menu) {
    const menu = buildMenu(model, handlers);
    rootEl.appendChild(menu);
    const first = menu.querySelector("button");
    if (first) first.focus();
  }
}
