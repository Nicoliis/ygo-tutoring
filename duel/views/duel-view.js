/*
 * Duel Room view: every screen of the room (start, creating, joining, connected, disconnected, failed). DOM only, no
 * state, no network and no rules. The table section is built once per screen and then only updated, so text typed
 * in its fields is never lost when the other player's change arrives.
 *
 *   renderRoom(rootEl, model, handlers)
 *   model    = { phase: "start" | "creating" | "joining" | "connected" | "disconnected" | "failed",
 *                status, error, notice, code, table, you, savedDuel: { names, turn } | null }
 *   handlers = { onCreate(), onJoin(text), onSubmitReply(text), onCopy(), onStartOver(), onReconnect(), onClearDuel(),
 *                onLpChange(target, mode, amount), onNextPhase(), onCoin(), onDie(), onUndo(), onRename(name) }
 *
 * Needs duel-table.js (DUEL_PHASES, NAME_MAX, LP_AMOUNT_LIMIT).
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = "btn btn-secondary") {
  const b = el("button", className, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function pasteBox(labelText, buttonText, onSubmit) {
  const wrap = el("div", "duel-paste");
  const label = el("label", "duel-label", labelText);
  const box = el("textarea", "duel-code-box");
  box.rows = 4;
  box.spellcheck = false;
  box.setAttribute("aria-label", labelText);
  label.appendChild(box);
  const go = button(buttonText, () => onSubmit(box.value), "btn btn-primary");
  wrap.append(label, go);
  return wrap;
}

function codeBox(labelText, code, onCopy) {
  const wrap = el("div", "duel-code");
  const label = el("label", "duel-label", labelText);
  const box = el("textarea", "duel-code-box");
  box.rows = 4;
  box.readOnly = true;
  box.value = code;
  box.setAttribute("aria-label", labelText);
  box.addEventListener("focus", () => box.select());
  label.appendChild(box);
  wrap.append(label, button("Copy code", () => onCopy(box), "btn btn-primary"));
  return wrap;
}

function buildMessages(model) {
  const box = el("div", "duel-messages");
  box.setAttribute("aria-live", "polite");
  if (model.status) box.appendChild(el("p", "duel-status", model.status));
  if (model.error) box.appendChild(el("p", "duel-error", model.error));
  if (model.notice) box.appendChild(el("p", "duel-notice", model.notice));
  return box;
}

function buildStart(model, h) {
  const frag = document.createDocumentFragment();
  const intro = el("section", "panel");
  intro.appendChild(el("h2", null, "Duel Room"));
  intro.appendChild(
    el("p", "duel-explain", "Play a duel with a friend, browser to browser. One of you creates a room and sends the invitation code; the other pastes it and sends back a reply code. Once the reply is pasted the two browsers connect directly: no server keeps the duel, and only your names and the duel table are shared.")
  );
  frag.appendChild(intro);
  if (model.savedDuel) {
    const saved = el("section", "panel");
    saved.appendChild(el("h2", null, "Last duel"));
    saved.appendChild(el("p", null, `${model.savedDuel.names[0]} vs ${model.savedDuel.names[1]} · turn ${model.savedDuel.turn}`));
    const actions = el("div", "duel-actions");
    actions.append(button("Reconnect", h.onReconnect, "btn btn-primary"), button("Clear duel", h.onClearDuel));
    saved.appendChild(actions);
    frag.appendChild(saved);
  }
  const create = el("section", "panel");
  create.appendChild(el("h2", null, "Create a room"));
  create.appendChild(el("p", null, "You get an invitation code to send to your friend."));
  create.appendChild(button("Create room", h.onCreate, "btn btn-primary"));
  const join = el("section", "panel");
  join.appendChild(el("h2", null, "Join a room"));
  join.appendChild(pasteBox("Invitation code from the room creator", "Join room", h.onJoin));
  frag.append(create, join);
  return frag;
}

function buildWaiting(model, h) {
  const panel = el("section", "panel");
  if (model.phase === "creating") {
    panel.appendChild(el("h2", null, "Your room is open"));
    panel.appendChild(el("p", null, "1. Send this invitation code to your friend. 2. When they send a reply code back, paste it below."));
    panel.appendChild(codeBox("Invitation code", model.code, h.onCopy));
    panel.appendChild(pasteBox("Reply code from your friend", "Connect", h.onSubmitReply));
  } else {
    panel.appendChild(el("h2", null, "Send this reply to the room creator"));
    panel.appendChild(el("p", null, "When they paste it into their room, you are connected."));
    panel.appendChild(codeBox("Reply code", model.code, h.onCopy));
  }
  panel.appendChild(button("Start over", h.onStartOver));
  return panel;
}

function buildFailed(model, h) {
  const panel = el("section", "panel");
  panel.appendChild(el("h2", null, "Could not connect"));
  panel.appendChild(el("p", null, model.error || "The connection could not be made."));
  panel.appendChild(
    el("p", "duel-explain", "Some networks (offices, schools, some mobile connections) block direct connections between players. Try again with new codes, or try from another network.")
  );
  panel.appendChild(button("Try again", h.onStartOver, "btn btn-primary"));
  return panel;
}

/* ---- the table ---- */

