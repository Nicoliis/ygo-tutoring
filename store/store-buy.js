/* Buy screen behaviour: reached boosters with their escalating price; each purchase is applied exactly once.
 * Drawing is in views/buy-view.js. */
let buying = false;

function renderOffers() {
  renderOfferList(
    {
      boosters: reachedBoosters(storeRun, MAINLINE_BOOSTERS).reverse(),
      priceText: (name) => formatMoney(nextPriceCents(storeRun, name)),
      unopened: (name) => getPackCount(storeRun, name),
      check: (name, amount) => canBuy(storeRun, name, amount, MAINLINE_BOOSTERS),
      isBuying: () => buying,
    },
    { onBuy }
  );
}

async function onBuy(name, amount, button) {
  if (buying) return;
  const check = canBuy(storeRun, name, amount, MAINLINE_BOOSTERS);
  if (!check.ok) {
    setStoreStatus(check.reason, true);
    return;
  }
  const ok = await confirmDialog(`Buy ${amount} × ${name} for ${formatMoney(check.totalCents)}?`, { title: "Buy boosters", confirmLabel: "Buy" });
  if (!ok || buying) return;

  buying = true;
  button.disabled = true;
  try {
    const updated = buyBoosters(storeRun, name, amount, MAINLINE_BOOSTERS);
    if (!saveStoreRun(updated)) throw new Error("save-failed");
    setStoreStatus(`Bought ${amount} × ${name} for ${formatMoney(check.totalCents)}.`);
  } catch (err) {
    setStoreStatus(err.message === "save-failed" ? STORE_SAVE_ERROR : err.message, true);
  } finally {
    buying = false;
    renderOffers();
  }
}

if (initStoreContext()) {
  renderOffers();
  loadSetDates().then(renderOffers);
}
