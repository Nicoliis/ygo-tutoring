(() => {
  "use strict";

  const STORAGE_KEY = "ygoCollection";
  const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
  const SEARCH_MIN_LEN = 3;
  const SEARCH_DEBOUNCE_MS = 400;

  const backlogListEl = document.getElementById("backlogList");
  const backlogSearchInput = document.getElementById("backlogSearchInput");

  const cardSearchInput = document.getElementById("cardSearchInput");
  const cardSearchStatus = document.getElementById("cardSearchStatus");
  const cardSearchResultsEl = document.getElementById("cardSearchResults");

  const engineForm = document.getElementById("engineForm");
  const engineFormToggle = document.getElementById("engineFormToggle");
  const engineNameInput = document.getElementById("engineNameInput");
  const engineListEl = document.getElementById("engineList");

  const deckCreateForm = document.getElementById("deckCreateForm");
  const newDeckNameInput = document.getElementById("newDeckNameInput");
  const deckListEl = document.getElementById("deckList");

  const modalRootEl = document.getElementById("modalRoot");

  let idCounter = 0;
  let backlogFilter = "";
  let searchTimer = null;
  let activeSearchController = null;
  let expandedCardId = null;

  const expandedEngines = new Set();
  const expandedDecks = new Set();
  const lookupAttempted = new Set(); // session-only: backlog card ids already backfilled (or tried)

  let collection = loadCollection();

  function nextId(prefix) {
    idCounter += 1;
    return `${prefix}${Date.now()}_${idCounter}`;
  }

  // ---------- persistence ----------

  function migrateDeckToSections(deck, engines) {
    if (deck.main || deck.extra) return;
    const main = [];
    (deck.items || []).forEach((item) => {
      if (item.type === "card") {
        const existing = main.find((m) => m.cardId === item.cardId);
        if (existing) existing.quantity += item.quantity;
        else main.push({ cardId: item.cardId, quantity: item.quantity });
      } else if (item.type === "engine") {
        const engine = engines.find((e) => e.id === item.engineId);
        if (engine) {
          engine.cards.forEach((ec) => {
            const qty = ec.quantity * item.copies;
            const existing = main.find((m) => m.cardId === ec.cardId);
            if (existing) existing.quantity += qty;
            else main.push({ cardId: ec.cardId, quantity: qty });
          });
        }
      }
    });
    deck.main = main;
    deck.extra = [];
    delete deck.items;
  }

  function loadCollection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { cards: [], engines: [], decks: [], trackers: [] };
      const parsed = JSON.parse(raw);
      const engines = Array.isArray(parsed.engines) ? parsed.engines : [];
      const decks = Array.isArray(parsed.decks) ? parsed.decks : [];
      decks.forEach((deck) => migrateDeckToSections(deck, engines));
      return {
        cards: Array.isArray(parsed.cards) ? parsed.cards : [],
        engines,
        decks,
        // Preserved, not read/rendered here: owned by tracker.js, which shares this blob.
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

  function findCard(cardId) {
    return collection.cards.find((c) => c.id === cardId) || null;
  }

  function findEngine(engineId) {
    return collection.engines.find((e) => e.id === engineId) || null;
  }

  function findDeck(deckId) {
    return collection.decks.find((d) => d.id === deckId) || null;
  }

  function parsePositiveInt(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  function parseNonNegativeInt(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  // ---------- card data lookup (search-and-select add flow + on-demand backfill) ----------

  function extractCardDataFromApiResult(apiCard) {
    const images = apiCard.card_images && apiCard.card_images[0];
    const isMonster = typeof apiCard.type === "string" && apiCard.type.includes("Monster");
    return {
      apiId: apiCard.id,
      type: apiCard.type || null,
      effect: apiCard.desc || null,
      imageSmall: images ? images.image_url_small : null,
      imageFull: images ? images.image_url : null,
      level: isMonster && typeof apiCard.level === "number" ? apiCard.level : null,
      atk: isMonster && typeof apiCard.atk === "number" ? apiCard.atk : null,
      def: isMonster && typeof apiCard.def === "number" ? apiCard.def : null,
    };
  }

  function addOrIncrementCardFromSearchResult(apiCard) {
    const trimmed = (apiCard.name || "").trim();
    if (!trimmed) return false;
    const extracted = extractCardDataFromApiResult(apiCard);
    const existing = collection.cards.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      existing.quantityOwned += 1;
      // Additive fill-in only: never overwrite a field the entry already has.
      Object.keys(extracted).forEach((key) => {
        if ((existing[key] === undefined || existing[key] === null) && extracted[key] !== null) {
          existing[key] = extracted[key];
        }
      });
    } else {
      collection.cards.push({
        id: nextId("card"),
        name: trimmed,
        quantityOwned: 1,
        ...extracted,
      });
    }
    saveCollection();
    return true;
  }

  function maybeBackfillCardDetails(card) {
    if (card.apiId || lookupAttempted.has(card.id)) return;
    lookupAttempted.add(card.id);
    const url = `${API_URL}?name=${encodeURIComponent(card.name)}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const match = data && Array.isArray(data.data) ? data.data[0] : null;
        if (!match) return;
        const extracted = extractCardDataFromApiResult(match);
        let changed = false;
        Object.keys(extracted).forEach((key) => {
          if ((card[key] === undefined || card[key] === null) && extracted[key] !== null) {
            card[key] = extracted[key];
            changed = true;
          }
        });
        if (changed) {
          saveCollection();
          renderAll();
        }
      })
      .catch(() => {});
  }

  // ---------- shared modal helper ----------

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
        // Run onClick before tearing down the dialog's DOM, so a button handler can still read
        // a live input's value (e.g. a rename field) instead of finding it already removed.
        if (btn.onClick) btn.onClick();
        closeModal();
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

  function openRenameModal(currentName, onSave) {
    const inputId = nextId("renameInput");
    showModal({
      title: "Rename",
      bodyHtml: `<input type="text" id="${inputId}" class="rename-input" value="${escapeHtml(currentName)}" aria-label="New name">`,
      buttons: [
        { label: "Cancel" },
        {
          label: "Save",
          primary: true,
          onClick: () => {
            const input = document.getElementById(inputId);
            onSave(input ? input.value : currentName);
          },
        },
      ],
    });
    const input = document.getElementById(inputId);
    if (input) {
      input.select();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave(input.value);
          modalRootEl.hidden = true;
          modalRootEl.innerHTML = "";
        }
      });
    }
  }

  // ---------- toast notifications ----------

  let toastContainerEl = null;

  function showToast(message, type = "info") {
    if (!toastContainerEl) {
      toastContainerEl = document.createElement("div");
      toastContainerEl.id = "toastContainer";
      toastContainerEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastContainerEl);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainerEl.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    setTimeout(() => {
      toast.classList.remove("toast-visible");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 400); // fallback, in case transitionend never fires
    }, 2600);
  }

  // ---------- OwnedCard mutation ----------

  function setCardQuantity(cardId, quantityInput) {
    const card = findCard(cardId);
    if (!card) return false;
    const n = parseNonNegativeInt(quantityInput);
    if (n === null) {
      showToast("Quantity must be zero or more.", "warning");
      return false;
    }
    card.quantityOwned = n;
    saveCollection();
    return true;
  }

  function removeCard(cardId) {
    const card = findCard(cardId);
    if (!card) return;

    const engineRefs = collection.engines.filter((e) =>
      e.cards.some((c) => c.cardId === cardId)
    ).length;
    const deckRefs = collection.decks.filter(
      (d) => d.main.some((it) => it.cardId === cardId) || d.extra.some((it) => it.cardId === cardId)
    ).length;

    let message = `Remove "${card.name}" from your backlog?`;
    if (engineRefs > 0 || deckRefs > 0) {
      message += ` It is used in ${engineRefs} engine(s) and ${deckRefs} deck(s) — those references will be removed too.`;
    }

    showModal({
      title: "Remove card?",
      bodyHtml: `${cardImageHtml(card)}<p>${escapeHtml(message)}</p>`,
      buttons: [
        { label: "Cancel" },
        {
          label: "Remove",
          primary: true,
          onClick: () => {
            collection.engines.forEach((e) => {
              e.cards = e.cards.filter((c) => c.cardId !== cardId);
            });
            collection.decks.forEach((d) => {
              d.main = d.main.filter((it) => it.cardId !== cardId);
              d.extra = d.extra.filter((it) => it.cardId !== cardId);
            });
            collection.cards = collection.cards.filter((c) => c.id !== cardId);
            if (expandedCardId === cardId) expandedCardId = null;
            saveCollection();
            renderAll();
            showToast(`Removed "${card.name}" from backlog.`, "success");
          },
        },
      ],
    });
  }

  // ---------- derived allocation ----------

  function computeAvailableForCard(cardId) {
    const card = findCard(cardId);
    if (!card) return 0;
    // Available always shows the owned max — it does not deplete as a card is used across
    // engines/deck sections. Each group independently caps itself (maxAllowedInGroup) instead.
    return card.quantityOwned;
  }

  // The standard trading-card-game limit: no single group (an engine, or one deck section) may
  // hold more copies of a card than are owned, or more than 3 — whichever is smaller.
  function maxAllowedInGroup(card) {
    return Math.max(0, Math.min(card.quantityOwned, 3));
  }

  // ---------- Engine CRUD ----------

  function validateCardEntries(cardEntries) {
    const seen = new Map();
    for (const entry of cardEntries || []) {
      const qty = parsePositiveInt(entry.quantity);
      if (qty === null) return null;
      if (!findCard(entry.cardId)) return null;
      seen.set(entry.cardId, qty);
    }
    return Array.from(seen.entries()).map(([cardId, quantity]) => ({ cardId, quantity }));
  }

  function createEngine(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      showToast("Enter an engine name.", "warning");
      return false;
    }
    collection.engines.push({ id: nextId("engine"), name: trimmed, cards: [] });
    saveCollection();
    return true;
  }

  function updateEngine(engineId, changes) {
    const engine = findEngine(engineId);
    if (!engine) return false;

    if (changes.name !== undefined) {
      const trimmed = (changes.name || "").trim();
      if (!trimmed) {
        showToast("Enter an engine name.", "warning");
        return false;
      }
      engine.name = trimmed;
    }

    if (changes.cards !== undefined) {
      const validated = validateCardEntries(changes.cards);
      if (!validated) {
        showToast("Could not update this engine's cards.", "error");
        return false;
      }
      engine.cards = validated;
    }

    saveCollection();
    return true;
  }

  function deleteEngine(engineId) {
    const engine = findEngine(engineId);
    if (!engine) return;

    showModal({
      title: "Delete engine?",
      bodyHtml: `<p>${escapeHtml(`Delete engine "${engine.name}"?`)}</p>`,
      buttons: [
        { label: "Cancel" },
        {
          label: "Delete",
          primary: true,
          onClick: () => {
            collection.engines = collection.engines.filter((e) => e.id !== engineId);
            expandedEngines.delete(engineId);
            saveCollection();
            renderAll();
            showToast(`Deleted engine "${engine.name}".`, "success");
          },
        },
      ],
    });
  }

  function addCardToEngine(engineId, cardId, quantity) {
    const engine = findEngine(engineId);
    const card = findCard(cardId);
    if (!engine || !card) return false;
    const qty = parsePositiveInt(quantity);
    if (qty === null) return false;
    const updatedCards = engine.cards.map((c) => ({ ...c }));
    const existing = updatedCards.find((c) => c.cardId === cardId);
    const currentQty = existing ? existing.quantity : 0;
    const allowed = Math.max(0, Math.min(qty, maxAllowedInGroup(card) - currentQty));
    if (allowed === 0) {
      showToast(`"${card.name}" is already at its limit (${maxAllowedInGroup(card)}) in "${engine.name}".`, "warning");
      return false;
    }
    if (existing) existing.quantity += allowed;
    else updatedCards.push({ cardId, quantity: allowed });
    return updateEngine(engineId, { cards: updatedCards });
  }

  function removeCardFromEngine(engineId, cardId, amount = 1) {
    const engine = findEngine(engineId);
    if (!engine) return;
    const entry = engine.cards.find((c) => c.cardId === cardId);
    if (!entry) return;
    const card = findCard(cardId);
    entry.quantity -= amount;
    if (entry.quantity <= 0) {
      engine.cards = engine.cards.filter((c) => c.cardId !== cardId);
    }
    saveCollection();
    renderAll();
    showToast(`Removed ${card ? card.name : "card"} from "${engine.name}".`, "success");
  }

  // ---------- Deck CRUD ----------

  function sectionLabel(section) {
    return section === "main" ? "Main Deck" : "Extra Deck";
  }

  function createDeck(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      showToast("Enter a deck name.", "warning");
      return false;
    }
    collection.decks.push({ id: nextId("deck"), name: trimmed, main: [], extra: [] });
    saveCollection();
    return true;
  }

  function updateDeck(deckId, changes) {
    const deck = findDeck(deckId);
    if (!deck) return false;
    if (changes.name !== undefined) {
      const trimmed = (changes.name || "").trim();
      if (!trimmed) {
        showToast("Enter a deck name.", "warning");
        return false;
      }
      deck.name = trimmed;
    }
    saveCollection();
    return true;
  }

  function deleteDeck(deckId) {
    const deck = findDeck(deckId);
    if (!deck) return;

    showModal({
      title: "Delete deck?",
      bodyHtml: `<p>${escapeHtml(`Delete deck "${deck.name}"?`)}</p>`,
      buttons: [
        { label: "Cancel" },
        {
          label: "Delete",
          primary: true,
          onClick: () => {
            collection.decks = collection.decks.filter((d) => d.id !== deckId);
            expandedDecks.delete(deckId);
            saveCollection();
            renderAll();
            showToast(`Deleted deck "${deck.name}".`, "success");
          },
        },
      ],
    });
  }

  function addCardToDeckSection(deckId, section, cardId, quantity) {
    const deck = findDeck(deckId);
    const card = findCard(cardId);
    if (!deck || (section !== "main" && section !== "extra") || !card) return false;
    const qty = parsePositiveInt(quantity);
    if (qty === null) return false;
    const list = deck[section];
    const existing = list.find((it) => it.cardId === cardId);
    const currentQty = existing ? existing.quantity : 0;
    const allowed = Math.max(0, Math.min(qty, maxAllowedInGroup(card) - currentQty));
    if (allowed === 0) {
      showToast(`"${card.name}" is already at its limit (${maxAllowedInGroup(card)}) in ${sectionLabel(section)}.`, "warning");
      return false;
    }
    if (existing) existing.quantity += allowed;
    else list.push({ cardId, quantity: allowed });
    saveCollection();
    return true;
  }

  function addEngineToDeckSection(deckId, section, engineId) {
    const deck = findDeck(deckId);
    const engine = findEngine(engineId);
    if (!deck || !engine || (section !== "main" && section !== "extra")) return false;
    if (engine.cards.length === 0) return false;
    const list = deck[section];
    let addedAny = false;
    engine.cards.forEach((ec) => {
      const card = findCard(ec.cardId);
      if (!card) return;
      const existing = list.find((it) => it.cardId === ec.cardId);
      const currentQty = existing ? existing.quantity : 0;
      const allowed = Math.max(0, Math.min(ec.quantity, maxAllowedInGroup(card) - currentQty));
      if (allowed === 0) return;
      if (existing) existing.quantity += allowed;
      else list.push({ cardId: ec.cardId, quantity: allowed });
      addedAny = true;
    });
    if (!addedAny) {
      showToast(`Every card in "${engine.name}" is already at its limit in ${sectionLabel(section)}.`, "warning");
      return false;
    }
    saveCollection();
    return true;
  }

  function removeCardFromDeckSection(deckId, section, cardId, amount = 1, options = {}) {
    const deck = findDeck(deckId);
    if (!deck || (section !== "main" && section !== "extra")) return;
    const entry = deck[section].find((it) => it.cardId === cardId);
    if (!entry) return;
    const card = findCard(cardId);
    entry.quantity -= amount;
    if (entry.quantity <= 0) {
      deck[section] = deck[section].filter((it) => it.cardId !== cardId);
    }
    saveCollection();
    renderAll();
    if (!options.silent) {
      showToast(`Removed ${card ? card.name : "card"} from ${sectionLabel(section)}.`, "success");
    }
  }

  // ---------- YDK export / import ----------

  function buildYdkText(deck) {
    const skipped = [];
    function flatten(list) {
      const lines = [];
      list.forEach((entry) => {
        const card = findCard(entry.cardId);
        if (!card || card.apiId == null) {
          if (card && !skipped.includes(card.name)) skipped.push(card.name);
          return;
        }
        for (let i = 0; i < entry.quantity; i++) lines.push(String(card.apiId));
      });
      return lines;
    }
    const mainLines = flatten(deck.main);
    const extraLines = flatten(deck.extra);
    const text = [
      "#created by YGO Proxy Sheet Builder",
      "#main",
      ...mainLines,
      "#extra",
      ...extraLines,
      "!side",
    ].join("\n");
    return { text, skipped };
  }

  function exportDeckAsYdk(deckId) {
    const deck = findDeck(deckId);
    if (!deck) return;
    if (deck.main.length === 0 && deck.extra.length === 0) {
      showToast("This deck has no cards to export.", "warning");
      return;
    }

    const { text, skipped } = buildYdkText(deck);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.name || "deck"}.ydk`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (skipped.length > 0) {
      showToast(
        `Exported, but these cards have no stored database id and were skipped: ${skipped.join(", ")}`,
        "warning"
      );
    } else {
      showToast(`Exported "${deck.name}" and copied it to the clipboard.`, "success");
    }
  }

  function parseYdkText(text) {
    const lines = (text || "").split(/\r?\n/).map((l) => l.trim());
    const result = { main: [], extra: [] };
    let currentSection = null;
    let sawAnySection = false;

    lines.forEach((line) => {
      if (!line) return;
      if (line.startsWith("#main")) {
        currentSection = "main";
        sawAnySection = true;
        return;
      }
      if (line.startsWith("#extra")) {
        currentSection = "extra";
        sawAnySection = true;
        return;
      }
      if (line.startsWith("!side")) {
        currentSection = null;
        return;
      }
      if (line.startsWith("#")) return;
      if (!currentSection) return;
      if (/^\d+$/.test(line)) {
        result[currentSection].push(line);
      }
    });

    if (!sawAnySection) return null;
    return result;
  }

  function importYdkIntoDeck(deckId, text) {
    const deck = findDeck(deckId);
    if (!deck) return;

    const parsed = parseYdkText(text);
    if (!parsed || (parsed.main.length === 0 && parsed.extra.length === 0)) {
      showToast("That doesn't look like valid YDK text — nothing was imported.", "error");
      return;
    }

    const skipped = [];
    function resolveSection(passcodes) {
      const list = [];
      passcodes.forEach((passcode) => {
        const card = collection.cards.find((c) => c.apiId != null && String(c.apiId) === passcode);
        if (!card) {
          if (!skipped.includes(passcode)) skipped.push(passcode);
          return;
        }
        const existing = list.find((it) => it.cardId === card.id);
        if (existing) existing.quantity += 1;
        else list.push({ cardId: card.id, quantity: 1 });
      });
      return list;
    }

    deck.main = resolveSection(parsed.main);
    deck.extra = resolveSection(parsed.extra);
    saveCollection();
    renderAll();

    if (skipped.length > 0) {
      showToast(
        `Imported. ${skipped.length} card id(s) were not found in your backlog and were skipped: ${skipped.join(", ")}`,
        "warning"
      );
    } else {
      showToast(`Imported "${deck.name}" successfully.`, "success");
    }
  }

  function openImportModal(deckId) {
    const textareaId = nextId("ydkText");
    const fileInputId = nextId("ydkFile");

    showModal({
      title: "Import deck (YDK)",
      bodyHtml: `
        <p>Choose a .ydk file, or paste YDK text below.</p>
        <input type="file" id="${fileInputId}" accept=".ydk,text/plain" aria-label="Choose a .ydk file">
        <textarea id="${textareaId}" rows="8" class="ydk-import-textarea" aria-label="YDK text to import" placeholder="#main&#10;...&#10;#extra&#10;..."></textarea>
      `,
      buttons: [
        { label: "Cancel" },
        {
          label: "Import",
          primary: true,
          onClick: () => {
            const textarea = document.getElementById(textareaId);
            importYdkIntoDeck(deckId, textarea ? textarea.value : "");
          },
        },
      ],
    });

    const fileInput = document.getElementById(fileInputId);
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const textarea = document.getElementById(textareaId);
          if (textarea) textarea.value = String(reader.result || "");
        };
        reader.readAsText(file);
      });
    }
  }

  // ---------- shared card tag rendering ----------

  function cardImageHtml(card) {
    return card.imageSmall
      ? `<img src="${card.imageSmall}" alt="${escapeHtml(card.name)}">`
      : "";
  }

  function typeColorClass(type) {
    if (!type) return "";
    const t = type.toLowerCase();
    if (t.includes("link")) return "type-color-link";
    if (t.includes("synchro")) return "type-color-synchro";
    if (t.includes("xyz")) return "type-color-xyz";
    if (t.includes("fusion")) return "type-color-fusion";
    if (t.includes("ritual")) return "type-color-ritual";
    if (t.includes("normal monster")) return "type-color-normal";
    if (t.includes("monster")) return "type-color-effect";
    if (t.includes("spell")) return "type-color-spell";
    if (t.includes("trap")) return "type-color-trap";
    return "";
  }

  function buildKeyDetailsHtml(card) {
    const nameLine = `<div class="card-tag-hover-name">${escapeHtml(card.name)}</div>`;
    if (!card.type) return nameLine;
    const isMonster = card.type.includes("Monster");
    let detail;
    if (isMonster) {
      const parts = [card.type];
      if (card.level != null) parts.push(`Level ${card.level}`);
      if (card.atk != null || card.def != null) {
        parts.push(`ATK ${card.atk != null ? card.atk : "?"} / DEF ${card.def != null ? card.def : "?"}`);
      }
      detail = parts.join(" · ");
    } else {
      detail = card.type;
    }
    return nameLine + `<div class="card-tag-hover-detail">${escapeHtml(detail)}</div>`;
  }

  function openCardDetailModal(card) {
    const imageHtml = card.imageFull
      ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
      : `<div class="card-tag-image-placeholder">No image available</div>`;
    const detailLines = [];
    if (card.type) detailLines.push(`<div><strong>Type:</strong> ${escapeHtml(card.type)}</div>`);
    if (card.level != null) detailLines.push(`<div><strong>Level/Rank:</strong> ${card.level}</div>`);
    if (card.atk != null) detailLines.push(`<div><strong>ATK:</strong> ${card.atk}</div>`);
    if (card.def != null) detailLines.push(`<div><strong>DEF:</strong> ${card.def}</div>`);
    if (detailLines.length === 0) {
      detailLines.push(`<div>No further details available for this card.</div>`);
    }
    const effectHtml = card.effect ? `<div class="card-effect">${escapeHtml(card.effect)}</div>` : "";

    showModal({
      title: card.name,
      bodyHtml: `${imageHtml}${detailLines.join("")}${effectHtml}`,
      buttons: [{ label: "Close", primary: true }],
    });
  }

  function renderCardTag(card, { draggable = false } = {}) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "card-tag";
    el.dataset.cardId = card.id;
    el.setAttribute("aria-label", card.name);

    if (draggable) {
      el.draggable = true;
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "copy";
      });
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "card-tag-name " + typeColorClass(card.type);
    nameSpan.textContent = card.name;
    el.appendChild(nameSpan);

    let hoverOverlay = null;

    function hideHoverOverlay() {
      if (hoverOverlay) {
        hoverOverlay.remove();
        hoverOverlay = null;
      }
    }

    function showHoverOverlay() {
      if (expandedCardId === card.id) return;
      maybeBackfillCardDetails(card);
      hideHoverOverlay();
      hoverOverlay = document.createElement("div");
      hoverOverlay.className = "card-tag-hover-overlay";
      hoverOverlay.innerHTML = buildKeyDetailsHtml(card);
      el.appendChild(hoverOverlay);
    }

    el.addEventListener("mouseenter", showHoverOverlay);
    el.addEventListener("mouseleave", hideHoverOverlay);
    el.addEventListener("focus", showHoverOverlay);
    el.addEventListener("blur", hideHoverOverlay);

    if (expandedCardId === card.id) {
      el.classList.add("tag-expanded");
      hideHoverOverlay();
      const imageOverlay = document.createElement("div");
      imageOverlay.className = "card-tag-image-overlay";
      const imageHtml = card.imageSmall
        ? `<img src="${card.imageSmall}" alt="${escapeHtml(card.name)}">`
        : `<div class="card-tag-image-placeholder">No image available</div>`;
      imageOverlay.innerHTML = imageHtml + `<div class="card-tag-image-details">${buildKeyDetailsHtml(card)}</div>`;
      el.appendChild(imageOverlay);
    }

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      maybeBackfillCardDetails(card);
      if (expandedCardId === card.id) {
        openCardDetailModal(card);
      } else {
        expandedCardId = card.id;
        renderAll();
      }
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });

    return el;
  }

  // ---------- shared bag drag/bin wiring ----------

  function wireAddDropZone(zoneEl, onCardDrop, onEngineDrop, onMoveDrop) {
    zoneEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      zoneEl.classList.add("drop-target-active");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("drop-target-active"));
    zoneEl.addEventListener("drop", (e) => {
      e.preventDefault();
      zoneEl.classList.remove("drop-target-active");

      if (onMoveDrop) {
        const moveRaw = e.dataTransfer.getData("application/x-deck-card-move");
        if (moveRaw) {
          try {
            onMoveDrop(JSON.parse(moveRaw));
          } catch (err) {
            // ignore malformed payload
          }
          return;
        }
      }

      if (onEngineDrop) {
        const engineRaw = e.dataTransfer.getData("application/x-engine-source");
        if (engineRaw) {
          try {
            onEngineDrop(JSON.parse(engineRaw));
          } catch (err) {
            // ignore malformed payload
          }
          return;
        }
      }

      const cardId = e.dataTransfer.getData("text/plain");
      if (cardId) onCardDrop(cardId);
    });
  }

  // Renders one physical copy of a card as a tile: the shared card-tag plus a small remove
  // control overlaid on its corner — used wherever a group (an engine, or a deck section) lists
  // its cards one tile per copy, no quantity multiplier.
  function renderCardTile(card, { onRemove, removeLabel, dragMovePayload }) {
    const wrapper = document.createElement("div");
    wrapper.className = "card-tag-row";

    const tag = renderCardTag(card, { draggable: !!dragMovePayload });
    if (dragMovePayload) {
      tag.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("application/x-deck-card-move", JSON.stringify(dragMovePayload));
      });
    }
    wrapper.appendChild(tag);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove-item";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", removeLabel);
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onRemove();
    });
    wrapper.appendChild(removeBtn);

    return wrapper;
  }

  // ---------- rendering ----------

  function renderAll() {
    renderBacklog();
    renderEngines();
    renderDecks();
  }

  function renderBacklog() {
    backlogListEl.innerHTML = "";

    if (collection.cards.length === 0) {
      backlogListEl.innerHTML = '<p class="empty-msg">No cards logged yet. Add one above.</p>';
      return;
    }

    const filterLower = backlogFilter.trim().toLowerCase();
    const filtered = collection.cards.filter(
      (c) => !filterLower || c.name.toLowerCase().includes(filterLower)
    );

    if (filtered.length === 0) {
      backlogListEl.innerHTML = '<p class="empty-msg">No cards match your search.</p>';
      return;
    }

    filtered.forEach((card) => {
      const available = computeAvailableForCard(card.id);
      const row = document.createElement("div");
      row.className = "backlog-row";

      row.appendChild(renderCardTag(card, { draggable: true }));

      const qtyStepper = document.createElement("div");
      qtyStepper.className = "backlog-qty-stepper";

      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.min = "0";
      qtyInput.className = "backlog-qty-input";
      qtyInput.value = String(card.quantityOwned);
      qtyInput.setAttribute("aria-label", `Owned quantity for ${card.name}`);
      qtyInput.addEventListener("change", (e) => {
        if (setCardQuantity(card.id, e.target.value)) renderAll();
        else e.target.value = String(card.quantityOwned);
      });
      qtyStepper.appendChild(qtyInput);

      const qtySteps = document.createElement("div");
      qtySteps.className = "backlog-qty-steps";

      const qtyUpBtn = document.createElement("button");
      qtyUpBtn.type = "button";
      qtyUpBtn.className = "backlog-qty-step backlog-qty-step-up";
      qtyUpBtn.textContent = "▲";
      qtyUpBtn.setAttribute("aria-label", `Increase owned quantity for ${card.name}`);
      qtyUpBtn.addEventListener("click", () => {
        if (setCardQuantity(card.id, card.quantityOwned + 1)) renderAll();
      });
      qtySteps.appendChild(qtyUpBtn);

      const qtyDownBtn = document.createElement("button");
      qtyDownBtn.type = "button";
      qtyDownBtn.className = "backlog-qty-step backlog-qty-step-down";
      qtyDownBtn.textContent = "▼";
      qtyDownBtn.setAttribute("aria-label", `Decrease owned quantity for ${card.name}`);
      qtyDownBtn.disabled = card.quantityOwned <= 0;
      qtyDownBtn.addEventListener("click", () => {
        if (card.quantityOwned > 0 && setCardQuantity(card.id, card.quantityOwned - 1)) renderAll();
      });
      qtySteps.appendChild(qtyDownBtn);

      qtyStepper.appendChild(qtySteps);
      row.appendChild(qtyStepper);
      /*
      const availableSpan = document.createElement("span");
      availableSpan.className = "backlog-available";
      availableSpan.textContent = `Owned: ${available}`;
      row.appendChild(availableSpan);
      */
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-secondary btn-remove-card";
      removeBtn.textContent = "X";
      removeBtn.setAttribute("aria-label", `Remove ${card.name} from backlog`);
      removeBtn.addEventListener("click", () => removeCard(card.id));
      row.appendChild(removeBtn);

      backlogListEl.appendChild(row);
    });
  }

  function setEngineFormOpen(open) {
    engineForm.hidden = !open;
    engineFormToggle.textContent = open ? "✕ Close" : "+ New engine";
    engineFormToggle.setAttribute("aria-expanded", String(open));
  }

  function renderEngines() {
    engineListEl.innerHTML = "";

    if (collection.engines.length === 0) {
      engineListEl.innerHTML = '<p class="empty-msg">No engines yet. Create one above.</p>';
      return;
    }

    collection.engines.forEach((engine) => {
      const expanded = expandedEngines.has(engine.id);
      const totalCopies = engine.cards.reduce((sum, ec) => sum + ec.quantity, 0);

      const el = document.createElement("div");
      el.className = "engine-card bag" + (expanded ? " expanded" : " collapsed");
      el.draggable = true;
      el.innerHTML = `
        <div class="bag-header">
          <span class="bag-toggle-icon" aria-hidden="true">${expanded ? "▾" : "▸"}</span>
          <h3 class="bag-name">${escapeHtml(engine.name)}</h3>
          ${expanded ? `<span class="item-count-badge">${engine.cards.length} card type(s), ${totalCopies} total</span>` : ""}
          <div class="header-actions">
            <button type="button" class="btn btn-secondary btn-rename-engine">Rename</button>
            <button type="button" class="btn btn-secondary btn-delete-engine">Delete</button>
          </div>
        </div>
        ${
          expanded
            ? `<div class="bag-body">
                 <div class="engine-card-contents card-tag-list"></div>
               </div>`
            : ""
        }
      `;

      el.setAttribute(
        "aria-label",
        `${engine.name} engine, ${expanded ? "expanded" : "collapsed"}, ${engine.cards.length} card type(s)`
      );

      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("application/x-engine-source", JSON.stringify({ engineId: engine.id }));
        e.dataTransfer.effectAllowed = "copy";
      });

      const headerEl = el.querySelector(".bag-header");
      headerEl.addEventListener("click", (e) => {
        if (e.target.closest(".header-actions")) return;
        if (expandedEngines.has(engine.id)) expandedEngines.delete(engine.id);
        else expandedEngines.add(engine.id);
        renderEngines();
      });
      headerEl.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".header-actions")) {
          e.preventDefault();
          headerEl.click();
        }
      });
      headerEl.tabIndex = 0;
      headerEl.setAttribute("role", "button");
      headerEl.setAttribute("aria-expanded", String(expanded));

      wireAddDropZone(el, (cardId) => {
        if (addCardToEngine(engine.id, cardId, 1)) renderAll();
      });

      el.querySelector(".btn-rename-engine").addEventListener("click", (e) => {
        e.stopPropagation();
        openRenameModal(engine.name, (newName) => {
          if (updateEngine(engine.id, { name: newName })) renderAll();
        });
      });

      el.querySelector(".btn-delete-engine").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteEngine(engine.id);
      });

      if (expanded) {
        const contentsEl = el.querySelector(".engine-card-contents");
        engine.cards.forEach((ec) => {
          const card = findCard(ec.cardId);
          if (!card) {
            const wrapper = document.createElement("div");
            wrapper.className = "card-tag-row";
            const span = document.createElement("span");
            span.textContent = "(removed card)";
            wrapper.appendChild(span);
            contentsEl.appendChild(wrapper);
            return;
          }
          for (let i = 0; i < ec.quantity; i++) {
            contentsEl.appendChild(
              renderCardTile(card, {
                onRemove: () => removeCardFromEngine(engine.id, ec.cardId, 1),
                removeLabel: `Remove one ${card.name} from ${engine.name}`,
              })
            );
          }
        });
      }

      engineListEl.appendChild(el);
    });
  }

  function renderDeckSectionCards(containerEl, deckId, section, entries, deckName) {
    containerEl.innerHTML = "";
    if (entries.length === 0) {
      containerEl.innerHTML = '<p class="empty-msg">No cards yet.</p>';
      return;
    }
    const sectionLabel = section === "main" ? "Main Deck" : "Extra Deck";
    entries.forEach((entry) => {
      const card = findCard(entry.cardId);
      if (!card) {
        const wrapper = document.createElement("div");
        wrapper.className = "card-tag-row";
        const span = document.createElement("span");
        span.textContent = "(removed card)";
        wrapper.appendChild(span);
        containerEl.appendChild(wrapper);
        return;
      }
      for (let i = 0; i < entry.quantity; i++) {
        containerEl.appendChild(
          renderCardTile(card, {
            onRemove: () => removeCardFromDeckSection(deckId, section, entry.cardId, 1),
            removeLabel: `Remove one ${card.name} from ${sectionLabel} of ${deckName}`,
            dragMovePayload: { cardId: entry.cardId, fromDeckId: deckId, fromSection: section },
          })
        );
      }
    });
  }

  function renderDecks() {
    deckListEl.innerHTML = "";

    if (collection.decks.length === 0) {
      deckListEl.innerHTML = '<p class="empty-msg">No decks yet. Create one above.</p>';
      return;
    }

    collection.decks.forEach((deck) => {
      const expanded = expandedDecks.has(deck.id);
      const mainTotal = deck.main.reduce((s, it) => s + it.quantity, 0);
      const extraTotal = deck.extra.reduce((s, it) => s + it.quantity, 0);

      const el = document.createElement("div");
      el.className = "deck-card bag" + (expanded ? " expanded" : " collapsed");
      el.innerHTML = `
        <div class="bag-header">
          <span class="bag-toggle-icon" aria-hidden="true">${expanded ? "▾" : "▸"}</span>
          <input type="text" class="deck-name-input" value="${escapeHtml(deck.name)}" aria-label="Deck name">
          ${expanded ? `<span class="item-count-badge">${mainTotal + extraTotal} card(s)</span>` : ""}
          <div class="header-actions">
            <button type="button" class="btn btn-secondary btn-export">Export</button>
            <button type="button" class="btn btn-secondary btn-import">Import</button>
            <button type="button" class="btn btn-secondary btn-delete-deck">Delete</button>
          </div>
        </div>
        ${
          expanded
            ? `<div class="bag-body">
                 <div class="deck-section">
                   <h4>Main Deck <span class="item-count-badge">${mainTotal} total</span></h4>
                   <div class="deck-main-list card-tag-list"></div>
                 </div>
                 <div class="deck-section">
                   <h4>Extra Deck <span class="item-count-badge">${extraTotal} total</span></h4>
                   <div class="deck-extra-list card-tag-list"></div>
                 </div>
               </div>`
            : ""
        }
      `;

      const headerEl = el.querySelector(".bag-header");
      headerEl.addEventListener("click", (e) => {
        if (e.target.closest(".header-actions") || e.target.closest(".deck-name-input")) return;
        if (expandedDecks.has(deck.id)) expandedDecks.delete(deck.id);
        else expandedDecks.add(deck.id);
        renderDecks();
      });
      headerEl.addEventListener("keydown", (e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          !e.target.closest(".header-actions") &&
          !e.target.closest(".deck-name-input")
        ) {
          e.preventDefault();
          headerEl.click();
        }
      });
      headerEl.tabIndex = 0;
      headerEl.setAttribute("role", "button");
      headerEl.setAttribute("aria-expanded", String(expanded));

      el.querySelector(".deck-name-input").addEventListener("click", (e) => e.stopPropagation());
      el.querySelector(".deck-name-input").addEventListener("change", (e) => {
        if (updateDeck(deck.id, { name: e.target.value })) renderDecks();
        else e.target.value = deck.name;
      });

      el.querySelector(".btn-export").addEventListener("click", (e) => {
        e.stopPropagation();
        exportDeckAsYdk(deck.id);
      });
      el.querySelector(".btn-import").addEventListener("click", (e) => {
        e.stopPropagation();
        openImportModal(deck.id);
      });
      el.querySelector(".btn-delete-deck").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteDeck(deck.id);
      });

      if (expanded) {
        const mainListEl = el.querySelector(".deck-main-list");
        const extraListEl = el.querySelector(".deck-extra-list");
        renderDeckSectionCards(mainListEl, deck.id, "main", deck.main, deck.name);
        renderDeckSectionCards(extraListEl, deck.id, "extra", deck.extra, deck.name);

        function moveCardIntoSection(targetSection, payload) {
          if (payload.fromDeckId === deck.id && payload.fromSection === targetSection) return;
          if (!addCardToDeckSection(deck.id, targetSection, payload.cardId, 1)) return;
          removeCardFromDeckSection(payload.fromDeckId, payload.fromSection, payload.cardId, 1, { silent: true });
          const card = findCard(payload.cardId);
          showToast(`Moved ${card ? card.name : "card"} to ${sectionLabel(targetSection)}.`, "success");
        }

        const sectionEls = el.querySelectorAll(".deck-section");
        wireAddDropZone(
          sectionEls[0],
          (cardId) => {
            if (addCardToDeckSection(deck.id, "main", cardId, 1)) renderAll();
          },
          (payload) => {
            if (payload.engineId && addEngineToDeckSection(deck.id, "main", payload.engineId)) renderAll();
          },
          (payload) => moveCardIntoSection("main", payload)
        );
        wireAddDropZone(
          sectionEls[1],
          (cardId) => {
            if (addCardToDeckSection(deck.id, "extra", cardId, 1)) renderAll();
          },
          (payload) => {
            if (payload.engineId && addEngineToDeckSection(deck.id, "extra", payload.engineId)) renderAll();
          },
          (payload) => moveCardIntoSection("extra", payload)
        );
      }

      deckListEl.appendChild(el);
    });
  }

  // ---------- card search (add new cards via search, not typing) ----------

  function renderSearchResults(cards) {
    cardSearchResultsEl.innerHTML = "";
    if (cards.length === 0) return;

    cards.forEach((apiCard) => {
      const images = apiCard.card_images && apiCard.card_images[0];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result-card";
      btn.innerHTML = `
        ${images ? `<img src="${images.image_url_small}" alt="" loading="lazy">` : '<span class="search-result-noimg">No image</span>'}
        <span class="search-result-name">${escapeHtml(apiCard.name)}</span>
      `;
      btn.addEventListener("click", () => {
        if (addOrIncrementCardFromSearchResult(apiCard)) {
          renderAll();
          cardSearchStatus.textContent = `Added "${apiCard.name}" to the backlog.`;
          showToast(`Added "${apiCard.name}" to backlog.`, "success");
        }
      });
      cardSearchResultsEl.appendChild(btn);
    });
  }

  function runCardSearch(query) {
    if (activeSearchController) activeSearchController.abort();
    activeSearchController = new AbortController();

    cardSearchStatus.textContent = "Searching…";
    cardSearchStatus.classList.remove("error");

    const url = `${API_URL}?fname=${encodeURIComponent(query)}`;

    fetch(url, { signal: activeSearchController.signal })
      .then((res) => {
        if (!res.ok) {
          renderSearchResults([]);
          cardSearchStatus.textContent = "No cards found.";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const results = data.data || [];
        renderSearchResults(results);
        cardSearchStatus.textContent = `${results.length} card(s) found.`;
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        renderSearchResults([]);
        cardSearchStatus.textContent = "Search failed. Check your connection and try again.";
        cardSearchStatus.classList.add("error");
      });
  }

  cardSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = cardSearchInput.value.trim();

    if (query.length < SEARCH_MIN_LEN) {
      renderSearchResults([]);
      cardSearchStatus.textContent =
        query.length === 0 ? "" : `Type at least ${SEARCH_MIN_LEN} characters to search.`;
      cardSearchStatus.classList.remove("error");
      return;
    }

    searchTimer = setTimeout(() => runCardSearch(query), SEARCH_DEBOUNCE_MS);
  });

  // ---------- event wiring ----------

  backlogSearchInput.addEventListener("input", () => {
    backlogFilter = backlogSearchInput.value;
    renderBacklog();
  });

  engineForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (createEngine(engineNameInput.value)) {
      engineNameInput.value = "";
      setEngineFormOpen(false);
      renderAll();
    }
  });

  engineFormToggle.addEventListener("click", () => {
    const willOpen = engineForm.hidden;
    setEngineFormOpen(willOpen);
    if (willOpen) {
      engineNameInput.value = "";
      engineNameInput.focus();
    }
  });

  deckCreateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (createDeck(newDeckNameInput.value)) {
      newDeckNameInput.value = "";
      renderDecks();
    }
  });

  // Clicking anywhere that isn't a card tag or a modal collapses an image-expanded tag
  // (modal clicks stop propagation themselves; a tag's own click also stops propagation).
  document.addEventListener("click", () => {
    if (expandedCardId !== null) {
      expandedCardId = null;
      renderAll();
    }
  });

  // ---------- utils ----------

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- init ----------

  renderAll();
})();
