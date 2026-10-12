(() => {
  "use strict";

  const API_BASE = "https://db.ygoprodeck.com/api/v7/";
  const SET_CARDS_URL = API_BASE + "cardinfo.php";
  const STORAGE_KEY = "ygoCollection";

  // MAINLINE_BOOSTERS, DEFAULT_BOOSTER_SIZE, BOOSTER_SIZE_OVERRIDES, RARITY_GLOW_TIERS,
  // and DEFAULT_RARITY_GLOW are defined in the isolated draft-data.js, loaded before this
  // script.

  const setCardPoolCache = new Map();
  let idCounter = 0;

  const boosterInput = document.getElementById("boosterInput");
  const boosterResultsList = document.getElementById("boosterResultsList");
  const amountInput = document.getElementById("amountInput");
  const cardpoolInput = document.getElementById("cardpoolInput");
  const groupingSelect = document.getElementById("groupingSelect");
  const keptTotalPreviewEl = document.getElementById("keptTotalPreview");
  const startDraftBtn = document.getElementById("startDraftBtn");
  const cancelDraftBtn = document.getElementById("cancelDraftBtn");
  const configStatusEl = document.getElementById("configStatus");

  const draftSection = document.getElementById("draftSection");
  const chosenStripEl = document.getElementById("chosenStrip");
  const pickGroupAreaEl = document.getElementById("pickGroupArea");
  const finishedAreaEl = document.getElementById("finishedArea");
  const finishedCountEl = document.getElementById("finishedCount");
  const addToBacklogBtn = document.getElementById("addToBacklogBtn");

  function freshSession() {
    return {
      status: "configuring", // configuring | in-progress | finished
      setName: null,
      boosterSize: DEFAULT_BOOSTER_SIZE,
      amount: null,
      cardpool: null,
      grouping: "rarity",
      pickQueue: [],
      keptCards: [],
    };
  }

  let session = freshSession();

  function nextId(prefix) {
    idCounter += 1;
    return `${prefix}${Date.now()}_${idCounter}`;
  }

  // ---------- card pool: fetch + cache (mirrors tracker.js) ----------

  function getWeightForRarity(rarity) {
    const r = (rarity || "").toLowerCase();
    if (r.includes("secret") || r.includes("ultimate") || r.includes("ghost") || r.includes("ultra")) {
      return 1;
    }
    if (r.includes("super")) return 1.5;
    if (r.includes("rare")) return 3;
    return 10; // common or unrecognized/missing
  }

  // Looks up the display glow for a card's raw rarity string against RARITY_GLOW_TIERS
  // (draft-data.js), rarest tier first; falls back to DEFAULT_RARITY_GLOW (Common).
  function getRarityGlow(rarity) {
    const r = (rarity || "").toLowerCase();
    const tier = RARITY_GLOW_TIERS.find((t) => t.keywords.some((kw) => r.includes(kw)));
    return tier || DEFAULT_RARITY_GLOW;
  }

  function getBoosterSize(setName) {
    return Object.prototype.hasOwnProperty.call(BOOSTER_SIZE_OVERRIDES, setName)
      ? BOOSTER_SIZE_OVERRIDES[setName]
      : DEFAULT_BOOSTER_SIZE;
  }

  function parsePrice(apiCard) {
    const prices = Array.isArray(apiCard.card_prices) ? apiCard.card_prices[0] : null;
    const raw = prices && prices.tcgplayer_price;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function extractCardDataFromApiResult(apiCard) {
    const images = apiCard.card_images && apiCard.card_images[0];
    const isMonster = typeof apiCard.type === "string" && apiCard.type.includes("Monster");
    return {
      apiId: apiCard.id,
      type: apiCard.type || null,
      humanReadableCardType: apiCard.humanReadableCardType || null,
      frameType: apiCard.frameType || null,
      race: apiCard.race || null,
      attribute: isMonster ? apiCard.attribute || null : null,
      archetype: apiCard.archetype || null,
      imageSmall: images ? images.image_url_small : null,
      imageFull: images ? images.image_url : null,
      // Link monsters report level: 0 from the API even though they have no Level.
      level: isMonster && typeof apiCard.level === "number" && apiCard.frameType !== "link" ? apiCard.level : null,
      scale: isMonster && typeof apiCard.scale === "number" ? apiCard.scale : null,
      linkval: isMonster && typeof apiCard.linkval === "number" ? apiCard.linkval : null,
      linkmarkers: isMonster && Array.isArray(apiCard.linkmarkers) ? apiCard.linkmarkers : null,
      atk: isMonster && typeof apiCard.atk === "number" ? apiCard.atk : null,
      def: isMonster && typeof apiCard.def === "number" ? apiCard.def : null,
      desc: apiCard.desc || null,
      pendDesc: typeof apiCard.pend_desc === "string" ? apiCard.pend_desc : null,
      monsterDesc: typeof apiCard.monster_desc === "string" ? apiCard.monster_desc : null,
    };
  }

  function fetchSetCardPool(setName) {
    if (setCardPoolCache.has(setName)) return Promise.resolve(setCardPoolCache.get(setName));
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
          const rarity = match ? match.set_rarity : null;
          return {
            name: card.name,
            rarity,
            weight: getWeightForRarity(rarity),
            price: parsePrice(card),
            ...extractCardDataFromApiResult(card),
          };
        });
        setCardPoolCache.set(setName, pool);
        return pool;
      })
      .catch((err) => {
        console.warn("Could not load set card pool:", err);
        showConfigStatus("Couldn't load that set's cards — check your connection and try again.", true);
        throw err;
      });
  }

  function weightedRandomPick(pool) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let r = Math.random() * total;
    for (const entry of pool) {
      r -= entry.weight;
      if (r <= 0) return entry;
    }
    return pool[pool.length - 1];
  }

  // sortValueFor/shuffleArray/dedupeChunks/buildPickGroupsForBooster are defined in the
  // isolated draft-grouping.js, loaded before this script.

  // ---------- booster autocomplete ----------

  function renderBoosterResults(filterText) {
    const filtered = filterText
      ? MAINLINE_BOOSTERS.filter((name) => name.toLowerCase().includes(filterText.toLowerCase()))
      : MAINLINE_BOOSTERS;
    boosterResultsList.innerHTML = "";
    if (filtered.length === 0) {
      boosterResultsList.hidden = true;
      return;
    }
    filtered.slice(0, 30).forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "set-result-row";
      btn.textContent = name;
      btn.addEventListener("click", () => selectBooster(name));
      boosterResultsList.appendChild(btn);
    });
    boosterResultsList.hidden = false;
  }

  function selectBooster(setName) {
    session.setName = setName;
    session.boosterSize = getBoosterSize(setName);
    boosterInput.value = setName;
    boosterResultsList.hidden = true;
    boosterResultsList.innerHTML = "";
    updatePreview();
  }

  boosterInput.addEventListener("focus", () => {
    if (session.status !== "configuring") return;
    renderBoosterResults(boosterInput.value);
  });
  boosterInput.addEventListener("input", () => {
    if (session.status !== "configuring") return;
    session.setName = null;
    updatePreview();
    renderBoosterResults(boosterInput.value);
  });
  document.addEventListener("click", (e) => {
    if (!boosterInput.contains(e.target) && !boosterResultsList.contains(e.target)) {
      boosterResultsList.hidden = true;
    }
  });

  // ---------- live kept/total preview (FR-006) ----------

  function updatePreview() {
    const amount = Number(amountInput.value);
    const cardpool = Number(cardpoolInput.value);
    const boosterSize = session.boosterSize || DEFAULT_BOOSTER_SIZE;
    if (session.setName && Number.isFinite(amount) && amount >= 1 && Number.isFinite(cardpool) && cardpool >= 1) {
      const kept = Math.floor(amount) * Math.floor(boosterSize / Math.floor(cardpool));
      const total = Math.floor(amount) * boosterSize;
      keptTotalPreviewEl.textContent = `${kept}/${total}`;
    } else {
      keptTotalPreviewEl.textContent = "0/0";
    }
  }
  amountInput.addEventListener("input", updatePreview);
  cardpoolInput.addEventListener("input", updatePreview);

  // ---------- validation (FR-003/004/016) ----------

  function showConfigStatus(message, isError) {
    configStatusEl.textContent = message || "";
    configStatusEl.classList.toggle("error", Boolean(isError));
  }

  function validateConfig() {
    if (!session.setName) return "Select a booster first.";
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
      return "Amount must be a whole number of at least 1.";
    }
    const cardpool = Number(cardpoolInput.value);
    if (!Number.isFinite(cardpool) || !Number.isInteger(cardpool) || cardpool < 1) {
      return "Cardpool must be a whole number of at least 1.";
    }
    if (cardpool > session.boosterSize) {
      return `Cardpool must not exceed this booster's card count (${session.boosterSize}).`;
    }
    return null;
  }

  // ---------- start draft (FR-007/008) ----------

  startDraftBtn.addEventListener("click", () => {
    const error = validateConfig();
    if (error) {
      showConfigStatus(error, true);
      return;
    }
    showConfigStatus("");
    session.amount = Math.floor(Number(amountInput.value));
    session.cardpool = Math.floor(Number(cardpoolInput.value));
    session.grouping = groupingSelect.value;
    session.status = "in-progress";
    renderConfigLockState();

    fetchSetCardPool(session.setName).then((pool) => {
      if (!pool || pool.length === 0) {
        showConfigStatus("That set has no cards to draw from.", true);
        session.status = "configuring";
        renderConfigLockState();
        return;
      }
      let allGroups = [];
      for (let b = 0; b < session.amount; b++) {
        const boosterCards = [];
        for (let i = 0; i < session.boosterSize; i++) {
          boosterCards.push(weightedRandomPick(pool));
        }
        const groups = buildPickGroupsForBooster(boosterCards, session.cardpool, session.grouping).map(
          (cards) => ({ boosterIndex: b, cards })
        );
        allGroups = allGroups.concat(groups);
      }
      session.pickQueue = allGroups;
      draftSection.hidden = false;
      renderAll();
    });
  });

  // escapeHtml/showModal/buildCardTags/buildEffectHtml/openPickCardDetailModal are defined
  // in the isolated draft-modal.js, loaded before this script.

  // ---------- pick handling (FR-010/FR-013) ----------

  function handlePick(card) {
    session.keptCards.push(card);
    session.pickQueue.shift();
    if (session.pickQueue.length === 0) {
      session.status = "finished";
    }
    renderAll();
  }

  function renderPickGroup() {
    pickGroupAreaEl.innerHTML = "";
    finishedAreaEl.hidden = true;

    if (session.status !== "in-progress" || session.pickQueue.length === 0) {
      pickGroupAreaEl.hidden = true;
      return;
    }
    pickGroupAreaEl.hidden = false;
    const group = session.pickQueue[0];
    group.cards.forEach((card, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pick-card";
      btn.draggable = true;
      btn.setAttribute("aria-label", `${card.name} — open to view details and keep`);
      const glow = getRarityGlow(card.rarity);
      if (glow.animated) {
        btn.classList.add("glow-starlight");
      } else {
        btn.style.setProperty("--glow-color", glow.color);
      }
      if (card.imageSmall) {
        const img = document.createElement("img");
        img.src = card.imageSmall;
        img.alt = card.name;
        btn.appendChild(img);
      }
      const nameEl = document.createElement("span");
      nameEl.className = "pick-card-name";
      nameEl.textContent = card.name;
      btn.appendChild(nameEl);
      btn.addEventListener("click", () => openPickCardDetailModal(card, () => handlePick(card)));
      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
        btn.classList.add("dragging");
      });
      btn.addEventListener("dragend", () => btn.classList.remove("dragging"));
      pickGroupAreaEl.appendChild(btn);
    });
  }

  function renderChosenStrip() {
    chosenStripEl.innerHTML = "";
    const sorted = session.keptCards.slice().sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach((card) => {
      const chip = document.createElement("span");
      chip.className = "chosen-chip";
      chip.textContent = card.name;
      chosenStripEl.appendChild(chip);
    });
  }

  // Drag-and-drop: dropping a pick-card onto the chosen-cards strip keeps it (FR-010),
  // same effect as clicking "Keep This Card" in the detail modal.
  chosenStripEl.addEventListener("dragover", (e) => {
    if (session.status !== "in-progress" || session.pickQueue.length === 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    chosenStripEl.classList.add("drag-over");
  });
  chosenStripEl.addEventListener("dragleave", () => {
    chosenStripEl.classList.remove("drag-over");
  });
  chosenStripEl.addEventListener("drop", (e) => {
    e.preventDefault();
    chosenStripEl.classList.remove("drag-over");
    if (session.status !== "in-progress" || session.pickQueue.length === 0) return;
    const index = Number(e.dataTransfer.getData("text/plain"));
    const group = session.pickQueue[0];
    if (!group || !Number.isInteger(index) || index < 0 || index >= group.cards.length) return;
    handlePick(group.cards[index]);
  });

  function renderFinished() {
    if (session.status !== "finished") {
      finishedAreaEl.hidden = true;
      return;
    }
    pickGroupAreaEl.hidden = true;
    finishedAreaEl.hidden = false;
    finishedCountEl.textContent = String(session.keptCards.length);
  }

  function renderConfigLockState() {
    const locked = session.status !== "configuring";
    boosterInput.disabled = locked;
    amountInput.disabled = locked;
    cardpoolInput.disabled = locked;
    groupingSelect.disabled = locked;
    startDraftBtn.hidden = locked;
    cancelDraftBtn.hidden = !locked;
    if (!locked) draftSection.hidden = true;
  }

  function renderAll() {
    renderChosenStrip();
    renderPickGroup();
    renderFinished();
    renderConfigLockState();
  }

  // ---------- cancel draft (FR-017) ----------

  function resetSession() {
    session = freshSession();
    boosterInput.value = "";
    amountInput.value = "1";
    cardpoolInput.value = "3";
    groupingSelect.value = "rarity";
    updatePreview();
    showConfigStatus("");
    draftSection.hidden = true;
    renderConfigLockState();
  }

  cancelDraftBtn.addEventListener("click", () => {
    if (!confirm("Abandon this draft? Any cards already picked will be discarded.")) return;
    resetSession();
  });

  // ---------- add to backlog (FR-014/015, contracts/page-integration.md §3) ----------

  function loadBacklogBlob() {
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

  function saveBacklogBlob(blob) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch (err) {
      console.warn("Could not save collection:", err);
    }
  }

  function addKeptCardsToBacklog(keptCards) {
    const blob = loadBacklogBlob();
    keptCards.forEach((card) => {
      const trimmed = (card.name || "").trim();
      if (!trimmed) return;
      const existing = blob.cards.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      const extracted = {
        apiId: card.apiId,
        type: card.type,
        imageSmall: card.imageSmall,
        imageFull: card.imageFull,
        level: card.level,
        atk: card.atk,
        def: card.def,
      };
      if (existing) {
        existing.quantityOwned += 1;
        Object.keys(extracted).forEach((key) => {
          if ((existing[key] === undefined || existing[key] === null) && extracted[key] !== null && extracted[key] !== undefined) {
            existing[key] = extracted[key];
          }
        });
      } else {
        blob.cards.push({
          id: nextId("card"),
          name: trimmed,
          quantityOwned: 1,
          ...extracted,
        });
      }
    });
    saveBacklogBlob(blob);
  }

  addToBacklogBtn.addEventListener("click", () => {
    addKeptCardsToBacklog(session.keptCards);
    resetSession();
  });

  // ---------- init ----------

  resetSession();
})();
