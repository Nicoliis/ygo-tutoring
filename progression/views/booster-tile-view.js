/*
 * One booster as a tile: its picture (or a named placeholder), its name, its state and, when asked, an amount or a
 * choosing button. DOM only, no state and no rules. Used by the booster list, the starting-set chooser and the
 * Booster Pull screen, so a booster looks the same everywhere.
 *
 *   buildBoosterTile(name, { state, label, current, amount, selectable, selected, onSelect })
 *   state: "opened" | "next" | "locked" | "skipped" (a class pack-<state>); label: the accessible/hover text;
 *   amount: shows "×amount"; selectable: the tile is a toggle button (aria-pressed = selected).
 *
 * Needs progression-boosters.js (getSetImage).
 */
function buildPlaceholderPack(name, label) {
  const ph = document.createElement("div");
  ph.className = "booster-placeholder";
  ph.setAttribute("role", "img");
  ph.setAttribute("aria-label", label);
  ph.textContent = name;
  return ph;
}

function buildBoosterTile(name, { state = "next", label = name, current = false, amount = null, selectable = false, selected = false, onSelect = null } = {}) {
  const li = document.createElement("li");
  li.className = `booster-pack pack-${state}`;
  if (current) li.setAttribute("aria-current", "step");
  li.title = label;

  const face = selectable ? document.createElement("button") : li;
  if (selectable) {
    face.type = "button";
    face.className = "booster-tile-btn" + (selected ? " booster-tile-selected" : "");
    face.setAttribute("aria-pressed", String(selected));
    face.setAttribute("aria-label", label);
    face.addEventListener("click", () => onSelect && onSelect(name));
    li.appendChild(face);
  }

  const art = document.createElement("div");
  art.className = "booster-art";
  const image = getSetImage(name);
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = label;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      art.innerHTML = "";
      art.appendChild(buildPlaceholderPack(name, label));
    });
    art.appendChild(img);
  } else {
    art.appendChild(buildPlaceholderPack(name, label));
  }
  face.appendChild(art);

  const caption = document.createElement("span");
  caption.className = "booster-caption";
  caption.textContent = name;
  face.appendChild(caption);

  if (amount !== null) {
    const badge = document.createElement("span");
    badge.className = "booster-amount";
    badge.textContent = `×${amount}`;
    badge.setAttribute("aria-label", `${amount} pack${amount === 1 ? "" : "s"} of ${name}`);
    face.appendChild(badge);
  }
  return li;
}
