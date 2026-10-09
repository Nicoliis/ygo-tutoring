(() => {
  "use strict";

  const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
  const STORAGE_KEY = "ygoDeck";
  const SEARCH_MIN_LEN = 3;
  const SEARCH_DEBOUNCE_MS = 400;
  const CARDS_PER_SHEET = 9;

  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const searchStatus = document.getElementById("searchStatus");
  const searchResults = document.getElementById("searchResults");
  const deckGridEl = document.getElementById("deckGrid");
  const deckCountEl = document.getElementById("deckCount");
  const markedCountEl = document.getElementById("markedCount");
  const printBtn = document.getElementById("printBtn");
  const markAllBtn = document.getElementById("markAllBtn");
  const unmarkAllBtn = document.getElementById("unmarkAllBtn");
  const clearDeckBtn = document.getElementById("clearDeckBtn");
  const printArea = document.getElementById("printArea");

  /** @type {{uid:string, id:number, name:string, imageSmall:string, imageFull:string, marked:boolean}[]} */
  let deck = loadDeck();
  let lastResults = [];
  let searchTimer = null;
  let activeController = null;
  let uidCounter = 0;

  function nextUid() {
    uidCounter += 1;
    return `c${Date.now()}_${uidCounter}`;
  }

  // ---------- persistence ----------

  function loadDeck() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry) => ({
        uid: entry.uid || nextUid(),
        id: entry.id,
        name: entry.name,
        imageSmall: entry.imageSmall,
        imageFull: entry.imageFull,
        marked: entry.marked !== false,
      }));
    } catch (err) {
      console.warn("Could not read saved deck:", err);
      return [];
    }
  }

  function saveDeck() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch (err) {
      console.warn("Could not save deck:", err);
    }
  }

  // ---------- search ----------

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = searchInput.value.trim();

    if (query.length < SEARCH_MIN_LEN) {
      lastResults = [];
      renderResults([]);
      searchStatus.textContent =
        query.length === 0 ? "" : `Type at least ${SEARCH_MIN_LEN} characters to search.`;
      searchStatus.classList.remove("error");
      return;
    }

    searchTimer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
  });

  typeFilter.addEventListener("change", () => {
    renderResults(lastResults);
  });

  async function runSearch(query) {
    if (activeController) activeController.abort();
    activeController = new AbortController();

    searchStatus.textContent = "Searching…";
    searchStatus.classList.remove("error");

    const url = `${API_URL}?fname=${encodeURIComponent(query)}`;

    try {
      const res = await fetch(url, { signal: activeController.signal });

      if (!res.ok) {
        lastResults = [];
        renderResults([]);
        searchStatus.textContent = "No cards found.";
        return;
      }

      const data = await res.json();
      lastResults = data.data || [];
      renderResults(lastResults);
      searchStatus.textContent = `${lastResults.length} card(s) found.`;
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      lastResults = [];
      renderResults([]);
      searchStatus.textContent = "Search failed. Check your connection and try again.";
      searchStatus.classList.add("error");
    }
  }

  function matchesTypeFilter(card) {
    const filter = typeFilter.value;
    if (filter === "all") return true;
    return card.type.toLowerCase().includes(filter.toLowerCase());
  }

  function renderResults(cards) {
    searchResults.innerHTML = "";
    const filtered = cards.filter(matchesTypeFilter);

    if (cards.length > 0 && filtered.length === 0) {
      searchResults.innerHTML = `<p class="empty-msg">No cards match the selected type filter.</p>`;
      return;
    }

    for (const card of filtered) {
      const images = card.card_images && card.card_images[0];
      if (!images) continue;

      const el = document.createElement("div");
      el.className = "result-card";
      el.title = `Add "${card.name}" to deck`;
      el.innerHTML = `
        <img src="${images.image_url_small}" alt="${escapeHtml(card.name)}" loading="lazy">
        <div class="result-name">${escapeHtml(card.name)}</div>
      `;
      el.addEventListener("click", () => addCard(card));
      searchResults.appendChild(el);
    }
  }

  // ---------- deck ----------

  function addCard(card) {
    const images = card.card_images[0];
    deck.push({
      uid: nextUid(),
      id: card.id,
      name: card.name,
      imageSmall: images.image_url_small,
      imageFull: images.image_url,
      marked: true,
    });

    saveDeck();
    renderDeck();
  }

  function toggleMark(uid) {
    const entry = deck.find((c) => c.uid === uid);
    if (!entry) return;
    entry.marked = !entry.marked;
    saveDeck();
    renderDeck();
  }

  function removeCard(uid) {
    deck = deck.filter((c) => c.uid !== uid);
    saveDeck();
    renderDeck();
  }

  markAllBtn.addEventListener("click", () => {
    if (deck.length === 0) return;
    deck.forEach((c) => (c.marked = true));
    saveDeck();
    renderDeck();
  });

  unmarkAllBtn.addEventListener("click", () => {
    if (deck.length === 0) return;
    deck.forEach((c) => (c.marked = false));
    saveDeck();
    renderDeck();
  });

  clearDeckBtn.addEventListener("click", () => {
    if (deck.length === 0) return;
    if (!confirm("Remove all cards from the deck?")) return;
    deck = [];
    saveDeck();
    renderDeck();
  });

  function renderDeck() {
    deckGridEl.innerHTML = "";

    if (deck.length === 0) {
      deckGridEl.innerHTML = `<p class="empty-msg">No cards added yet. Click a search result to add it to your deck.</p>`;
    }

    for (const entry of deck) {
      const tile = document.createElement("div");
      tile.className = "deck-tile" + (entry.marked ? " marked" : "");
      tile.title = entry.name;
      tile.innerHTML = `
        <img src="${entry.imageSmall}" alt="${escapeHtml(entry.name)}" loading="lazy">
        <button type="button" class="tile-remove" aria-label="Remove from deck">✕</button>
        <span class="mark-badge" aria-hidden="true">✓</span>
      `;

      tile.addEventListener("click", () => toggleMark(entry.uid));
      tile.querySelector(".tile-remove").addEventListener("click", (e) => {
        e.stopPropagation();
        removeCard(entry.uid);
      });

      deckGridEl.appendChild(tile);
    }

    deckCountEl.textContent = String(deck.length);
    markedCountEl.textContent = String(deck.filter((c) => c.marked).length);
  }

  // ---------- printing ----------

  function buildPrintArea(cards) {
    printArea.innerHTML = "";

    for (let i = 0; i < cards.length; i += CARDS_PER_SHEET) {
      const chunk = cards.slice(i, i + CARDS_PER_SHEET);

      const sheet = document.createElement("div");
      sheet.className = "sheet";

      const grid = document.createElement("div");
      grid.className = "slot-grid";

      for (let s = 0; s < CARDS_PER_SHEET; s++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        const entry = chunk[s];
        if (entry) {
          const img = document.createElement("img");
          img.src = entry.imageFull;
          img.alt = entry.name;
          slot.appendChild(img);
        }
        grid.appendChild(slot);
      }

      sheet.appendChild(grid);
      printArea.appendChild(sheet);
    }
  }

  printBtn.addEventListener("click", () => {
    const marked = deck.filter((c) => c.marked);
    if (marked.length === 0) {
      alert("Mark at least one card in the deck before printing.");
      return;
    }
    buildPrintArea(marked);
    requestAnimationFrame(() => window.print());
  });

  // ---------- utils ----------

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- init ----------

  renderDeck();
})();
