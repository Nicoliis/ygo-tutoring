/*
 * Booster Pull screen: the loose boosters the user has (picture, name, amount) and the open loose pack.
 * DOM only, no state and no rules.
 *
 *   renderBoosterPull(rootEl, model, handlers) -> { packAreaEl, packActionEl, pulledStripEl, pulledListEl } | null
 *   model    = { boosters: [{ name, amount }], openPack: { setName } | null, busy }
 *   handlers = { onOpenOne(setName) }
 *
 * Only boosters with an amount of 1 or more are drawn. Needs views/booster-tile-view.js and views/stage-view.js.
 */
function buildOpenOneButton(name, model, handlers) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary";
  btn.textContent = "Open one";
  btn.disabled = model.busy || Boolean(model.openPack);
  btn.title = model.openPack ? "Finish the pack you are opening first." : "";
  btn.setAttribute("aria-label", `Open one ${name} pack`);
  btn.addEventListener("click", () => handlers.onOpenOne(name));
  return btn;
}

function renderBoosterPull(rootEl, model, handlers) {
  rootEl.innerHTML = "";

  const listPanel = document.createElement("section");
  listPanel.className = "panel";
  const heading = document.createElement("h2");
  heading.textContent = "Boosters you can pull";
  listPanel.appendChild(heading);

  if (model.boosters.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.append("You have no boosters to pull. Buy some in the ");
    const link = document.createElement("a");
    link.href = "../store/buy.html";
    link.textContent = "Store";
    empty.append(link, ", or win them by losing a duel.");
    listPanel.appendChild(empty);
  } else {
    const rail = document.createElement("ol");
    rail.className = "booster-rail";
    model.boosters.forEach(({ name, amount }) => {
      const tile = buildBoosterTile(name, { state: "owned", label: `${name} — ${amount} to pull`, amount });
      tile.appendChild(buildOpenOneButton(name, model, handlers));
      rail.appendChild(tile);
    });
    listPanel.appendChild(rail);
  }
  rootEl.appendChild(listPanel);

  if (!model.openPack) return null;

  const panel = document.createElement("section");
  panel.className = "panel";
  const title = document.createElement("h2");
  title.textContent = `Opening: ${model.openPack.setName}`;
  panel.appendChild(title);
  const hint = document.createElement("p");
  hint.className = "status";
  hint.textContent = "Click the card back to pull the next card.";
  panel.appendChild(hint);
  const stage = document.createElement("div");
  stage.className = "pack-stage";
  const packAreaEl = document.createElement("div");
  packAreaEl.className = "pack-area";
  const packActionEl = document.createElement("div");
  packActionEl.className = "pack-action-slot";
  stage.append(packAreaEl, packActionEl);
  panel.appendChild(stage);
  const stripHeading = document.createElement("h3");
  stripHeading.textContent = "Pulled from this pack (click a card for details)";
  panel.appendChild(stripHeading);
  const pulledStripEl = document.createElement("div");
  pulledStripEl.className = "pulled-strip";
  pulledStripEl.setAttribute("aria-label", "Cards pulled from this pack");
  panel.appendChild(pulledStripEl);
  rootEl.appendChild(panel);

  const pulledListEl = document.createElement("section");
  pulledListEl.className = "panel";
  rootEl.appendChild(pulledListEl);
  return { packAreaEl, packActionEl, pulledStripEl, pulledListEl };
}
