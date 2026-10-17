let activeProfile = null;
let currentRun = null;
let busy = false;

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

function buildStageList(title, names) {
  const section = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = `${title} (${names.length})`;
  section.appendChild(heading);
  const list = document.createElement("ol");
  list.className = "stage-list";
  names.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = stageLabel(name);
    list.appendChild(li);
  });
  section.appendChild(list);
  return section;
}

function renderNoRules() {
  progressionRootEl.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = `<h2>No run rules</h2>
    <p>This profile has no run rules. Use the other tools freely:</p>
    <p><a href="../collection/index.html">Collection</a> · <a href="../draft/index.html">Booster Draft</a> · <a href="../tracker/index.html">Pack Puller</a></p>`;
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

function renderRun() {
  progressionRootEl.innerHTML = "";
  const run = currentRun;

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

    const open = canOpenBox(run);
    const complete = canCompleteStage(run);

    const actions = document.createElement("div");
    actions.className = "stage-actions";
    const deckLink = document.createElement("a");
    deckLink.className = "btn btn-secondary";
    deckLink.href = "../collection/index.html";
    deckLink.textContent = "Build decks";
    actions.append(
      buildActionButton(`Open box (${BOX_PACKS} packs)`, open, onOpenBox),
      buildActionButton("Complete stage", complete, onCompleteStage),
      deckLink
    );
    stagePanel.appendChild(actions);

    const hint = document.createElement("p");
    hint.className = "status";
    hint.textContent = open.ok ? complete.reason : open.reason;
    stagePanel.appendChild(hint);
  }
  progressionRootEl.appendChild(stagePanel);

  const overview = document.createElement("section");
  overview.className = "panel";
  overview.appendChild(buildStageList("Completed", run.completed));
  if (run.current !== null) overview.appendChild(buildStageList("Current", [run.current]));
  overview.appendChild(buildStageList("Remaining", remainingStages(run, MAINLINE_BOOSTERS)));
  progressionRootEl.appendChild(overview);
}
