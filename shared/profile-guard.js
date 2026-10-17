/* Loads right after profiles.js and BEFORE any *-dom-refs.js: tool pages need an active profile. */
(function guardActiveProfile() {
  if (getActiveProfile()) return;
  window.location.replace("../index.html");
  throw new Error("No active profile; redirecting to profile selection.");
})();