function buildPlayerPanel(index, h) {
  const panel = el("section", "panel duel-player");
  panel.dataset.player = String(index);
  const name = el("h2", "duel-player-name");
  const rename = el("input", "search-input duel-rename");
  rename.type = "text";
  rename.maxLength = NAME_MAX;
  rename.setAttribute("aria-label", "Your name");
  rename.addEventListener("change", () => h.onRename(rename.value));
  const lp = el("div", "duel-lp");
  lp.setAttribute("aria-live", "polite");
  const amount = el("input", "search-input duel-amount");
  amount.type = "number";
  amount.min = "0";
  amount.max = String(LP_AMOUNT_LIMIT);
  amount.value = "1000";
  amount.setAttribute("aria-label", "Amount of life points");
  const readAmount = () => Math.max(0, Math.min(LP_AMOUNT_LIMIT, Math.trunc(Number(amount.value) || 0)));
  const controls = el("div", "duel-lp-controls");
  controls.append(
    amount,
    button("Subtract", () => h.onLpChange(index, "add", -readAmount())),
    button("Add", () => h.onLpChange(index, "add", readAmount())),
    button("Set", () => h.onLpChange(index, "set", readAmount()))
  );
  panel.append(name, rename, lp, controls);
  return panel;
}

function buildTable(h) {
  const root = el("div", "duel-table");
  const refs = { players: [], phases: [], root };

  const players = el("div", "duel-players");
  for (let i = 0; i < 2; i++) {
    const panel = buildPlayerPanel(i, h);
    refs.players.push({ panel, name: panel.querySelector(".duel-player-name"), rename: panel.querySelector(".duel-rename"), lp: panel.querySelector(".duel-lp") });
    players.appendChild(panel);
  }

  const turn = el("section", "panel duel-turn");
  refs.turn = el("p", "duel-turn-text");
  refs.turn.setAttribute("aria-live", "polite");
  const bar = el("ol", "duel-phases");
  DUEL_PHASES.forEach((phase) => {
    const li = el("li", "duel-phase", phase);
    refs.phases.push(li);
    bar.appendChild(li);
  });
  const actions = el("div", "duel-actions");
  refs.next = button("Next phase", h.onNextPhase, "btn btn-primary");
  refs.coin = button("Flip coin", h.onCoin);
  refs.die = button("Roll die", h.onDie);
  refs.undo = button("Undo my last change", h.onUndo);
  actions.append(refs.next, refs.coin, refs.die, refs.undo);
  refs.results = el("p", "duel-results");
  refs.results.setAttribute("aria-live", "polite");
  turn.append(refs.turn, bar, actions, refs.results);

  const logPanel = el("section", "panel duel-log-panel");
  logPanel.appendChild(el("h2", null, "Log"));
  refs.log = el("ol", "duel-log");
  refs.log.setAttribute("role", "log");
  refs.log.setAttribute("aria-live", "polite");
  logPanel.appendChild(refs.log);

  root.append(players, turn, logPanel);
  return refs;
}

