function buildBacklogQtyStepper(card) {
  const qtyStepper = document.createElement("div");
  qtyStepper.className = "backlog-qty-stepper";

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "0";
  qtyInput.className = "backlog-qty-input";
  qtyInput.value = String(card.quantityOwned);
  qtyInput.setAttribute("aria-label", `Owned quantity for ${card.name}`);
  qtyInput.addEventListener("change", (e) => {
    if (setCardQuantity(card.id, e.target.value)) renderAll();
    else e.target.value = String(card.quantityOwned);
  });
  qtyStepper.appendChild(qtyInput);

  const qtySteps = document.createElement("div");
  qtySteps.className = "backlog-qty-steps";

  const qtyUpBtn = document.createElement("button");
  qtyUpBtn.type = "button";
  qtyUpBtn.className = "backlog-qty-step backlog-qty-step-up";
  qtyUpBtn.textContent = "▲";
  qtyUpBtn.setAttribute("aria-label", `Increase owned quantity for ${card.name}`);
  qtyUpBtn.addEventListener("click", () => {
    if (setCardQuantity(card.id, card.quantityOwned + 1)) renderAll();
  });
  qtySteps.appendChild(qtyUpBtn);

  const qtyDownBtn = document.createElement("button");
  qtyDownBtn.type = "button";
  qtyDownBtn.className = "backlog-qty-step backlog-qty-step-down";
  qtyDownBtn.textContent = "▼";
  qtyDownBtn.setAttribute("aria-label", `Decrease owned quantity for ${card.name}`);
  qtyDownBtn.disabled = card.quantityOwned <= 0;
  qtyDownBtn.addEventListener("click", () => {
    if (card.quantityOwned > 0 && setCardQuantity(card.id, card.quantityOwned - 1)) renderAll();
  });
  qtySteps.appendChild(qtyDownBtn);

  qtyStepper.appendChild(qtySteps);
  return qtyStepper;
}
