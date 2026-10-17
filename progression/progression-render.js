let activeProfile = null;
let currentRun = null;
let busy = false;
let packReveal = null;

function setProgressionStatus(message, isError) {
  progressionStatusEl.textContent = message || "";
  progressionStatusEl.classList.toggle("error", Boolean(isError));
}

function countOwnedCards() {
  const blob = loadData(STORAGE_KEY);
  const cards = blob && Array.isArray(blob.cards) ? blob.cards : [];
  return cards.reduce((sum, c) => sum + (Number(c.quantityOwned) || 0), 0);
}

function stageLabel(name) {
  const date = getReleaseDate(name);
  return date ? `${name} (${date})` : name;
}

const STAGE_STATE_TEXT = { opened: "opened", next: "next to open", locked: "not reached yet" };

function buildBoosterPack(name, state, isCurrent) {
  const li = document.createElement("li");
  li.className = `booster-pack pack-${state}`;
  if (isCurrent) li.setAttribute("aria-current", "step");
  const label = `${stageLabel(name)} — ${STAGE_STATE_TEXT[state]}`;
  li.title = label;

  const art = document.createElement("div");
  art.className = "booster-art";
  const image = getSetImage(name);
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = label;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      art.innerHTML = "";
      art.appendChild(buildPlaceholderPack(name, label));
    });
    art.appendChild(img);
  } else {
    art.appendChild(buildPlaceholderPack(name, label));
  }
  li.appendChild(art);

  const caption = document.createElement("span");
  caption.className = "booster-caption";
  caption.textContent = name;
  li.appendChild(caption);
  return li;
}

function buildPlaceholderPack(name, label) {
  const ph = document.createElement("div");
  ph.className = "booster-placeholder";
  ph.setAttribute("role", "img");
  ph.setAttribute("aria-label", label);
  ph.textContent = name;
  return ph;
}

function buildBoosterRail(run) {
  const section = document.createElement("section");
  section.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = "Boosters";
  section.appendChild(heading);
  const rail = document.createElement("ol");
  rail.className = "booster-rail";
  MAINLINE_BOOSTERS.forEach((name) => {
    rail.appendChild(buildBoosterPack(name, stageState(run, name, MAINLINE_BOOSTERS), name === run.current));
  });
  section.appendChild(rail);
  requestAnimationFrame(() => {
    const current = rail.querySelector('[aria-current="step"]');
    if (current) rail.scrollLeft = Math.max(0, current.offsetLeft - rail.clientWidth / 2 + current.clientWidth / 2);
  });
  return section;
}

function renderNoRules() {
  progressionRootEl.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = `<h2>No run rules</h2>
    <p>This profile has no run rules. Use the other tools freely:</p>
    <p><a href="../workshop/backlog.html">Workshop</a> · <a href="../draft/index.html">Booster Draft</a> · <a href="../tracker/index.html">Pack Puller</a></p>`;
  progressionRootEl.appendChild(panel);
}

function buildActionButton(label, check, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary";
  btn.textContent = label;
  btn.disabled = busy || !check.ok;
  btn.title = check.reason;
  btn.addEventListener("click", onClick);
  return btn;
}

/* Groups identical pulls (same card, same rarity) into { card, count }, rarest first. */
function groupPulled(cards) {
  const groups = new Map();
  cards.forEach((card) => {
    const key = `${card.name}|${card.rarity || ""}`;
    if (groups.has(key)) groups.get(key).count += 1;
    else groups.set(key, { card, count: 1 });
  });
  return Array.from(groups.values()).sort(
    (a, b) => rarityRank(b.card.rarity) - rarityRank(a.card.rarity) || a.card.name.localeCompare(b.card.name)
  );
}

function buildPulledList(cards) {
  const list = document.createElement("div");
  list.className = "pulled-strip";
  groupPulled(cards).forEach(({ card, count }) => {
    const tile = buildRevealedCardElement(card);
    if (count > 1) {
      tile.setAttribute("aria-label", `${tile.getAttribute("aria-label")} — ${count} copies`);
      const tag = document.createElement("span");
      tag.className = "revealed-card-count";
      tag.textContent = `x${count}`;
      tile.appendChild(tag);
    }
    list.appendChild(tile);
  });
  return list;
}

/* The opener: pack area (left), action slot (right), and the strip of cards pulled this box. */
function buildOpenerPanel() {
  const panel = document.createElement("section");
  panel.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = "Box";
  panel.appendChild(heading);

  const stage = document.createElement("div");
  stage.className = "pack-stage";
  packAreaEl = document.createElement("div");
  packAreaEl.className = "pack-area";
  packActionEl = document.createElement("div");
  packActionEl.className = "pack-action-slot";
  stage.append(packAreaEl, packActionEl);
  const progress = document.createElement("div");
  progress.id = "boxProgress";
  progress.className = "box-progress";
  progress.innerHTML =
    '<span class="box-progress-text" aria-live="polite"></span>' +
    '<progress class="box-progress-bar" aria-label="Box progress"></progress>';
  panel.appendChild(progress);

  const hint = document.createElement("p");
  hint.className = "status";
  hint.textContent = "Click the card back to pull the next card.";
  panel.appendChild(hint);
  panel.appendChild(stage);

  const pulledHeading = document.createElement("h3");
  pulledHeading.textContent = "Pulled this pack (click a card for details; the whole box is in See pulled)";
  panel.appendChild(pulledHeading);
  pulledStripEl = document.createElement("div");
  pulledStripEl.className = "pulled-strip";
  pulledStripEl.setAttribute("aria-label", "Cards pulled from this pack");
  panel.appendChild(pulledStripEl);
  return panel;
}

