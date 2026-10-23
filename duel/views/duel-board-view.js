/*
 * The playing board of a duel: one 7 by 5 grid for both players, the hands and the fan menu. DOM only: no state and
 * no rules.
 *
 *   renderBoard(rootEl, model, handlers)
 *   model    = { sim, you, hand: [uid], cardOf(uid) -> snapshot | null (this player's own cards),
 *                picking: { slots: [{ zone: "field"|"shared", slot, side? }] } | null, selected: uid | null,
 *                fan: { anchor, levels } | null, signal: { uid, kind } | null }
 *   handlers = { onSelectCard(uid, place, anchor), onPickZone(zone, slot, side), onOpenPile(side, pile, anchor),
 *                onDetails(card), onFaceDown(), onCancel(), onClearSignal(), fan: { onChoose(level, id), onClose() } }
 *
 * The grid follows boardCells(): the viewer's cells at the bottom, the opponent's turned 180 degrees at the top, the
 * two shared zones in the middle. A card is its image (a named placeholder when it has none), a face-down card a card
 * back. Each lower card of a stack is drawn offset by STACK_OFFSET_PX so every card can be selected; the opponent's
 * stacks grow the other way. Needs duel-board.js (boardCells, ownerOf), duel-view.js (el, button) and
 * duel-fan-view.js (renderFan).
 */
const STACK_OFFSET_PX = 6; // offset of each lower card of a stack (x and y)
const SIGNAL_WORDS = { activate: "Activates", target: "Targeted", attack: "Attacks" };
const PILE_LABELS = { deck: "Deck", extra: "Extra deck", gy: "Graveyard", banished: "Banished" };

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

