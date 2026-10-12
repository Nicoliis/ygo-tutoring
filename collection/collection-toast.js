let toastContainerEl = null;

function showToast(message, type = "info") {
  if (!toastContainerEl) {
    toastContainerEl = document.createElement("div");
    toastContainerEl.id = "toastContainer";
    toastContainerEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastContainerEl);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainerEl.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400); // fallback, in case transitionend never fires
  }, 2600);
}