function updateTable(refs, model) {
  const t = model.table;
  t.players.forEach((p, i) => {
    const ref = refs.players[i];
    ref.name.textContent = `${p.name}${i === model.you ? " (you)" : ""}`;
    ref.panel.classList.toggle("duel-active-player", t.active === i);
    ref.panel.classList.toggle("duel-winner", t.winner === i);
    ref.lp.textContent = String(p.lp);
    ref.lp.setAttribute("aria-label", `${p.name} life points: ${p.lp}`);
    ref.rename.hidden = i !== model.you;
    if (i === model.you && document.activeElement !== ref.rename) ref.rename.value = p.name;
  });
  refs.turn.textContent = `Turn ${t.turn} · ${t.players[t.active].name}'s turn · ${t.phase}`;
  refs.phases.forEach((li) => li.classList.toggle("duel-phase-current", li.textContent === t.phase));
  refs.results.textContent = `Coin: ${t.coin || "—"} · Die: ${t.die || "—"}${t.winner !== null ? ` · ${t.players[t.winner].name} wins the duel` : ""}`;
  const live = model.phase === "connected";
  [refs.next, refs.coin, refs.die, refs.undo].forEach((b) => {
    b.disabled = !live;
  });
  refs.root.querySelectorAll(".duel-lp-controls button, .duel-lp-controls input, .duel-rename").forEach((c) => {
    c.disabled = !live;
  });
  refs.log.innerHTML = "";
  t.log
    .slice()
    .reverse()
    .forEach((entry) => refs.log.appendChild(el("li", `duel-log-entry duel-log-${entry.kind}`, entry.text)));
}

function renderRoom(rootEl, model, h) {
  const showsTable = model.phase === "connected" || (model.phase === "disconnected" && model.table);
  const screen = model.phase === "connected" && model.deckChoice ? "deck" : showsTable ? "table" : model.phase;
  if (rootEl.dataset.screen !== screen) {
    rootEl.dataset.screen = screen;
    rootEl.innerHTML = "";
    rootEl._refs = null;
  }
  // messages and the banner are redrawn every time; the rest of each screen is built once
  let messages = rootEl.querySelector(":scope > .duel-messages");
  const fresh = buildMessages(model);
  if (messages) messages.replaceWith(fresh);
  else rootEl.prepend(fresh);

  if (!rootEl._refs) {
    const body = el("div", "duel-body");
    if (screen === "start") body.appendChild(buildStart(model, h));
    else if (screen === "creating" || screen === "joining") body.appendChild(buildWaiting(model, h));
    else if (screen === "failed") body.appendChild(buildFailed(model, h));
    else if (screen === "deck") {
      const host = el("div", "duel-deck-host");
      body.appendChild(host);
      rootEl._refs = { static: true, deckHost: host };
    }
    else if (screen === "table") {
      rootEl._refs = buildTable(h);
      body.appendChild(rootEl._refs.root);
    }
    if (!rootEl._refs) rootEl._refs = { static: true };
    rootEl.appendChild(body);
  }
  if (screen === "deck") renderDeckChoice(rootEl._refs.deckHost, model.deckChoice, { onChoose: h.onChooseDeck, onNoCards: h.onNoCards });
  if (screen === "table" && model.table) {
    updateTable(rootEl._refs, model);
    let host = rootEl._refs.root.querySelector(":scope > .duel-board-host");
    if (model.board) {
      if (!host) {
        host = el("div", "duel-board-host");
        rootEl._refs.root.prepend(host);
      }
      renderBoard(host, model.board, h.boardHandlers);
    } else if (host) host.remove();
    let banner = rootEl.querySelector(":scope > .duel-banner");
    if (model.phase === "disconnected") {
      if (!banner) {
        banner = el("section", "panel duel-banner");
        banner.appendChild(el("h2", null, "Opponent disconnected"));
        const actions = el("div", "duel-actions");
        actions.append(button("Reconnect", h.onReconnect, "btn btn-primary"), button("Clear duel", h.onClearDuel));
        banner.appendChild(actions);
        rootEl.insertBefore(banner, rootEl.querySelector(":scope > .duel-body"));
      }
    } else if (banner) banner.remove();
  }
}
