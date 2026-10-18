const MIDPOINT_DIVISOR = 2; // halving a length finds its centre

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}${Date.now()}_${idCounter}`;
}
