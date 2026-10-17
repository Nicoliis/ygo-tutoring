/*
 * The Backlog filter window: one tab per card type, an "Include" checkbox per tab and, per tab, the values
 * that exist in the user's cards of that type. Edits go to a draft; nothing changes until Apply.
 *
 *   openBacklogFilterModal({ getCards, onApply })
 *
 * Needs backlog-filter.js, modal.js (showModal) and, for filling in missing card details, collection-backfill.js.
 */
function openBacklogFilterModal({ getCards, onApply }) {
  const draft = JSON.parse(JSON.stringify(loadBacklogFilter()));
  let activeTab = draft.types[0] || FILTER_GROUPS[0].id;

  showModal({
    title: "Filter backlog",
    bodyHtml: '<div id="bfRoot" class="bf-root"></div>',
    buttons: [
      { label: "Cancel" },
      {
        label: "Clear filter",
        onClick: () => {
          clearBacklogFilter();
          onApply();
        },
      },
      {
        label: "Apply",
        primary: true,
        onClick: () => {
          saveBacklogFilter(draft);
          onApply();
        },
      },
    ],
  });

  const root = document.getElementById("bfRoot");
  const tabList = document.createElement("div");
  tabList.className = "bf-tabs";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "Card types");
  const panels = document.createElement("div");
  panels.className = "bf-panels";
  const note = document.createElement("p");
  note.className = "bf-note";
  note.setAttribute("aria-live", "polite");
  note.hidden = true;
  note.textContent = "Loading card details…";
  root.append(tabList, panels, note);

  const tabButtons = {};
  const panelEls = {};

  function included(id) {
    return draft.types.includes(id);
  }

  function setIncluded(id, on) {
    const has = included(id);
    if (on && !has) draft.types.push(id);
    if (!on && has) draft.types = draft.types.filter((t) => t !== id);
  }

  function selectedValues(id, valueGroup) {
    return (draft.values[id] && draft.values[id][valueGroup]) || [];
  }

  function toggleValue(id, valueGroup, value, on) {
    if (!draft.values[id]) draft.values[id] = {};
    const current = selectedValues(id, valueGroup).filter((v) => String(v) !== String(value));
    if (on) current.push(value);
    if (current.length > 0) draft.values[id][valueGroup] = current;
    else delete draft.values[id][valueGroup];
  }

  function countCards(id) {
    return getCards().filter((card) => groupOf(card) === id).length;
  }

  function refreshTabLabels() {
    FILTER_GROUPS.forEach((group) => {
      const btn = tabButtons[group.id];
      const on = included(group.id);
      btn.textContent = `${on ? "● " : ""}${group.label} (${countCards(group.id)})`;
      btn.classList.toggle("bf-tab-on", on);
      btn.setAttribute("aria-label", `${group.label}, ${countCards(group.id)} cards${on ? ", included in the filter" : ""}`);
    });
  }

  function renderPanel(id) {
    const group = filterGroupDef(id);
    const el = panelEls[id];
    el.innerHTML = "";

    const includeLabel = document.createElement("label");
    includeLabel.className = "bf-include";
    const includeBox = document.createElement("input");
    includeBox.type = "checkbox";
    includeBox.checked = included(id);
    includeBox.addEventListener("change", () => {
      setIncluded(id, includeBox.checked);
      valuesBox.classList.toggle("bf-dim", !includeBox.checked);
      refreshTabLabels();
    });
    includeLabel.append(includeBox, document.createTextNode(` Include ${group.label} cards`));
    el.appendChild(includeLabel);

    const valuesBox = document.createElement("div");
    valuesBox.className = "bf-values" + (included(id) ? "" : " bf-dim");
    el.appendChild(valuesBox);

    if (countCards(id) === 0) {
      const empty = document.createElement("p");
      empty.className = "bf-empty";
      empty.textContent = `You have no ${group.label} cards.`;
      valuesBox.appendChild(empty);
      return;
    }

    const options = availableValues(getCards(), id);
    group.valueGroups.forEach((valueGroup) => {
      const values = options[valueGroup] || [];
      if (values.length === 0) return;
      const fieldset = document.createElement("fieldset");
      fieldset.className = "bf-group";
      const legend = document.createElement("legend");
      legend.textContent = FILTER_VALUE_LABELS[valueGroup];
      fieldset.appendChild(legend);
      values.forEach((value) => {
        const chip = document.createElement("label");
        chip.className = "bf-chip";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = selectedValues(id, valueGroup).some((v) => String(v) === String(value));
        box.addEventListener("change", () => {
          toggleValue(id, valueGroup, value, box.checked);
          if (box.checked && !included(id)) {
            // picking a value means the tab is wanted: tick it so the selection is never silently ignored
            setIncluded(id, true);
            includeBox.checked = true;
            valuesBox.classList.remove("bf-dim");
            refreshTabLabels();
          }
        });
        chip.append(box, document.createTextNode(` ${value}`));
        fieldset.appendChild(chip);
      });
      valuesBox.appendChild(fieldset);
    });
  }

  function selectTab(id, focus) {
    activeTab = id;
    FILTER_GROUPS.forEach((group) => {
      const selected = group.id === id;
      tabButtons[group.id].setAttribute("aria-selected", String(selected));
      tabButtons[group.id].tabIndex = selected ? 0 : -1;
      panelEls[group.id].hidden = !selected;
    });
    renderPanel(id);
    if (focus) tabButtons[id].focus();
  }

  FILTER_GROUPS.forEach((group, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bf-tab";
    btn.id = `bf-tab-${group.id}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", `bf-panel-${group.id}`);
    btn.addEventListener("click", () => selectTab(group.id, false));
    btn.addEventListener("keydown", (e) => {
      const last = FILTER_GROUPS.length - 1;
      let target = null;
      if (e.key === "ArrowRight") target = index === last ? 0 : index + 1;
      else if (e.key === "ArrowLeft") target = index === 0 ? last : index - 1;
      else if (e.key === "Home") target = 0;
      else if (e.key === "End") target = last;
      if (target === null) return;
      e.preventDefault();
      selectTab(FILTER_GROUPS[target].id, true);
    });
    tabList.appendChild(btn);
    tabButtons[group.id] = btn;

    const panel = document.createElement("div");
    panel.className = "bf-panel";
    panel.id = `bf-panel-${group.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", btn.id);
    panels.appendChild(panel);
    panelEls[group.id] = panel;
  });

  refreshTabLabels();
  selectTab(activeTab, false);

  // Old cards may lack attribute/race/level: complete them (batched, once per card), then refresh what is shown.
  const missing = getCards().filter((card) => !card.race && !card.detailsTried);
  if (missing.length > 0 && typeof completeMissingCardDetails === "function") {
    note.hidden = false;
    completeMissingCardDetails(missing).then(() => {
      if (!document.body.contains(root)) return;
      note.hidden = true;
      refreshTabLabels();
      renderPanel(activeTab);
    });
  }
}
