/* Buy screen: reached boosters with their escalating price; each purchase is applied exactly once. */
let buying = false;

function buildBoosterArt(name) {
  const art = document.createElement("div");
  art.className = "booster-art";
  const image = getSetImage(name);
  const placeholder = () => {
    const ph = document.createElement("div");
    ph.className = "booster-placeholder";
    ph.setAttribute("role", "img");
    ph.setAttribute("aria-label", name);
    ph.textContent = name;
    return ph;
  };
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = name;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      art.innerHTML = "";
      art.appendChild(placeholder());
    });
    art.appendChild(img);
  } else {
    art.appendChild(placeholder());
  }
  return art;
}

function buildOffer(name) {
  const li = document.createElement("li");
  li.className = "offer";
  li.appendChild(buildBoosterArt(name));

  const info = document.createElement("div");
  info.className = "offer-info";
  const title = document.createElement("strong");
  title.textContent = name;
  const price = document.createElement("span");
  price.className = "offer-price";
  price.textContent = `Price: ${formatMoney(nextPriceCents(storeRun, name))}`;
  const owned = document.createElement("span");
  owned.className = "offer-owned";
  owned.textContent = `Unopened: ${getPackCount(storeRun, name)}`;
  info.append(title, price, owned);

  const form = document.createElement("div");
  form.className = "offer-form";
  const qty = document.createElement("input");
  qty.type = "number";
  qty.min = "1";
  qty.step = "1";
  qty.value = "1";
  qty.className = "offer-qty";
  qty.setAttribute("aria-label", `Packs of ${name} to buy`);
  const preview = document.createElement("span");
  preview.className = "offer-preview";
  preview.setAttribute("aria-live", "polite");
  const buy = document.createElement("button");
  buy.type = "button";
  buy.className = "btn btn-primary";
  buy.textContent = "Buy";

  const refresh = () => {
    const amount = Number(qty.value);
    const check = canBuy(storeRun, name, amount, MAINLINE_BOOSTERS);
    if (!Number.isInteger(amount) || amount < 1) {
      preview.textContent = "Choose at least 1 pack.";
    } else if (check.ok) {
      preview.textContent = `Total: ${formatMoney(check.totalCents)}`;
    } else {
      preview.textContent = `Total: ${formatMoney(check.totalCents)} — you need ${formatMoney(check.missingCents)} more.`;
    }
    buy.disabled = buying || !check.ok;
  };
  qty.addEventListener("input", refresh);
  buy.addEventListener("click", () => onBuy(name, Number(qty.value), buy));
  refresh();

  form.append(qty, buy);
  li.append(info, form, preview);
  return li;
}

function renderOffers() {
  const content = document.getElementById("storeContent");
  content.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = "<h2>Boosters</h2>";

  const note = document.createElement("p");
  note.className = "store-note";
  note.innerHTML =
    "Each booster you buy again costs 50% more than the last one. Bought packs are opened in the " +
    '<a href="../progression/index.html">Progression Run</a>.';
  panel.appendChild(note);

  const reached = reachedBoosters(storeRun, MAINLINE_BOOSTERS).reverse();
  if (reached.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent = "No boosters reached yet.";
    panel.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "offer-list";
    reached.forEach((name) => list.appendChild(buildOffer(name)));
    panel.appendChild(list);
  }
  content.appendChild(panel);
}

function onBuy(name, amount, button) {
  if (buying) return;
  const check = canBuy(storeRun, name, amount, MAINLINE_BOOSTERS);
  if (!check.ok) {
    setStoreStatus(check.reason, true);
    return;
  }
  if (!confirm(`Buy ${amount} × ${name} for ${formatMoney(check.totalCents)}?`)) return;

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
