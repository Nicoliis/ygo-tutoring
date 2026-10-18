/*
 * Current Stage Pull screen: the opener (pack, action, the pack's strip) and the "Pulled this box" list that is
 * always visible below it. DOM only, no state and no rules.
 *
 *   renderStage(rootEl, model) -> { packAreaEl, packActionEl, pulledStripEl, pulledListEl } | null
 *   renderPulledList(listEl, cards, title)      redraws only the list: rarest first, identical cards grouped
 *   model = { stageName, state: "no-run" | "not-started" | "in-progress" | "finished" | "run-finished" }
 *
 * Needs pack-reveal.js (buildRevealedCardElement) and rarity.js (rarityRank).
 */
const PULLED_LIST_EMPTY_TEXT = "Nothing pulled yet. Click the card back to pull.";

/* Groups identical pulls (same card, same rarity) into { card, count }, rarest first, then by name. */
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

function buildPulledGrid(cards) {
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

/* Redraws one pulled list panel; the pack being revealed elsewhere on the page is never touched. */
function renderPulledList(listEl, cards, title = "Pulled this box") {
  listEl.innerHTML = "";
  const heading = document.createElement("h2");
  heading.textContent = `${title} (${cards.length})`;
  listEl.appendChild(heading);
  if (cards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = PULLED_LIST_EMPTY_TEXT;
    listEl.appendChild(empty);
    return;
  }
  listEl.appendChild(buildPulledGrid(cards));
}

function buildStageMessage(text, linkText) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const p = document.createElement("p");
  p.textContent = text + " ";
  const link = document.createElement("a");
  link.href = "index.html";
  link.textContent = linkText;
  p.appendChild(link);
  panel.appendChild(p);
  return panel;
}

function renderStage(rootEl, model) {
  rootEl.innerHTML = "";
  if (model.state === "run-finished") {
    rootEl.appendChild(buildStageMessage("The run is finished: there is no stage to pull.", "Back to the progression screen."));
    return null;
  }
  if (model.state === "no-run") {
    rootEl.appendChild(buildStageMessage("Your run has not started yet.", "Choose your starting set on the progression screen."));
    return null;
  }
  if (model.state === "not-started") {
    rootEl.appendChild(buildStageMessage(`The box for ${model.stageName} has not been started.`, "Start it on the progression screen."));
    return null;
  }

  const panel = document.createElement("section");
  panel.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = `Box: ${model.stageName}`;
  panel.appendChild(heading);

  const progress = document.createElement("div");
  progress.id = "boxProgress";
  progress.className = "box-progress";
  progress.innerHTML =
    '<span class="box-progress-text" aria-live="polite"></span>' +
    '<progress class="box-progress-bar" aria-label="Box progress"></progress>';
  panel.appendChild(progress);

  if (model.state === "finished") {
    const done = document.createElement("p");
    done.className = "status";
    done.textContent = "The box is finished. ";
    const link = document.createElement("a");
    link.href = "index.html";
    link.textContent = "Complete the stage on the progression screen.";
    done.appendChild(link);
    panel.appendChild(done);
  } else {
    const hint = document.createElement("p");
    hint.className = "status";
    hint.textContent = "Click the card back to pull the next card.";
    panel.appendChild(hint);
  }

  const stage = document.createElement("div");
  stage.className = "pack-stage";
  const packAreaEl = document.createElement("div");
  packAreaEl.className = "pack-area";
  const packActionEl = document.createElement("div");
  packActionEl.className = "pack-action-slot";
  stage.append(packAreaEl, packActionEl);
  panel.appendChild(stage);

  const stripHeading = document.createElement("h3");
  stripHeading.textContent = "Pulled this pack (click a card for details)";
  panel.appendChild(stripHeading);
  const pulledStripEl = document.createElement("div");
  pulledStripEl.className = "pulled-strip";
  pulledStripEl.setAttribute("aria-label", "Cards pulled from this pack");
  panel.appendChild(pulledStripEl);
  rootEl.appendChild(panel);

  const pulledListEl = document.createElement("section");
  pulledListEl.className = "panel";
  pulledListEl.id = "pulledList";
  rootEl.appendChild(pulledListEl);
  return { packAreaEl, packActionEl, pulledStripEl, pulledListEl };
}
