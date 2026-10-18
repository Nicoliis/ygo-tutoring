/* Store shell view: the balance header, the status line and the "no balance" message. DOM only, no state. */
function setStoreStatus(message, isError) {
  const el = document.getElementById("storeStatus");
  el.textContent = message || "";
  el.classList.toggle("error", Boolean(isError));
}

function renderBalanceText(text) {
  document.getElementById("storeBalance").textContent = text;
}

function renderNoBalance() {
  document.getElementById("storeContent").innerHTML =
    '<section class="panel"><h2>No balance in this profile</h2>' +
    "<p>The Store belongs to Progression Run profiles. This profile has no run rules, so there is no balance to spend.</p>" +
    '<p><a href="../workshop/backlog.html">Go to the Workshop</a> · <a href="../menu.html">Back to the menu</a></p></section>';
  document.getElementById("storeBalance").hidden = true;
}
