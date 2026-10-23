/*
 * Completionist binder page view: set chooser, progress line, notes and status messages. DOM only, no state
 * and no rules. The shell is built once and then updated, so the binder container and the keyboard focus stay put.
 *
 *   const parts = renderCompletionistShell(rootEl, model, handlers)   -> { binderEl, ... }
 *   model    = { sets, chosenSet, status, progress | null, unmatched }
 *   handlers = { onChooseSet(name), onRetry() }
 *
 * Needs set-slots.js (UNMATCHED_NOTE_MIN).
 */
function buildCompletionistShell(rootEl, handlers) {
  const panel = document.createElement("section");
  panel.className = "panel completionist-panel";
  panel.innerHTML = "<h2>Completionist Binder</h2>";

  const head = document.createElement("div");
  head.className = "completionist-head";
  const chooserLabel = document.createElement("label");
  chooserLabel.className = "completionist-chooser";
  chooserLabel.append("Set ");
  const select = document.createElement("select");
  select.className = "completionist-select";
  select.setAttribute("aria-label", "Choose a set");
  select.addEventListener("change", () => handlers.onChooseSet(select.value));
  chooserLabel.appendChild(select);
  const progress = document.createElement("span");
  progress.className = "completionist-progress";
  progress.setAttribute("aria-live", "polite");
  head.append(chooserLabel, progress);

  const note = document.createElement("p");
  note.className = "completionist-note";
  const status = document.createElement("div");
  status.className = "completionist-status";
  status.setAttribute("aria-live", "polite");
  const binderEl = document.createElement("div");
  binderEl.className = "completionist-binder";

  panel.append(head, note, status, binderEl);
  rootEl.appendChild(panel);
  return { select, progress, note, status, binderEl, head };
}

function progressText(progress) {
  if (!progress) return "";
  if (progress.complete) return `Set complete · ${progress.total} of ${progress.total} owned`;
  return `${progress.owned} of ${progress.total} owned · ${progress.percent}%`;
}

function renderCompletionistShell(rootEl, model, handlers) {
  if (!rootEl._parts) rootEl._parts = buildCompletionistShell(rootEl, handlers);
  const parts = rootEl._parts;

  // chooser: rebuild the options only when the list of sets changed
  const signature = model.sets.join("|");
  if (parts.select.dataset.signature !== signature) {
    parts.select.innerHTML = "";
    model.sets.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      parts.select.appendChild(option);
    });
    parts.select.dataset.signature = signature;
  }
  if (model.chosenSet !== null) parts.select.value = model.chosenSet;
  parts.head.hidden = model.status === "no-sets";

  parts.progress.textContent = model.status === "ready" ? progressText(model.progress) : "";

  parts.note.hidden = !(model.status === "ready" && model.unmatched >= UNMATCHED_NOTE_MIN);
  parts.note.textContent = `${model.unmatched} of your copies have no recorded set or rarity, so they cannot colour any card here.`;

  parts.status.innerHTML = "";
  if (model.status === "loading") parts.status.textContent = `Loading ${model.chosenSet}…`;
  if (model.status === "no-sets") {
    parts.status.textContent = "No sets are available yet. Reach a booster in the Progression Run to unlock its set here.";
  }
  if (model.status === "error") {
    parts.status.append(`Couldn't load ${model.chosenSet} — reconnect and try again. `);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-secondary";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => handlers.onRetry());
    parts.status.appendChild(retry);
  }
  parts.binderEl.hidden = model.status !== "ready";
  return parts;
}
