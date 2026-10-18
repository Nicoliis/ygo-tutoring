/* Sell screen behaviour: one row per owned printing; a sale credits that printing's price (set price, else Cardmarket, else 0.01). */
let selling = false;
let onlyExtras = false; // show only cards owned more than `keepCopies` times (all rarities and sets together)
let keepCopies = KEEP_COPIES; // how many copies of each card "Sell extras" leaves (1-4)

function sellRows() {
  const rows = [];
  storeCollection.cards.filter((card) => !onlyExtras || hasExtras(card, keepCopies)).forEach((card) => {
    const printings = Array.isArray(card.printings) ? card.printings : [];
    printings.forEach((printing, index) => rows.push({ card, printing, index, value: printingSaleValue(printing) }));
    const unknown = Math.max(0, card.quantityOwned - printingsTotal(card));
    if (unknown > 0) rows.push({ card, printing: null, index: -1, value: UNPRICED_SALE_CENTS, unknown });
  });
  return rows.sort((a, b) => b.value - a.value || a.card.name.localeCompare(b.card.name));
}

function renderSellList() {
  renderSellPanel(
    {
      rows: sellRows(),
      keepCopies,
      keepOptions: KEEP_OPTIONS,
      onlyExtras,
      selling,
      preview: previewExtras(storeRun, storeCollection, keepCopies),
    },
    {
      onSellOne: (row) => onSell(row.card.id, row.index),
      onKeepChange: (n) => {
        keepCopies = n;
        renderSellList();
      },
      onToggleOnly: () => {
        onlyExtras = !onlyExtras;
        renderSellList();
      },
      onSellExtras: () => onSellExtras(),
    }
  );
}

/* The card details window changed engines in the saved collection: reload it so a later sale never saves a stale copy. */
function onCardEnginesChanged() {
  reloadStoreCollection();
  renderSellList();
}

async function onSellExtras() {
  if (selling) return;
  const preview = previewExtras(storeRun, storeCollection, keepCopies);
  if (preview.soldCount === 0) return;
  const ok = await confirmDialog(
    `Sell ${preview.soldCount} extra cop${preview.soldCount === 1 ? "y" : "ies"} of ${preview.cardCount} card${preview.cardCount === 1 ? "" : "s"} for ${formatMoney(preview.totalCents)}?\n\nYou keep ${keepCopies} of each card in every set and rarity.`,
    { title: "Sell extras", confirmLabel: "Sell" }
  );
  if (!ok || selling) return;

  selling = true;
  const snapshot = JSON.parse(JSON.stringify(storeCollection));
  const previousRun = storeRun;
  try {
    const result = sellExtras(storeRun, storeCollection, keepCopies);
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
