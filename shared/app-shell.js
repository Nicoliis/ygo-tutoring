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

/* What a card search says when its answer came from the cards kept for offline use. */
function offlineResultsText(count) {
  return count > 0
    ? `Offline results (${count}) — the full database needs a connection.`
    : "No offline results — the full database needs a connection.";
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

/* ---- Updates ---- */

const REFOCUS_CHECK_MS = 30 * 60 * 1000; // a window that comes back after this long checks for a new version
const APPLY_FALLBACK_MS = 3000; // if the worker has nothing to apply, Reload just reloads after this long

let lastCheckAt = 0; // kept in this window only, never in browser storage
let applyRequested = false; // this window pressed Reload and waits for the worker to switch versions

function messageWorker(message) {
  const worker = navigator.serviceWorker.controller || (appShell.registration && appShell.registration.active);
  if (worker) worker.postMessage(message);
}

function requestUpdateCheck() {
  lastCheckAt = Date.now();
  messageWorker({ type: "check" });
}

/* A small notice (top right, polite for screen readers, dismissible) that never covers the work area. */
function showUpdateNotice(text, onReload) {
  let box = document.getElementById("appUpdateNotice");
  if (!box) {
    box = document.createElement("div");
    box.id = "appUpdateNotice";
    box.className = "app-update-notice";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  box.innerHTML = "";
  const message = document.createElement("span");
  message.textContent = text;
  const reload = document.createElement("button");
  reload.type = "button";
  reload.className = "app-update-reload";
  reload.textContent = "Reload";
  reload.addEventListener("click", onReload);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "app-notice-close";
  close.setAttribute("aria-label", "Dismiss this note");
  close.textContent = "✕";
  close.addEventListener("click", () => box.remove());
  box.append(message, reload, close);
}

/* Reload asks the worker to switch to the new version, then reloads when it says so (or soon, if it has nothing to switch). */
function reloadForUpdate() {
  applyRequested = true;
  messageWorker({ type: "apply" });
  setTimeout(() => window.location.reload(), APPLY_FALLBACK_MS);
}

function onWorkerMessage(event) {
  const message = event.data || {};
  if (message.type === "update-ready") {
    showUpdateNotice("A new version is ready.", reloadForUpdate);
  } else if (message.type === "applied") {
    if (applyRequested) window.location.reload();
    else showUpdateNotice("Reload to finish the update.", () => window.location.reload());
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && lastCheckAt && Date.now() - lastCheckAt >= REFOCUS_CHECK_MS) requestUpdateCheck();
});

/* ---- Installing ---- */

let installOffer = null; // the browser's offer to install the app, kept until the user uses it or it goes away

/* True when the page already runs as an installed app. */
function isInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

/* Shows the "Install app" button(s) of this page only while there is an offer and the app is not installed yet. */
function refreshInstallButtons() {
  const visible = Boolean(installOffer) && !isInstalledApp();
  document.querySelectorAll("#installAppBtn").forEach((btn) => {
    btn.hidden = !visible;
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // keep the offer: the page's own button uses it
  installOffer = event;
  refreshInstallButtons();
});

window.addEventListener("appinstalled", () => {
  installOffer = null;
  refreshInstallButtons();
});

function wireInstallButtons() {
  document.querySelectorAll("#installAppBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!installOffer) return;
      const offer = installOffer;
      installOffer = null; // an offer can be used once
      refreshInstallButtons();
      offer.prompt();
      await offer.userChoice.catch(() => {});
    });
  });
  refreshInstallButtons();
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
      // A first visit has just stored the app itself; a window already served by a worker looks for a newer version.
      if (navigator.serviceWorker.controller) requestUpdateCheck();
    })
    .catch((err) => {
      console.warn("Could not register the offline worker:", err);
      markUnsupported(REASON_BLOCKED);
    });
}

/* Asks the browser to treat this site's storage as persistent, once per visit, so that saved data is not removed when the
   disk runs low. No screen, no answer needed: the browser decides. */
function askForPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

function startShell() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onWorkerMessage);
  wireInstallButtons();
  registerWorker();
  askForPersistentStorage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startShell);
} else {
  startShell();
}
