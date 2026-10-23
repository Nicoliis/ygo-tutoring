/*
 * The app shell: what every page does for the installed, offline-ready app. Registers the service worker and answers
 * the screens' questions about the connection. It never touches saved data: it uses no browser storage of its own.
 *
 *   isOffline()                   true while the browser reports no connection
 *   isOfflineResponse(response)   true when a card search was answered from the cards kept for offline use
 *   appShell.unsupportedReason    why offline use is unavailable here, or "" when it works
 *
 * See specs/021-installable-offline-app/contracts/service-worker-and-app-shell.md.
 */
const WORKER_FILE = "service-worker.js";
const REASON_FILE_ADDRESS = "Open the app from its web address to install it and use it offline.";
const REASON_INSECURE = "Offline use needs a secure web address (https).";
const REASON_BLOCKED = "Offline use is unavailable in this browser window.";

const appShell = { unsupportedReason: "", registration: null };

function isOffline() {
  return navigator.onLine === false;
}

function isOfflineResponse(response) {
  return Boolean(response && response.headers && response.headers.get("x-ygo-offline") === "1");
}

/* The profile screen and the main menu are the only screens that show app notices. */
function isEntryScreen() {
  return !(typeof pageIsInsideAreaFolder === "function" && pageIsInsideAreaFolder());
}

function rootAddress(file) {
  return typeof hrefFromRoot === "function" ? hrefFromRoot(file) : (isEntryScreen() ? "" : "../") + file;
}

/* Why this browser window cannot keep the app for offline use, or "" when it can. */
function findUnsupportedReason() {
  if (window.location.protocol === "file:") return REASON_FILE_ADDRESS;
  if (window.isSecureContext === false) return REASON_INSECURE;
  if (!("serviceWorker" in navigator) || !("caches" in window)) return REASON_BLOCKED;
  return "";
}

/* One quiet, dismissible note (entry screens only) saying why offline use or installing is not available. */
function showShellNotice(text) {
  if (!text || !isEntryScreen() || document.getElementById("appNotice")) return;
  const bar = document.createElement("div");
  bar.id = "appNotice";
  bar.className = "app-notice";
  bar.setAttribute("role", "status");
  const message = document.createElement("span");
  message.textContent = text;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "app-notice-close";
  close.setAttribute("aria-label", "Dismiss this note");
  close.textContent = "✕";
  close.addEventListener("click", () => bar.remove());
  bar.append(message, close);
  document.body.insertBefore(bar, document.body.firstChild);
}

function markUnsupported(reason) {
  appShell.unsupportedReason = reason;
  showShellNotice(reason);
}

function registerWorker() {
  const reason = findUnsupportedReason();
  if (reason) {
    markUnsupported(reason);
    return;
  }
  navigator.serviceWorker
    .register(rootAddress(WORKER_FILE))
    .then((registration) => {
      appShell.registration = registration;
    })
    .catch((err) => {
      console.warn("Could not register the offline worker:", err);
      markUnsupported(REASON_BLOCKED);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", registerWorker);
} else {
  registerWorker();
}
