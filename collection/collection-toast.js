const TOAST_VISIBLE_MS = 2600; // how long a toast stays on screen
const TOAST_REMOVE_FALLBACK_MS = 400; // removes the toast if its fade-out never reports it finished
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
    setTimeout(() => toast.remove(), TOAST_REMOVE_FALLBACK_MS); // fallback, in case transitionend never fires
  }, TOAST_VISIBLE_MS);
}
