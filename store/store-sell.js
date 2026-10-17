/* Sell screen: one row per owned printing; a sale credits that printing's price (set price, else Cardmarket, else 0.01). */
let selling = false;
let onlyExtras = false; // show only cards owned more than 3 times (all rarities and sets together)

function sellRows() {
  const rows = [];
  storeCollection.cards.filter((card) => !onlyExtras || hasExtras(card)).forEach((card) => {
    const printings = Array.isArray(card.printings) ? card.printings : [];
    printings.forEach((printing, index) => rows.push({ card, printing, index, value: printingSaleValue(printing) }));
    const unknown = Math.max(0, card.quantityOwned - printingsTotal(card));
    if (unknown > 0) rows.push({ card, printing: null, index: -1, value: UNPRICED_SALE_CENTS, unknown });
  });
  return rows.sort((a, b) => b.value - a.value || a.card.name.localeCompare(b.card.name));
}

/* "Legend of Blue Eyes White Dragon · LOB-EN001" (the set a copy was pulled from and its set code). */
function sellSetText(row) {
  if (!row.printing) return "Unknown set";
  return row.printing.setCode ? `${row.printing.set} · ${row.printing.setCode}` : row.printing.set;
}

function buildSellRow(row) {
  const li = document.createElement("li");
  li.className = "sell-row";

  // The card name opens the card details (image, type, stats, printings).
  const name = document.createElement("button");
  name.type = "button";
  name.className = "sell-name";
  name.textContent = row.card.name;
  name.setAttribute("aria-label", `${row.card.name} — view details`);
  name.addEventListener("click", () => {
    if (typeof openCardDetailModal === "function") openCardDetailModal(row.card);
  });
  li.appendChild(name);

  if (row.printing) li.appendChild(buildRarityBadge(row.printing.rarity));
  else {
    const unknown = document.createElement("span");
    unknown.className = "sell-unknown";
    unknown.textContent = "Unknown rarity";
    li.appendChild(unknown);
  }

  const setInfo = document.createElement("span");
  setInfo.className = "sell-set";
  setInfo.textContent = sellSetText(row);
  setInfo.title = sellSetText(row);
  li.appendChild(setInfo);

  const qty = document.createElement("span");
  qty.className = "sell-qty";
  qty.textContent = `×${row.printing ? row.printing.quantity : row.unknown}`;
  li.appendChild(qty);

  const value = document.createElement("span");
  value.className = "sell-value";
  value.textContent = formatMoney(row.value);
  li.appendChild(value);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary";
  btn.textContent = "Sell one";
  btn.disabled = selling;
  btn.setAttribute("aria-label", `Sell one ${row.card.name} (${sellSetText(row)}) for ${formatMoney(row.value)}`);
  btn.addEventListener("click", () => onSell(row.card.id, row.index));
  li.appendChild(btn);
  return li;
}

function renderSellList() {
  const content = document.getElementById("storeContent");
  content.innerHTML = "";
  const rows = sellRows();
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = "<h2>Sell cards</h2>";

  panel.appendChild(buildSellToolbar());

  const note = document.createElement("p");
  note.className = "store-note";
  note.textContent =
    "A copy sells for its set price. When the data has none it uses the Cardmarket price, and 0.01 if there is no price at all.";
  panel.appendChild(note);

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent = onlyExtras
      ? "No card has more than 3 copies."
      : "You have no cards to sell yet. Open some packs first.";
    panel.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "sell-list";
    rows.forEach((row) => list.appendChild(buildSellRow(row)));
    panel.appendChild(list);
  }
  content.appendChild(panel);
}