let packAreaEl = null;
let packActionEl = null;
let pulledStripEl = null;

function renderRun() {
  if (packReveal) {
    packReveal.destroy();
    packReveal = null;
  }
  if (extraReveal) {
    extraReveal.destroy();
    extraReveal = null;
  }
  progressionRootEl.innerHTML = "";
  const run = currentRun;
  const phase = boxPhase(run);

  const stagePanel = document.createElement("section");
  stagePanel.className = "panel";
  const summary = document.createElement("p");
  summary.className = "run-summary";
  summary.textContent = `${activeProfile.name} — ${runSummary(run, MAINLINE_BOOSTERS)} · ${countOwnedCards()} cards owned`;
  stagePanel.appendChild(summary);

  if (run.current === null) {
    const done = document.createElement("h2");
    done.textContent = "Run finished!";
    stagePanel.appendChild(done);
  } else {
    const heading = document.createElement("h2");
    heading.textContent = `Current stage: ${stageLabel(run.current)}`;
    stagePanel.appendChild(heading);

    const actions = document.createElement("div");
    actions.className = "stage-actions";
    const deckLink = document.createElement("a");
    deckLink.className = "btn btn-secondary";
    deckLink.href = "../workshop/deckbuilding.html";
    deckLink.textContent = "Build decks";
    const complete = canCompleteStage(run);
    const start = canOpenBox(run);
    if (phase === "not-started") actions.appendChild(buildActionButton("Start box", start, onStartBox));
    actions.appendChild(buildActionButton("Complete stage", complete, onCompleteStage));
    actions.appendChild(deckLink);
    stagePanel.appendChild(actions);

    const hint = document.createElement("p");
    hint.className = "status";
    hint.textContent = phase === "finished" ? complete.reason : start.reason;
    stagePanel.appendChild(hint);
  }
  progressionRootEl.appendChild(stagePanel);

  if (run.current !== null && phase !== "not-started") {
    progressionRootEl.appendChild(buildOpenerPanel());
    mountOpener();
  }

  const extraPanel = buildExtraPanel();
  if (extraPanel) {
    progressionRootEl.appendChild(extraPanel);
    if (getExtraPack(currentRun)) mountExtraPack();
  }

  progressionRootEl.appendChild(buildBoosterRail(run));

  if (run.completed.length > 0) {
    const done = document.createElement("section");
    done.className = "panel";
    const h = document.createElement("h2");
    h.textContent = `Completed (${run.completed.length})`;
    done.appendChild(h);
    const list = document.createElement("ol");
    list.className = "stage-list";
    run.completed.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = stageLabel(name);
      list.appendChild(li);
    });
    done.appendChild(list);
    progressionRootEl.appendChild(done);
  }
}

/* "Pack x/24 · y/z cards" for the whole box, plus a thin progress bar. Safe to call at any time. */
function updateBoxProgress() {
  const el = document.getElementById("boxProgress");
  if (!el || !currentRun) return;
  const box = getBox(currentRun);
  const packNumber = Math.min(BOX_PACKS, box.packsOpened + (box.pack ? 1 : 0));
  const totalCards = BOX_PACKS * getBoosterSize(currentRun.current);
  el.querySelector(".box-progress-text").textContent =
    `Pack ${packNumber}/${BOX_PACKS} · ${box.pulled.length}/${totalCards} cards pulled`;
  const bar = el.querySelector(".box-progress-bar");
  bar.max = totalCards;
  bar.value = box.pulled.length;
}

/* ---- Bought boosters (opened one at a time with the same opener, outside the stage box) ---- */

let extraReveal = null;
let extraAreaEl = null;
let extraActionEl = null;
let extraStripEl = null;

/* The "Bought boosters" panel, or null when there is nothing in the inventory and no pack open. */
function buildExtraPanel() {
  const inventory = Object.entries(currentRun.packInventory || {}).filter(([, n]) => n > 0);
  const open = getExtraPack(currentRun);
  if (inventory.length === 0 && !open) return null;

  const panel = document.createElement("section");
  panel.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = "Bought boosters";
  panel.appendChild(heading);

  if (inventory.length > 0) {
    const list = document.createElement("ul");
    list.className = "bought-list";
    inventory.forEach(([setName, count]) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${setName} ×${count}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary";
      btn.textContent = "Open one";
      btn.disabled = busy || Boolean(open);
      btn.title = open ? "Finish the pack you are opening first." : "";
      btn.setAttribute("aria-label", `Open one ${setName} pack`);
      btn.addEventListener("click", () => onOpenBought(setName));
      li.append(label, btn);
      list.appendChild(li);
    });
    panel.appendChild(list);
  }

  if (open) {
    const title = document.createElement("h3");
    title.textContent = `Opening: ${open.setName}`;
    panel.appendChild(title);
    const hint = document.createElement("p");
    hint.className = "status";
    hint.textContent = "Click the card back to pull the next card.";
    panel.appendChild(hint);
    const stage = document.createElement("div");
    stage.className = "pack-stage";
    extraAreaEl = document.createElement("div");
    extraAreaEl.className = "pack-area";
    extraActionEl = document.createElement("div");
    extraActionEl.className = "pack-action-slot";
    stage.append(extraAreaEl, extraActionEl);
    panel.appendChild(stage);
    extraStripEl = document.createElement("div");
    extraStripEl.className = "pulled-strip";
    extraStripEl.setAttribute("aria-label", "Cards pulled from this pack");
    panel.appendChild(extraStripEl);
  }
  return panel;
}