/* The middle of an element in window coordinates: where a fan opens from. */
function anchorOf(node) {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/*
 * One card as a selectable element. `info` is its data when the viewer may see it, `usable` tells if the viewer can
 * open the menu of the card (their own, or one they control).
 */
function buildDuelCard(entry, info, usable, handlers, place, extraClass = "") {
  const faceDown = !(entry.faceUp === undefined ? true : entry.faceUp) || (!info && entry.card === null);
  const btn = el("button", `duel-card ${extraClass}${entry.pos === "def" ? " duel-card-def" : ""}${entry.faceUp === false ? " duel-card-facedown" : ""}`);
  btn.type = "button";
  btn.dataset.uid = entry.uid || "";
  const visible = Boolean(info) && !(entry.faceUp === false && !entry.card && !info);
  btn.appendChild(cardFace(visible ? info : null, !visible));
  const name = visible ? info.name : "Face-down card";
  btn.setAttribute("aria-label", `${name}${entry.faceUp === false ? ", face-down" : ""}${entry.pos === "def" ? ", sideways" : ""}`);
  btn.title = name;
  btn.addEventListener("click", () => {
    if (usable) handlers.onSelectCard(entry.uid, place, anchorOf(btn));
    else if (visible) handlers.onDetails(info);
    else if (handlers.onFaceDown) handlers.onFaceDown();
  });
  return btn;
}

/* The "Here" button of a zone that can receive the card being placed. */
function addPickButton(wrapper, label, zone, slot, side, handlers) {
  wrapper.classList.add("duel-zone-pick");
  const pick = el("button", "duel-zone-pick-btn", "Here");
  pick.type = "button";
  pick.setAttribute("aria-label", `Place the card in ${label}`);
  pick.addEventListener("click", () => handlers.onPickZone(zone, slot, side));
  wrapper.appendChild(pick);
}

/*
 * A playable or shared zone with its stack. `sideIndex` is the player whose field it is (null for a shared zone);
 * `opp` tells if it is drawn turned for the opponent.
 */
function buildStackZone(cell, sideIndex, model, handlers) {
  const shared = cell.kind === "shared";
  const stack = shared ? model.sim.shared[cell.slot] : model.sim.players[sideIndex].field[cell.slot];
  const opp = cell.side === "opp";
  const owner = shared ? "Shared" : sideIndex === model.you ? "Your" : "Opponent's";
  const label = `${owner} ${shared ? "zone" : "playable zone"} ${cell.slot + 1}`;
  const wrapper = el("div", `duel-zone duel-zone-${cell.kind}${opp ? " duel-zone-opp" : ""}`);
  wrapper.dataset.zone = cell.kind;
  wrapper.dataset.slot = String(cell.slot);
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", `${label}, ${stack.length} card${stack.length === 1 ? "" : "s"}`);
  const usable = shared || sideIndex === model.you; // what a player controls: their field and the shared zones
  stack.forEach((entry, i) => {
    const depth = stack.length - 1 - i; // the top card has depth 0
    const mine = ownerOf(entry.uid) === model.you;
    const info = entry.card || (mine ? model.cardOf(entry.uid) : null);
    const card = buildDuelCard(entry, info, usable, handlers, { zone: cell.kind, slot: cell.slot }, entry.uid === model.selected ? "duel-card-selected" : "");
    const shift = (opp ? 1 : -1) * depth * STACK_OFFSET_PX;
    card.style.translate = `${shift}px ${shift}px`;
    card.style.zIndex = String(i + 1);
    wrapper.appendChild(card);
  });
  const marked = model.signal && stack.some((c) => c.uid === model.signal.uid);
  if (marked) {
    const marker = el("button", `duel-signal duel-signal-${model.signal.kind}`, SIGNAL_WORDS[model.signal.kind]);
    marker.type = "button";
    marker.setAttribute("aria-label", `${SIGNAL_WORDS[model.signal.kind]}: remove the marker`);
    marker.addEventListener("click", handlers.onClearSignal);
    wrapper.appendChild(marker);
  }
  if (stack.length > 1) wrapper.appendChild(el("span", "duel-stack-count", String(stack.length)));
  const picking = model.picking && model.picking.slots.some((s) => s.zone === cell.kind && s.slot === cell.slot && (shared || s.side === undefined || s.side === sideIndex));
  if (picking) addPickButton(wrapper, label, cell.kind, cell.slot, shared ? undefined : sideIndex, handlers);
  return wrapper;
}

function buildPile(cell, sideIndex, model, handlers) {
  const side = model.sim.players[sideIndex];
  const pile = cell.kind;
  const own = sideIndex === model.you;
  const count = pile === "deck" ? side.deckCount : pile === "extra" ? side.extraCount : side[pile].length;
  const label = PILE_LABELS[pile];
  const wrapper = el("div", `duel-zone duel-zone-${pile} duel-pile${cell.side === "opp" ? " duel-zone-opp" : ""}`);
  const btn = el("button", "duel-pile-btn");
  btn.type = "button";
  btn.setAttribute("aria-label", `${own ? "Your" : "Opponent's"} ${label}, ${count} card${count === 1 ? "" : "s"}`);
  const top = pile === "gy" || pile === "banished" ? side[pile][side[pile].length - 1] : null;
  const info = top && top.card;
  btn.appendChild(info ? cardFace(info, false) : cardFace(null, count > 0 && (pile === "deck" || pile === "extra"), label));
  btn.appendChild(el("span", "duel-pile-label", `${label} ${count}`));
  btn.addEventListener("click", () => handlers.onOpenPile(sideIndex, pile, anchorOf(btn)));
  wrapper.appendChild(btn);
  return wrapper;
}

function buildGrid(model, handlers) {
  const grid = el("div", "duel-grid");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Board");
  boardCells().forEach((cell) => {
    const sideIndex = cell.side === "own" ? model.you : cell.side === "opp" ? 1 - model.you : null;
    let node;
    if (cell.kind === "empty") node = el("div", "duel-zone duel-zone-empty");
    else if (cell.kind === "field" || cell.kind === "shared") node = buildStackZone(cell, sideIndex, model, handlers);
    else node = buildPile(cell, sideIndex, model, handlers);
    node.style.gridColumn = String(cell.col + 1);
    node.style.gridRow = String(cell.row + 1);
    grid.appendChild(node);
  });
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

function renderBoard(rootEl, model, handlers) {
  rootEl.innerHTML = "";
  const board = el("div", "duel-board");
  board.append(buildHand(1 - model.you, model, handlers), buildGrid(model, handlers), buildHand(model.you, model, handlers));
  if (model.picking) {
    const note = el("p", "duel-pick-note", "Choose a zone for the card. ");
    note.setAttribute("role", "status");
    note.appendChild(button("Cancel", handlers.onCancel));
    rootEl.appendChild(note);
  }
  rootEl.appendChild(board);
  const fanHost = el("div", "duel-fan-host");
  rootEl.appendChild(fanHost);
  if (model.fan) renderFan(fanHost, model.fan, handlers.fan);
}
