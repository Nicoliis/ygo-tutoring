const AUTOCOMPLETE_MAX_RESULTS = 30; // suggestions listed under the booster field
function renderBoosterResults(filterText) {
  const filtered = filterText
    ? MAINLINE_BOOSTERS.filter((name) => name.toLowerCase().includes(filterText.toLowerCase()))
    : MAINLINE_BOOSTERS;
  boosterResultsList.innerHTML = "";
  if (filtered.length === 0) {
    boosterResultsList.hidden = true;
    return;
  }
  filtered.slice(0, AUTOCOMPLETE_MAX_RESULTS).forEach((name) => {
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
