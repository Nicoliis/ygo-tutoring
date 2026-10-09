(() => {
  "use strict";

  const STORAGE_KEY = "ygoCollection";

  const createTrackerForm = document.getElementById("createTrackerForm");
  const trackerNameInput = document.getElementById("trackerNameInput");
  const trackersListEl = document.getElementById("trackersList");

  const setPickerToggle = document.getElementById("setPickerToggle");
  const setPickerBody = document.getElementById("setPickerBody");
  const setSearchInput = document.getElementById("setSearchInput");
  const setResultsListEl = document.getElementById("setResultsList");
  const selectedSetBadgeEl = document.getElementById("selectedSetBadge");

  const modalRootEl = document.getElementById("modalRoot");

  const API_BASE = "https://db.ygoprodeck.com/api/v7/";
  const SETS_URL = API_BASE + "cardsets.php";
  const SET_CARDS_URL = API_BASE + "cardinfo.php";
  const CARDS_PER_PACK = 9;
  const MAX_SET_RESULTS = 200;

  let idCounter = 0;
  const expandedTrackers = new Set();

  // ---------- set-pack-simulator session state (never persisted) ----------
  let allSetsCache = null;
  const setCardPoolCache = new Map();
  let selectedSetName = null;
  let isFetchingSets = false;
  let isFetchingSetPool = false;
  let setPickerOpen = false;

  // ---------- booster pull review session state (never persisted) ----------
  const pendingPulls = new Map(); // trackerId -> { setName, packCount, packs }

  let collection = loadCollection();

  function nextId(prefix) {
    idCounter += 1;
    return `${prefix}${Date.now()}_${idCounter}`;
  }

  // ---------- persistence (shared blob with collection.js) ----------

  function loadCollection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { cards: [], engines: [], decks: [], trackers: [] };
      const parsed = JSON.parse(raw);
      return {
        cards: Array.isArray(parsed.cards) ? parsed.cards : [],
        engines: Array.isArray(parsed.engines) ? parsed.engines : [],
        decks: Array.isArray(parsed.decks) ? parsed.decks : [],
        trackers: Array.isArray(parsed.trackers) ? parsed.trackers : [],
      };
    } catch (err) {
      console.warn("Could not read saved collection:", err);
      return { cards: [], engines: [], decks: [], trackers: [] };
    }
  }

  function saveCollection() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    } catch (err) {
      console.warn("Could not save collection:", err);
    }
  }

  // ---------- lookups ----------

  function findTracker(trackerId) {
    return collection.trackers.find((t) => t.id === trackerId) || null;
  }

  // ---------- shared backlog merge rule (mirrors collection.js exactly) ----------

  function addOrIncrementCard(name, quantity) {
    const trimmed = (name || "").trim();
    if (!trimmed) return false;
    const n = Math.floor(Number(quantity));
    const amount = Number.isFinite(n) && n >= 1 ? n : 1;
    const existing = collection.cards.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      existing.quantityOwned += amount;
    } else {
      collection.cards.push({ id: nextId("card"), name: trimmed, quantityOwned: amount });
    }
    return true;
  }

  // ---------- shared modal helper (independent copy; mirrors collection.js) ----------

  function showModal({ title, bodyHtml, buttons }) {
    const previouslyFocused = document.activeElement;

    modalRootEl.hidden = false;
    modalRootEl.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <h2 id="modalTitle">${escapeHtml(title)}</h2>
          <div class="modal-body">${bodyHtml}</div>
          <div class="modal-actions"></div>
        </div>
      </div>
    `;

    const backdrop = modalRootEl.querySelector(".modal-backdrop");
    const dialog = modalRootEl.querySelector(".modal-dialog");
    const actionsEl = modalRootEl.querySelector(".modal-actions");

    function getFocusable() {
      return Array.from(
        dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function closeModal() {
      modalRootEl.hidden = true;
      modalRootEl.innerHTML = "";
      document.removeEventListener("keydown", onKeydown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    }

    buttons.forEach((btn) => {
      const buttonEl = document.createElement("button");
      buttonEl.type = "button";
      buttonEl.className = "btn " + (btn.primary ? "btn-primary" : "btn-secondary");
      buttonEl.textContent = btn.label;
      buttonEl.addEventListener("click", (e) => {
        e.stopPropagation();
        closeModal();
        if (btn.onClick) btn.onClick();
      });
      actionsEl.appendChild(buttonEl);
    });

    backdrop.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target === backdrop) closeModal();
    });

    document.addEventListener("keydown", onKeydown, true);

    const focusable = getFocusable();
    if (focusable.length > 0) focusable[0].focus();
  }

  // ---------- set pack simulator: fetch + cache ----------

  function fetchAllSets() {
    if (allSetsCache) return Promise.resolve(allSetsCache);
    isFetchingSets = true;
    renderSetPicker();
    return fetch(SETS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const mapped = list
          .filter((entry) => entry && entry.set_name)
          .map((entry) => ({ name: entry.set_name, releaseDate: entry.tcg_date || null }));
        mapped.sort((a, b) => {
          if (!a.releaseDate && !b.releaseDate) return 0;
          if (!a.releaseDate) return 1;
          if (!b.releaseDate) return -1;
          return a.releaseDate.localeCompare(b.releaseDate);
        });
        allSetsCache = mapped;
        isFetchingSets = false;
        renderSetPicker();
        return allSetsCache;
      })
      .catch((err) => {
        console.warn("Could not load card sets:", err);
        isFetchingSets = false;
        renderSetPicker();
        alert("Couldn't load the set list — check your connection and try again.");
        throw err;
      });
  }

  function getWeightForRarity(rarity) {
    const r = (rarity || "").toLowerCase();
    if (r.includes("secret") || r.includes("ultimate") || r.includes("ghost") || r.includes("ultra")) {
      return 1;
    }
    if (r.includes("super")) return 1.5;
    if (r.includes("rare")) return 3;
    return 10; // common or unrecognized/missing — see data-model.md
  }

  function extractCardDataFromApiResult(apiCard) {
    const images = apiCard.card_images && apiCard.card_images[0];
    const isMonster = typeof apiCard.type === "string" && apiCard.type.includes("Monster");
    return {
      apiId: apiCard.id,
      type: apiCard.type || null,
      imageSmall: images ? images.image_url_small : null,
      imageFull: images ? images.image_url : null,
      level: isMonster && typeof apiCard.level === "number" ? apiCard.level : null,
      atk: isMonster && typeof apiCard.atk === "number" ? apiCard.atk : null,
      def: isMonster && typeof apiCard.def === "number" ? apiCard.def : null,
    };
  }

  function fetchSetCardPool(setName) {
    if (setCardPoolCache.has(setName)) return Promise.resolve(setCardPoolCache.get(setName));
    isFetchingSetPool = true;
    renderTrackers();
    const url = `${SET_CARDS_URL}?cardset=${encodeURIComponent(setName)}`;
    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        const cards = Array.isArray(data.data) ? data.data : [];
        const pool = cards.map((card) => {
          const sets = Array.isArray(card.card_sets) ? card.card_sets : [];
          const match = sets.find((s) => s.set_name === setName);
          return {
            name: card.name,
            weight: getWeightForRarity(match ? match.set_rarity : null),
            ...extractCardDataFromApiResult(card),
          };
        });
        setCardPoolCache.set(setName, pool);
        isFetchingSetPool = false;
        renderTrackers();
        return pool;
      })
      .catch((err) => {
        console.warn("Could not load set card pool:", err);
        isFetchingSetPool = false;
        renderTrackers();
        alert("Couldn't load that set's cards — check your connection and try again.");
        throw err;
      });
  }

  // ---------- set pack simulator: weighted draw ----------

  function weightedRandomPick(pool) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let r = Math.random() * total;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) return entry;
    }
    return pool[pool.length - 1];
  }

  /**
   * Returns a promise resolving to an array of packs, one entry per requested pack,
   * each itself an array of CARDS_PER_PACK rich card objects (name plus whatever
   * database detail the pool carries). Kept as one pack = one array (rather than a
   * single flat list) so each pack can later be logged as its own Pull — packsOpened
   * is derived as pulls.length (data-model.md), so one simulated pull covering N packs
   * must become N separate Pull entries, exactly like N manual pulls would, or
   * packsOpened would silently undercount.
   */
  function drawSimulatedPull(setName, packCountInput) {
    const packCount = Math.floor(Number(packCountInput));
    if (!Number.isFinite(packCount) || packCount < 1) {
      alert("Enter a pack count of at least 1.");
      return Promise.resolve(null);
    }
    return fetchSetCardPool(setName).then((pool) => {
      if (!pool || pool.length === 0) {
        alert("That set has no cards to draw from.");
        return null;
      }
      const packs = [];
      for (let p = 0; p < packCount; p++) {
        const pack = [];
        for (let i = 0; i < CARDS_PER_PACK; i++) {
          pack.push(weightedRandomPick(pool));
        }
        packs.push(pack);
      }
      return packs;
    });
  }

  // ---------- booster pull review ----------

  function startPendingPull(trackerId, setName, packCountInput) {
    drawSimulatedPull(setName, packCountInput)
      .then((packs) => {
        if (!packs) return;
        const packCount = Math.floor(Number(packCountInput));
        pendingPulls.set(trackerId, { setName, packCount, packs });
        renderTrackers();
      })
      .catch(() => {});
  }

  function savePendingPull(trackerId) {
    const pending = pendingPulls.get(trackerId);
    if (!pending) return;
    pending.packs.forEach((pack) => {
      logPull(trackerId, pack.map((c) => c.name).join("\n"));
    });
    pendingPulls.delete(trackerId);
    renderTrackers();
  }

  function discardPendingPull(trackerId) {
    if (!pendingPulls.has(trackerId)) return;
    pendingPulls.delete(trackerId);
    renderTrackers();
  }

  function reattemptPendingPull(trackerId) {
    const pending = pendingPulls.get(trackerId);
    if (!pending) return;
    startPendingPull(trackerId, pending.setName, pending.packCount);
  }

  // ---------- Tracker CRUD ----------

  function createTracker(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      alert("Enter a tracker name.");
      return false;
    }
    collection.trackers.push({ id: nextId("tracker"), name: trimmed, checklist: [], pulls: [] });
    saveCollection();
    return true;
  }

  function updateTracker(trackerId, changes) {
    const tracker = findTracker(trackerId);
    if (!tracker) return false;
    if (changes.name !== undefined) {
      const trimmed = (changes.name || "").trim();
      if (!trimmed) {
        alert("Enter a tracker name.");
        return false;
      }
      tracker.name = trimmed;
    }
    saveCollection();
    return true;
  }

  function deleteTracker(trackerId) {
    const tracker = findTracker(trackerId);
    if (!tracker) return;

    showModal({
      title: "Delete tracker?",
      bodyHtml: `<p>${escapeHtml(
        `Delete tracker "${tracker.name}"? This will not remove any cards it already added to your backlog.`
      )}</p>`,
      buttons: [
        { label: "Cancel" },
        {
          label: "Delete",
          primary: true,
          onClick: () => {
            collection.trackers = collection.trackers.filter((t) => t.id !== trackerId);
            expandedTrackers.delete(trackerId);
            pendingPulls.delete(trackerId);
            saveCollection();
            renderTrackers();
          },
        },
      ],
    });
  }

  // ---------- Pulls ----------

  function logPull(trackerId, rawText) {
    const tracker = findTracker(trackerId);
    if (!tracker) return false;
    const lines = (rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      alert("Enter at least one card name (one per line) to log a pull.");
      return false;
    }
    lines.forEach((name) => addOrIncrementCard(name, 1));
    tracker.pulls.push({ id: nextId("pull"), cardNames: lines });
    saveCollection();
    return true;
  }

  // ---------- Checklist ----------

  function addChecklistEntry(trackerId, name) {
    const tracker = findTracker(trackerId);
    if (!tracker) return false;
    const trimmed = (name || "").trim();
    if (!trimmed) {
      alert("Enter a card name to add to the checklist.");
      return false;
    }
    const exists = tracker.checklist.some((n) => n.toLowerCase() === trimmed.toLowerCase());
    if (!exists) tracker.checklist.push(trimmed);
    saveCollection();
    return true;
  }

  function removeChecklistEntry(trackerId, name) {
    const tracker = findTracker(trackerId);
    if (!tracker) return;

    showModal({
      title: "Remove checklist entry?",
      bodyHtml: `<p>${escapeHtml(`Remove "${name}" from ${tracker.name}'s checklist?`)}</p>`,
      buttons: [
        { label: "Cancel" },
        {
          label: "Remove",
          primary: true,
          onClick: () => {
            tracker.checklist = tracker.checklist.filter((n) => n !== name);
            saveCollection();
            renderTrackers();
          },
        },
      ],
    });
  }

  // ---------- derived progress ----------

  function computeTrackerProgress(trackerId) {
    const tracker = findTracker(trackerId);
    if (!tracker) {
      return { packsOpened: 0, checklistTotal: 0, checklistCollectedCount: 0, outstandingChecklist: [] };
    }
    const collectedNames = new Set();
    tracker.pulls.forEach((pull) => {
      pull.cardNames.forEach((name) => collectedNames.add(name.toLowerCase()));
    });
    const checklistTotal = tracker.checklist.length;
    const checklistCollectedCount = tracker.checklist.filter((name) =>
      collectedNames.has(name.toLowerCase())
    ).length;
    const outstandingChecklist = tracker.checklist.filter(
      (name) => !collectedNames.has(name.toLowerCase())
    );
    return {
      packsOpened: tracker.pulls.length,
      checklistTotal,
      checklistCollectedCount,
      outstandingChecklist,
    };
  }

  // ---------- rendering ----------

  function openPulledCardDetailModal(card) {
    const imageHtml = card.imageFull
      ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
      : "";
    const detailLines = [];
    if (card.type) detailLines.push(`<div><strong>Type:</strong> ${escapeHtml(card.type)}</div>`);
    if (card.level != null) detailLines.push(`<div><strong>Level/Rank:</strong> ${card.level}</div>`);
    if (card.atk != null) detailLines.push(`<div><strong>ATK:</strong> ${card.atk}</div>`);
    if (card.def != null) detailLines.push(`<div><strong>DEF:</strong> ${card.def}</div>`);
    if (detailLines.length === 0) {
      detailLines.push(`<div>No further details available for this card.</div>`);
    }

    showModal({
      title: card.name,
      bodyHtml: `${imageHtml}${detailLines.join("")}`,
      buttons: [{ label: "Close", primary: true }],
    });
  }

  function renderMinicard(card) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "minicard";
    el.setAttribute("aria-label", card.name);
    if (card.imageSmall) {
      const img = document.createElement("img");
      img.src = card.imageSmall;
      img.alt = card.name;
      el.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.className = "minicard-noimg";
      span.textContent = card.name;
      el.appendChild(span);
    }
    el.addEventListener("click", () => openPulledCardDetailModal(card));
    return el;
  }

  function renderSetPicker() {
    setPickerToggle.setAttribute("aria-expanded", String(setPickerOpen));
    setPickerToggle.setAttribute("aria-label", setPickerOpen ? "Hide set picker" : "Show set picker");
    setPickerToggle.textContent = setPickerOpen ? "✕ Close" : "+ Pick a set";
    setPickerBody.classList.toggle("collapsed", !setPickerOpen);

    if (selectedSetName) {
      const entry = (allSetsCache || []).find((s) => s.name === selectedSetName);
      const dateLabel = entry && entry.releaseDate ? ` (released ${escapeHtml(entry.releaseDate)})` : "";
      selectedSetBadgeEl.hidden = false;
      selectedSetBadgeEl.innerHTML = `
        <span>Selected set: <strong>${escapeHtml(selectedSetName)}</strong>${dateLabel}</span>
        <button type="button" class="btn-toggle btn-change-set" aria-label="Change selected set">Change</button>
      `;
      selectedSetBadgeEl.querySelector(".btn-change-set").addEventListener("click", () => {
        setPickerOpen = true;
        renderSetPicker();
        setSearchInput.focus();
      });
    } else {
      selectedSetBadgeEl.hidden = true;
      selectedSetBadgeEl.innerHTML = "";
    }

    setResultsListEl.innerHTML = "";

    if (isFetchingSets) {
      setResultsListEl.innerHTML = '<p class="empty-msg">Loading sets&hellip;</p>';
      return;
    }

    if (!allSetsCache) {
      setResultsListEl.innerHTML = '<p class="empty-msg">Open this section to load the set list.</p>';
      return;
    }

    const filterText = setSearchInput.value.trim().toLowerCase();
    const filtered = filterText
      ? allSetsCache.filter((entry) => entry.name.toLowerCase().includes(filterText))
      : allSetsCache;

    if (filtered.length === 0) {
      setResultsListEl.innerHTML = '<p class="empty-msg">No sets match your search.</p>';
      return;
    }

    filtered.slice(0, MAX_SET_RESULTS).forEach((entry) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "set-result-row" + (entry.name === selectedSetName ? " selected" : "");
      row.setAttribute("aria-label", `Select set ${entry.name}${entry.releaseDate ? `, released ${entry.releaseDate}` : ""}`);
      row.innerHTML = `
        <span class="set-result-name">${escapeHtml(entry.name)}</span>
        <span class="set-result-date">${entry.releaseDate ? escapeHtml(entry.releaseDate) : ""}</span>
      `;
      row.addEventListener("click", () => {
        selectedSetName = entry.name;
        setPickerOpen = false;
        renderSetPicker();
        renderTrackers();
      });
      setResultsListEl.appendChild(row);
    });

    if (filtered.length > MAX_SET_RESULTS) {
      const hint = document.createElement("p");
      hint.className = "empty-msg";
      hint.textContent = `Showing first ${MAX_SET_RESULTS} of ${filtered.length} — type to narrow results.`;
      setResultsListEl.appendChild(hint);
    }
  }

  function renderTrackers() {
    trackersListEl.innerHTML = "";

    if (collection.trackers.length === 0) {
      trackersListEl.innerHTML = '<p class="empty-msg">No trackers yet. Create one above.</p>';
      return;
    }

    collection.trackers.forEach((tracker) => {
      const progress = computeTrackerProgress(tracker.id);
      const expanded = expandedTrackers.has(tracker.id);
      const hasChecklist = tracker.checklist.length > 0;
      const pending = pendingPulls.get(tracker.id) || null;
      const simulateDisabled = !selectedSetName || isFetchingSetPool || !!pending;

      const el = document.createElement("div");
      el.className = "tracker-card";
      el.innerHTML = `
        <div class="tracker-header">
          <div class="header-main">
            <input type="text" class="tracker-name-input" value="${escapeHtml(tracker.name)}" aria-label="Tracker name">
            <span class="item-count-badge">${progress.packsOpened} pack(s) opened</span>
            ${hasChecklist ? `<span class="item-count-badge">${progress.checklistCollectedCount} of ${progress.checklistTotal} collected</span>` : ""}
          </div>
          <div class="header-actions">
            <button type="button" class="btn btn-secondary btn-delete-tracker">Delete</button>
          </div>
        </div>

        <div class="pull-logger">
          <textarea class="pull-input" rows="3" placeholder="One card name per line&#10;(what you pulled from this pack)" aria-label="Cards pulled from this pack, one per line"></textarea>
          <button type="button" class="btn btn-primary btn-log-pull">Log pull</button>
        </div>

        <div class="simulate-pull">
          <input type="number" min="1" value="${pending ? pending.packCount : 1}" class="simulate-pack-count" aria-label="Number of packs to simulate" ${pending ? "disabled" : ""}>
          <button type="button" class="btn btn-secondary btn-simulate-pull" ${simulateDisabled ? "disabled" : ""}>${isFetchingSetPool ? "Loading…" : "Simulate pull"}</button>
          <span class="simulate-hint">${pending ? `Resolve the pending pull below first` : selectedSetName ? `from ${escapeHtml(selectedSetName)}` : "Pick a set above first"}</span>
        </div>

        ${pending ? `
        <div class="pending-pull-review">
          <h4>Pending pull: ${pending.packCount} pack(s) from ${escapeHtml(pending.setName)}</h4>
          <div class="minicard-list"></div>
          <div class="pending-pull-actions">
            <button type="button" class="btn btn-primary btn-save-pull">Save</button>
            <button type="button" class="btn btn-secondary btn-reattempt-pull">Reattempt</button>
            <button type="button" class="btn btn-secondary btn-discard-pull">Discard</button>
          </div>
        </div>` : ""}

        <div class="checklist-section${expanded ? "" : " collapsed"}">
          <button type="button" class="btn-toggle btn-toggle-checklist" aria-expanded="${expanded}" aria-label="${expanded ? "Hide" : "Show"} checklist for ${escapeHtml(tracker.name)}">${expanded ? "▾ Checklist" : "▸ Checklist"}</button>
          <div class="checklist-body">
            <div class="checklist-add-row">
              <input type="text" class="checklist-name-input" placeholder="Card name" aria-label="Add a card to ${escapeHtml(tracker.name)}'s checklist">
              <button type="button" class="btn btn-secondary btn-add-checklist">Add</button>
            </div>
            <ul class="checklist-entries"></ul>
            ${hasChecklist ? `<div class="outstanding"><h4>Outstanding</h4><ul class="outstanding-list"></ul></div>` : ""}
          </div>
        </div>
      `;

      el.querySelector(".tracker-name-input").addEventListener("change", (e) => {
        if (updateTracker(tracker.id, { name: e.target.value })) renderTrackers();
        else e.target.value = tracker.name;
      });

      el.querySelector(".btn-delete-tracker").addEventListener("click", () => {
        deleteTracker(tracker.id);
      });

      const pullInput = el.querySelector(".pull-input");
      el.querySelector(".btn-log-pull").addEventListener("click", () => {
        if (logPull(tracker.id, pullInput.value)) {
          renderTrackers();
        }
      });

      const simulateBtn = el.querySelector(".btn-simulate-pull");
      if (!simulateBtn.disabled) {
        const packCountInput = el.querySelector(".simulate-pack-count");
        simulateBtn.addEventListener("click", () => {
          startPendingPull(tracker.id, selectedSetName, packCountInput.value);
        });
      }

      if (pending) {
        const minicardListEl = el.querySelector(".minicard-list");
        const sortedPulledCards = pending.packs
          .flat()
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        sortedPulledCards.forEach((card) => {
          minicardListEl.appendChild(renderMinicard(card));
        });

        el.querySelector(".btn-save-pull").addEventListener("click", () => {
          savePendingPull(tracker.id);
        });
        el.querySelector(".btn-reattempt-pull").addEventListener("click", () => {
          reattemptPendingPull(tracker.id);
        });
        el.querySelector(".btn-discard-pull").addEventListener("click", () => {
          discardPendingPull(tracker.id);
        });
      }

      el.querySelector(".btn-toggle-checklist").addEventListener("click", () => {
        if (expandedTrackers.has(tracker.id)) expandedTrackers.delete(tracker.id);
        else expandedTrackers.add(tracker.id);
        renderTrackers();
      });

      const checklistNameInput = el.querySelector(".checklist-name-input");
      const addChecklistHandler = () => {
        if (addChecklistEntry(tracker.id, checklistNameInput.value)) {
          renderTrackers();
        }
      };
      el.querySelector(".btn-add-checklist").addEventListener("click", addChecklistHandler);
      checklistNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addChecklistHandler();
        }
      });

      const checklistEntriesEl = el.querySelector(".checklist-entries");
      tracker.checklist.forEach((name) => {
        const isCollected = !progress.outstandingChecklist.includes(name);
        const li = document.createElement("li");
        li.className = isCollected ? "checklist-collected" : "checklist-outstanding";
        const span = document.createElement("span");
        span.textContent = (isCollected ? "✓ " : "") + name;
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn-remove-checklist";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label", `Remove ${name} from ${tracker.name}'s checklist`);
        removeBtn.addEventListener("click", () => {
          removeChecklistEntry(tracker.id, name);
        });
        li.appendChild(span);
        li.appendChild(removeBtn);
        checklistEntriesEl.appendChild(li);
      });

      if (hasChecklist) {
        const outstandingListEl = el.querySelector(".outstanding-list");
        if (progress.outstandingChecklist.length === 0) {
          outstandingListEl.innerHTML = '<li class="empty-msg">None — fully collected!</li>';
        } else {
          progress.outstandingChecklist.forEach((name) => {
            const li = document.createElement("li");
            li.textContent = name;
            outstandingListEl.appendChild(li);
          });
        }
      }

      trackersListEl.appendChild(el);
    });
  }

  // ---------- event wiring ----------

  createTrackerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (createTracker(trackerNameInput.value)) {
      trackerNameInput.value = "";
      renderTrackers();
      trackerNameInput.focus();
    }
  });

  setPickerToggle.addEventListener("click", () => {
    setPickerOpen = !setPickerOpen;
    if (setPickerOpen && !allSetsCache && !isFetchingSets) {
      fetchAllSets().catch(() => {});
    }
    renderSetPicker();
  });

  setSearchInput.addEventListener("input", () => {
    renderSetPicker();
  });

  // ---------- utils ----------

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- init ----------

  renderSetPicker();
  renderTrackers();
})();
