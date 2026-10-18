/*
 * Sell screen view: draws the toolbar and one row per owned printing. No state and no rules here.
 *
 *   renderSellPanel(model, handlers)
 *   model    = { rows, keepCopies, keepOptions, onlyExtras, selling, preview: { soldCount, totalCents } }
 *   handlers = { onSellOne(row), onKeepChange(n), onToggleOnly(), onSellExtras() }
 *   row      = { card, printing | null, index, value, unknown? }
 */

/* "Legend of Blue Eyes White Dragon · LOB-EN001" (the set a copy was pulled from and its set code). */
function sellSetText(row) {
  if (!row.printing) return "Unknown set";
  return row.printing.setCode ? `${row.printing.set} · ${row.printing.setCode}` : row.printing.set;
}

function buildSellRow(row, model, handlers) {
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
  btn.disabled = model.selling;
  btn.setAttribute("aria-label", `Sell one ${row.card.name} (${sellSetText(row)}) for ${formatMoney(row.value)}`);
  btn.addEventListener("click", () => handlers.onSellOne(row));
  li.appendChild(btn);
  return li;
}

/* Shortcuts above the list: pick how many copies to keep, filter to cards over that, and sell every copy over it. */
function buildSellToolbar(model, handlers) {
  const keep = model.keepCopies;
  const bar = document.createElement("div");
  bar.className = "sell-toolbar";

  const keepGroup = document.createElement("div");
  keepGroup.className = "sell-keep";
  keepGroup.setAttribute("role", "group");
  keepGroup.setAttribute("aria-label", "Copies to keep of each card");
  const keepLabel = document.createElement("span");
  keepLabel.className = "sell-keep-label";
  keepLabel.textContent = "Keep";
  keepGroup.appendChild(keepLabel);
  model.keepOptions.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary";
    btn.textContent = String(n);
    btn.setAttribute("aria-pressed", String(n === keep));
    btn.title = `Keep ${n} cop${n === 1 ? "y" : "ies"} in each set and rarity and treat the rest as extras.`;
    if (n === keep) btn.classList.add("btn-active");
    btn.addEventListener("click", () => handlers.onKeepChange(n));
    keepGroup.appendChild(btn);
  });

  const filterBtn = document.createElement("button");
  filterBtn.type = "button";
  filterBtn.className = "btn btn-secondary";
  filterBtn.textContent = `Only ${keep + 1}+ copies`;
  filterBtn.setAttribute("aria-pressed", String(model.onlyExtras));
  filterBtn.title = `Show only cards you own more than ${keep} time${keep === 1 ? "" : "s"}, counting all rarities and sets together.`;
  if (model.onlyExtras) filterBtn.classList.add("btn-active");
  filterBtn.addEventListener("click", () => handlers.onToggleOnly());

  const extrasBtn = document.createElement("button");
  extrasBtn.type = "button";
  extrasBtn.className = "btn btn-primary";
  extrasBtn.textContent =
    model.preview.soldCount > 0
      ? `Sell extras (${model.preview.soldCount} copies · ${formatMoney(model.preview.totalCents)})`
      : "Sell extras";
  extrasBtn.disabled = model.selling || model.preview.soldCount === 0;
  extrasBtn.title = `Sell every copy over ${keep} within each set and rarity. The same card from another set is kept separately.`;
  extrasBtn.addEventListener("click", () => handlers.onSellExtras());

  bar.append(keepGroup, filterBtn, extrasBtn);
  return bar;
}

function renderSellPanel(model, handlers) {
  const content = document.getElementById("storeContent");
  content.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = "<h2>Sell cards</h2>";

  panel.appendChild(buildSellToolbar(model, handlers));

  const note = document.createElement("p");
  note.className = "store-note";
  note.textContent =
    "A copy sells for its set price. When the data has none it uses the Cardmarket price, and 0.01 if there is no price at all.";
  panel.appendChild(note);

  if (model.rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent = model.onlyExtras
      ? `No card has more than ${model.keepCopies} cop${model.keepCopies === 1 ? "y" : "ies"}.`
      : "You have no cards to sell yet. Open some packs first.";
    panel.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "sell-list";
    model.rows.forEach((row) => list.appendChild(buildSellRow(row, model, handlers)));
    panel.appendChild(list);
  }
  content.appendChild(panel);
}
