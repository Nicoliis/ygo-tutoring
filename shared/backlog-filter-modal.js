/*
 * The Backlog filter window: one tab per card type, an "Include" checkbox per tab and, per tab, the values
 * that exist in the user's cards of that type. Edits go to a draft; nothing changes until Apply.
 *
 *   openBacklogFilterModal({ getCards, onApply })
 *
 * A tenth tab, "Synergy", is cross-type: it lists the names quoted in the cards' effect texts (backlog-synergy.js).
 * Value chips and the Monster include boxes show how many distinct cards have them (fixed counts, not live).
 *
 * Needs backlog-filter.js, backlog-synergy.js, modal.js (showModal) and, for filling in missing card details,
 * collection-backfill.js.
 */
const SYNERGY_TAB_ID = "synergy";


function openBacklogFilterModal({ getCards, onApply }) {
  const draft = JSON.parse(JSON.stringify(loadBacklogFilter()));
  const tabs = [...FILTER_GROUPS.map((g) => ({ id: g.id, label: g.label })), { id: SYNERGY_TAB_ID, label: "Synergy" }];
  const firstOn = FILTER_GROUPS.find((g) => filterIncludesOf(g.id).some((inc) => draft.types.includes(inc.id)));
  let activeTab = firstOn ? firstOn.id : draft.synergy.length > 0 ? SYNERGY_TAB_ID : FILTER_GROUPS[0].id;
  let synergyIndex = buildSynergyIndex(getCards());

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

  // "id" below is a tab id; its include boxes are filterIncludesOf(id) (Monster has two).
  function includeOn(includeId) {
    return draft.types.includes(includeId);
  }

  function setInclude(includeId, on) {
    const has = includeOn(includeId);
    if (on && !has) draft.types.push(includeId);
    if (!on && has) draft.types = draft.types.filter((t) => t !== includeId);
  }

  function included(id) {
    return filterIncludesOf(id).some((inc) => includeOn(inc.id));
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

  function getRange(id, valueGroup) {
    const range = draft.values[id] && draft.values[id][valueGroup];
    return range && typeof range === "object" ? range : { min: null, max: null };
  }

  function setRange(id, valueGroup, which, text) {
    const parsed = text.trim() === "" ? null : Number(text);
    const value = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    const range = { ...getRange(id, valueGroup), [which]: value };
    if (!draft.values[id]) draft.values[id] = {};
    if (range.min === null && range.max === null) delete draft.values[id][valueGroup];
    else draft.values[id][valueGroup] = range;
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
    const synergyBtn = tabButtons[SYNERGY_TAB_ID];
    const synergyOn = draft.synergy.length > 0;
    synergyBtn.textContent = `${synergyOn ? "● " : ""}Synergy (${synergyIndex.entries.length})`;
    synergyBtn.classList.toggle("bf-tab-on", synergyOn);
    synergyBtn.setAttribute(
      "aria-label",
      `Synergy, ${synergyIndex.entries.length} names${synergyOn ? `, ${draft.synergy.length} selected` : ""}`
    );
  }

  /* The cross-type tab: a search box and one checkbox per quoted name, highest card count first. */
  function renderSynergyPanel() {
    const el = panelEls[SYNERGY_TAB_ID];
    el.innerHTML = "";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "search-input bf-synergy-search";
    search.placeholder = "Search synergy names";
    search.setAttribute("aria-label", "Search synergy names");
    const list = document.createElement("div");
    list.className = "bf-synergy-list";
    el.append(search, list);

    function renderList() {
      const known = new Set(synergyIndex.entries.map((e) => e.key));
      // a saved name no card mentions any more stays listed (count 0) so it can still be unticked
      const stale = draft.synergy.filter((key) => !known.has(key)).map((key) => ({ key, label: key, count: 0 }));
      const needle = synergyKey(search.value);
      const rows = [...synergyIndex.entries, ...stale].filter((e) => !needle || e.key.includes(needle));
      list.innerHTML = "";
      if (rows.length === 0) {
        const empty = document.createElement("p");
        empty.className = "bf-empty";
        empty.textContent = needle ? "No synergy names match your search." : "No quoted names found in your cards yet.";
        list.appendChild(empty);
        return;
      }
      rows.forEach((entry) => {
        const chip = document.createElement("label");
        chip.className = "bf-chip";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = draft.synergy.includes(entry.key);
        box.addEventListener("change", () => {
          draft.synergy = draft.synergy.filter((k) => k !== entry.key);
          if (box.checked) draft.synergy.push(entry.key);
          refreshTabLabels();
        });
        const count = document.createElement("span");
        count.className = "bf-chip-count";
        count.textContent = `(${entry.count})`;
        chip.append(box, document.createTextNode(` ${entry.label} `), count);
        list.appendChild(chip);
      });
    }
    search.addEventListener("input", renderList);
    renderList();
  }

  function renderPanel(id) {
    if (id === SYNERGY_TAB_ID) {
      renderSynergyPanel();
      return;
    }
    const group = filterGroupDef(id);
    const el = panelEls[id];
    el.innerHTML = "";
    const counts = valueCounts(getCards(), id);

    const includeRow = document.createElement("div");
    includeRow.className = "bf-includes";
    const includeBoxes = [];
    filterIncludesOf(id).forEach((inc) => {
      const includeLabel = document.createElement("label");
      includeLabel.className = "bf-include";
      const includeBox = document.createElement("input");
      includeBox.type = "checkbox";
      includeBox.checked = includeOn(inc.id);
      includeBox.addEventListener("change", () => {
        setInclude(inc.id, includeBox.checked);
        valuesBox.classList.toggle("bf-dim", !included(id));
        refreshTabLabels();
      });
      const incCount = counts[inc.id] === undefined ? "" : ` (${counts[inc.id]})`;
      includeLabel.append(includeBox, document.createTextNode(` ${inc.label}${incCount}`));
      includeRow.appendChild(includeLabel);
      includeBoxes.push({ inc, box: includeBox });
    });
    el.appendChild(includeRow);

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
      if (isRangeGroup(valueGroup)) {
        const present = options[valueGroup] || { min: null, max: null };
        if (present.min === null) return; // no card of this tab has this stat
        const fieldset = document.createElement("fieldset");
        fieldset.className = "bf-group bf-range";
        const legend = document.createElement("legend");
        legend.textContent = `${FILTER_VALUE_LABELS[valueGroup]} (${present.min} – ${present.max})`;
        fieldset.appendChild(legend);
        const current = getRange(id, valueGroup);
        ["min", "max"].forEach((which) => {
          const label = document.createElement("label");
          label.className = "bf-range-field";
          const input = document.createElement("input");
          input.type = "number";
          input.min = "0";
          input.step = "50";
          input.placeholder = String(which === "min" ? present.min : present.max);
          input.value = current[which] === null ? "" : String(current[which]);
          input.setAttribute("aria-label", `${FILTER_VALUE_LABELS[valueGroup]} ${which === "min" ? "minimum" : "maximum"}`);
          input.addEventListener("input", () => {
            setRange(id, valueGroup, which, input.value);
            if (input.value.trim() !== "" && !included(id)) {
              includeBoxes.forEach(({ inc, box: includeBox }) => {
                setInclude(inc.id, true);
                includeBox.checked = true;
              });
              valuesBox.classList.remove("bf-dim");
              refreshTabLabels();
            }
          });
          label.append(document.createTextNode(which === "min" ? "From " : "To "), input);
          fieldset.appendChild(label);
        });
        valuesBox.appendChild(fieldset);
        return;
      }
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
            // picking a value means the tab is wanted: tick its include box(es) so the selection is never silently ignored
            includeBoxes.forEach(({ inc, box: includeBox }) => {
              setInclude(inc.id, true);
              includeBox.checked = true;
            });
            valuesBox.classList.remove("bf-dim");
            refreshTabLabels();
          }
        });
        const count = document.createElement("span");
        count.className = "bf-chip-count";
        count.textContent = `(${(counts[valueGroup] || {})[String(value)] || 0})`;
        chip.append(box, document.createTextNode(` ${value} `), count);
        fieldset.appendChild(chip);
      });
      valuesBox.appendChild(fieldset);
    });
  }

  function selectTab(id, focus) {
    activeTab = id;
    tabs.forEach((group) => {
      const selected = group.id === id;
      tabButtons[group.id].setAttribute("aria-selected", String(selected));
      tabButtons[group.id].tabIndex = selected ? 0 : -1;
      panelEls[group.id].hidden = !selected;
    });
    renderPanel(id);
    if (focus) tabButtons[id].focus();
  }

  tabs.forEach((group, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bf-tab";
    btn.id = `bf-tab-${group.id}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", `bf-panel-${group.id}`);
    btn.addEventListener("click", () => selectTab(group.id, false));
    btn.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      let target = null;
      if (e.key === "ArrowRight") target = index === last ? 0 : index + 1;
      else if (e.key === "ArrowLeft") target = index === 0 ? last : index - 1;
      else if (e.key === "Home") target = 0;
      else if (e.key === "End") target = last;
      if (target === null) return;
      e.preventDefault();
      selectTab(tabs[target].id, true);
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
  const missing = getCards().filter((card) => (typeof cardNeedsDetails === "function" ? cardNeedsDetails(card) : !card.race && !card.detailsTried));
  if (missing.length > 0 && typeof completeMissingCardDetails === "function") {
    note.hidden = false;
    completeMissingCardDetails(missing).then(() => {
      if (!document.body.contains(root)) return;
      note.hidden = true;
      synergyIndex = buildSynergyIndex(getCards()); // effect texts may have arrived
      refreshTabLabels();
      renderPanel(activeTab);
    });
  }
}
