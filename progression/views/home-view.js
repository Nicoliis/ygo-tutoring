/*
 * Progression screen (screen 1): the run's home, or the starting-set chooser for a run that has not started.
 * DOM only, no state and no rules.
 *
 *   renderHome(rootEl, model, handlers)
 *   model    = { started, summaryText,
 *                // started run:
 *                finished, stageHeading, phase ("not-started" | "in-progress" | "finished"), startCheck, completeCheck,
 *                hint, boosters: [{ name, state, label, current }], completed: [label], looseBoosterCount,
 *                // not started:
 *                chooserBoosters: [{ name, label }], chosenStart }
 *   handlers = { onStartBox(), onCompleteStage(), onChooseStart(name), onConfirmStart() }
 *
 * Needs views/booster-tile-view.js.
 */
function buildActionButton(label, check, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary";
  btn.textContent = label;
  btn.disabled = !check.ok;
  btn.title = check.reason;
  btn.addEventListener("click", onClick);
  return btn;
}

function buildLink(href, text, className = "btn btn-secondary") {
  const a = document.createElement("a");
  a.className = className;
  a.href = href;
  a.textContent = text;
  return a;
}

function buildBoosterList(heading, boosters, tileOptions) {
  const section = document.createElement("section");
  section.className = "panel";
  const h = document.createElement("h2");
  h.textContent = heading;
  section.appendChild(h);
  const rail = document.createElement("ol");
  rail.className = "booster-rail";
  boosters.forEach((b) => rail.appendChild(buildBoosterTile(b.name, tileOptions(b))));
  section.appendChild(rail);
  requestAnimationFrame(() => {
    const current = rail.querySelector('[aria-current="step"], .booster-tile-selected');
    const target = current && (current.closest(".booster-pack") || current);
    if (target) rail.scrollLeft = Math.max(0, target.offsetLeft - rail.clientWidth / MIDPOINT_DIVISOR + target.clientWidth / MIDPOINT_DIVISOR);
  });
  return section;
}

/* A run that has not started: the booster list as a chooser and a button to start at the chosen set. */
function renderStartChooser(rootEl, model, handlers) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const intro = document.createElement("h2");
  intro.textContent = "Choose where your run starts";
  panel.appendChild(intro);
  const hint = document.createElement("p");
  hint.className = "status";
  hint.textContent = "Pick the set you start at. Earlier sets are skipped, but you can still buy their boosters in the Store.";
  panel.appendChild(hint);
  const start = document.createElement("button");
  start.type = "button";
  start.className = "btn btn-primary";
  start.textContent = model.chosenStart ? `Start at ${model.chosenStart}` : "Start here";
  start.disabled = !model.chosenStart;
  start.addEventListener("click", () => handlers.onConfirmStart());
  panel.appendChild(start);
  rootEl.appendChild(panel);
  rootEl.appendChild(
    buildBoosterList("Boosters", model.chooserBoosters, (b) => ({
      state: "owned",
      label: `Start at ${b.label}`,
      selectable: true,
      selected: b.name === model.chosenStart,
      onSelect: handlers.onChooseStart,
    }))
  );
}

function renderHome(rootEl, model, handlers) {
  rootEl.innerHTML = "";
  if (!model.started) {
    renderStartChooser(rootEl, model, handlers);
    return;
  }

  const stagePanel = document.createElement("section");
  stagePanel.className = "panel";
  const summary = document.createElement("p");
  summary.className = "run-summary";
  summary.textContent = model.summaryText;
  stagePanel.appendChild(summary);

  if (model.finished) {
    const done = document.createElement("h2");
    done.textContent = "Run finished!";
    stagePanel.appendChild(done);
  } else {
    const heading = document.createElement("h2");
    heading.textContent = model.stageHeading;
    stagePanel.appendChild(heading);

    const actions = document.createElement("div");
    actions.className = "stage-actions";
    if (model.phase === "not-started") actions.appendChild(buildActionButton("Start box", model.startCheck, handlers.onStartBox));
    if (model.phase === "in-progress") actions.appendChild(buildLink("stage.html", "Continue pulling"));
    actions.appendChild(buildActionButton("Complete stage", model.completeCheck, handlers.onCompleteStage));
    actions.appendChild(buildLink("../workshop/deckbuilding.html", "Build decks"));
    stagePanel.appendChild(actions);

    const hint = document.createElement("p");
    hint.className = "status";
    hint.textContent = model.hint;
    stagePanel.appendChild(hint);
  }

  const nav = document.createElement("div");
  nav.className = "stage-actions";
  nav.appendChild(buildLink("stage.html", "Current stage pull"));
  nav.appendChild(buildLink("boosters.html", model.looseBoosterCount > 0 ? `Booster pull (${model.looseBoosterCount})` : "Booster pull"));
  stagePanel.appendChild(nav);
  rootEl.appendChild(stagePanel);

  rootEl.appendChild(
    buildBoosterList("Boosters", model.boosters, (b) => ({ state: b.state, label: b.label, current: b.current }))
  );

  if (model.completed.length > 0) {
    const done = document.createElement("section");
    done.className = "panel";
    const h = document.createElement("h2");
    h.textContent = `Completed (${model.completed.length})`;
    done.appendChild(h);
    const list = document.createElement("ol");
    list.className = "stage-list";
    model.completed.forEach((label) => {
      const li = document.createElement("li");
      li.textContent = label;
      list.appendChild(li);
    });
    done.appendChild(list);
    rootEl.appendChild(done);
  }
}