/* Two shortcuts above the list: filter to cards with more than 3 copies, and sell every copy over 3. */
function buildSellToolbar() {
  const bar = document.createElement("div");
  bar.className = "sell-toolbar";

  const filterBtn = document.createElement("button");
  filterBtn.type = "button";
  filterBtn.className = "btn btn-secondary";
  filterBtn.textContent = "Only 4+ copies";
  filterBtn.setAttribute("aria-pressed", String(onlyExtras));
  filterBtn.title = "Show only cards you own more than 3 times, counting all rarities and sets together.";
  if (onlyExtras) filterBtn.classList.add("btn-active");
  filterBtn.addEventListener("click", () => {
    onlyExtras = !onlyExtras;
    renderSellList();
  });

  const preview = previewExtras(storeRun, storeCollection);
  const extrasBtn = document.createElement("button");
  extrasBtn.type = "button";
  extrasBtn.className = "btn btn-primary";
  extrasBtn.textContent =
    preview.soldCount > 0
      ? `Sell extras (${preview.soldCount} copies · ${formatMoney(preview.totalCents)})`
      : "Sell extras";
  extrasBtn.disabled = selling || preview.soldCount === 0;
  extrasBtn.title = "Sell every copy over 3 of each card, cheapest copies first.";
  extrasBtn.addEventListener("click", () => onSellExtras());

  bar.append(filterBtn, extrasBtn);
  return bar;
}

async function onSellExtras() {
  if (selling) return;
  const preview = previewExtras(storeRun, storeCollection);
  if (preview.soldCount === 0) return;
  const ok = await confirmDialog(
    `Sell ${preview.soldCount} extra cop${preview.soldCount === 1 ? "y" : "ies"} of ${preview.cardCount} card${preview.cardCount === 1 ? "" : "s"} for ${formatMoney(preview.totalCents)}?\n\nYou keep 3 of each card (the most valuable ones).`,
    { title: "Sell extras", confirmLabel: "Sell" }
  );
  if (!ok || selling) return;

  selling = true;
  const snapshot = JSON.parse(JSON.stringify(storeCollection));
  const previousRun = storeRun;
  try {
    const result = sellExtras(storeRun, storeCollection);
    if (!saveStoreCollection() || !saveStoreRun(result.run)) throw new Error("save-failed");
    setStoreStatus(`Sold ${result.soldCount} extra copies for ${formatMoney(result.totalCents)}.`);
  } catch (err) {
    storeCollection = snapshot;
    saveStoreCollection();
    storeRun = previousRun;
    renderBalance();
    setStoreStatus(err.message === "save-failed" ? STORE_SAVE_ERROR : err.message, true);
  } finally {
    selling = false;
    renderSellList();
  }
}

async function onSell(cardId, printingIndex) {
  if (selling) return;
  const card = storeCollection.cards.find((c) => c.id === cardId);
  if (!card) return;
  const check = canSell(card, printingIndex);
  if (!check.ok) {
    setStoreStatus(check.reason, true);
    return;
  }

  // A sale can leave an engine or deck with more copies than are owned: say so before doing it.
  const affected = allocationsOverLimit(storeCollection, cardId, card.quantityOwned - 1);
  if (affected.length > 0) {
    const ok = await confirmDialog(
      `You need this copy of "${card.name}" in: ${affected.join(", ")}. Selling it reduces those to the copies you still own. Sell anyway?`,
      { title: "Sell card", confirmLabel: "Sell anyway" }
    );
    if (!ok || selling) return;
  }

  selling = true;
  const snapshot = JSON.parse(JSON.stringify(storeCollection));
  const previousRun = storeRun;
  try {
    const newRunRecord = sellPrinting(storeRun, storeCollection, cardId, printingIndex);
    // Collection first, then the balance; if either save fails, nothing is applied.
    if (!saveStoreCollection() || !saveStoreRun(newRunRecord)) throw new Error("save-failed");
    setStoreStatus(`Sold ${card.name} for ${formatMoney(check.valueCents)}.`);
  } catch (err) {
    storeCollection = snapshot;
    saveStoreCollection();
    storeRun = previousRun;
    renderBalance();
    setStoreStatus(err.message === "save-failed" ? STORE_SAVE_ERROR : err.message, true);
  } finally {
    selling = false;
    renderSellList();
  }
}

if (initStoreContext()) renderSellList();
