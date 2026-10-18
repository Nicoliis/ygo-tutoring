/*
 * Engines panel view: the list of engines with this card's count, add/remove buttons, a name search and the
 * new-engine form. DOM only, no state, no storage and no rules.
 *
 *   renderEnginesPanel(containerEl, model, handlers)
 *   model    = { cardName, engines: [{ id, name, count, canAdd, addReason }], notes: [string], newEngineEnabled,
 *                announcement, focusKey }
 *   handlers = { onAdd(engineId), onRemove(engineId), onCreate(name) }
 *
 * Needs engine-rules.js (ENGINE_SEARCH_MIN_COUNT). `focusKey` ("add:<id>", "remove:<id>", "name") puts the keyboard
 * focus back on a control after the panel is redrawn.
 */
function buildEngineRow(engine, model, handlers) {
  const row = document.createElement("li");
  row.className = "card-engines-row";
  row.dataset.search = engine.name.toLowerCase();

  const name = document.createElement("span");
  name.className = "card-engines-name";
  name.textContent = engine.name;
  name.title = engine.name;

  const count = document.createElement("span");
  count.className = "card-engines-count";
  count.textContent = `×${engine.count}`;
  count.setAttribute("aria-label", `${engine.count} cop${engine.count === 1 ? "y" : "ies"} of ${model.cardName} in ${engine.name}`);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn-secondary card-engines-step";
  remove.textContent = "−";
  remove.dataset.focusKey = `remove:${engine.id}`;
  remove.disabled = engine.count === 0;
  remove.setAttribute("aria-label", `Remove one ${model.cardName} from ${engine.name}`);
  remove.addEventListener("click", () => handlers.onRemove(engine.id));

  const add = document.createElement("button");
  add.type = "button";
  add.className = "btn btn-secondary card-engines-step";
  add.textContent = "+";
  add.dataset.focusKey = `add:${engine.id}`;
  add.disabled = !engine.canAdd;
  add.setAttribute("aria-label", `Add ${model.cardName} to ${engine.name}`);
  if (!engine.canAdd) add.title = engine.addReason;
  add.addEventListener("click", () => handlers.onAdd(engine.id));

  row.append(name, count, remove, add);
  return row;
}

function renderEnginesPanel(containerEl, model, handlers) {
  containerEl.innerHTML = "";

  const heading = document.createElement("h3");
  heading.className = "card-engines-heading";
  heading.textContent = "Engines";
  containerEl.appendChild(heading);

  model.notes.forEach((text) => {
    const note = document.createElement("p");
    note.className = "card-engines-note";
    note.textContent = text;
    containerEl.appendChild(note);
  });

  let list = null;
  if (model.engines.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-engines-note";
    empty.textContent = "You have no engines yet. Create the first one below.";
    containerEl.appendChild(empty);
  } else {
    if (model.engines.length > ENGINE_SEARCH_MIN_COUNT) {
      const search = document.createElement("input");
      search.type = "search";
      search.className = "search-input card-engines-search";
      search.placeholder = "Search engines";
      search.setAttribute("aria-label", "Search engines by name");
      search.addEventListener("input", () => {
        const needle = search.value.trim().toLowerCase();
        list.querySelectorAll(".card-engines-row").forEach((row) => {
          row.hidden = needle !== "" && !row.dataset.search.includes(needle);
        });
      });
      containerEl.appendChild(search);
    }
    list = document.createElement("ul");
    list.className = "card-engines-list";
    model.engines.forEach((engine) => list.appendChild(buildEngineRow(engine, model, handlers)));
    containerEl.appendChild(list);
  }

  const form = document.createElement("form");
  form.className = "card-engines-form";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input card-engines-new-name";
  input.placeholder = "New engine name";
  input.setAttribute("aria-label", "New engine name");
  input.dataset.focusKey = "name";
  input.disabled = !model.newEngineEnabled;
  const create = document.createElement("button");
  create.type = "submit";
  create.className = "btn btn-primary";
  create.textContent = "Create & add";
  create.disabled = !model.newEngineEnabled;
  form.append(input, create);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handlers.onCreate(input.value);
  });
  containerEl.appendChild(form);

  const live = document.createElement("p");
  live.className = "card-engines-live";
  live.setAttribute("aria-live", "polite");
  live.textContent = model.announcement;
  containerEl.appendChild(live);

  if (model.focusKey) {
    const target = Array.from(containerEl.querySelectorAll("[data-focus-key]")).find((el) => el.dataset.focusKey === model.focusKey);
    if (target && !target.disabled) target.focus();
  }
}
