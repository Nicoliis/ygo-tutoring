/* Loads right after profiles.js and BEFORE any *-dom-refs.js: every screen but the profile screen needs an active profile. */
(function guardActiveProfile() {
  if (getActiveProfile()) return;
  window.location.replace(typeof hrefFromRoot === "function" ? hrefFromRoot("index.html") : "../index.html");
  throw new Error("No active profile; redirecting to profile selection.");
})();
