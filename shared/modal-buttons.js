function wireModalButtons(actionsEl, buttons, onDone) {
  buttons.forEach((btn) => {
    const buttonEl = document.createElement("button");
    buttonEl.type = "button";
    buttonEl.className = "btn " + (btn.primary ? "btn-primary" : "btn-secondary");
    buttonEl.textContent = btn.label;
    buttonEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.onClick) btn.onClick();
      onDone();
    });
    actionsEl.appendChild(buttonEl);
  });
}
