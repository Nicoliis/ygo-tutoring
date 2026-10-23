// Checks of the offline-ready app that need the files on disk. Run: node shared/offline.test.js
// (with the VS Code runtime: ELECTRON_RUN_AS_NODE=1 "<path to Code.exe>" shared/offline.test.js)
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

/* The code of a script without its comments, so a comment that explains a rule never trips the rule's own check. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

check("the worker and the app shell never touch saved data", () => {
  const forbidden = ["localStorage", "sessionStorage", "indexedDB", "ygoCollection", "ygoRun", "ygoProfiles", "ygoDuelRoom"];
  for (const file of ["service-worker.js", "shared/app-shell.js"]) {
    const code = withoutComments(read(file));
    for (const word of forbidden) expect(!code.includes(word), `${file} mentions ${word}`);
  }
});

check("the worker only deletes caches that belong to it", () => {
  const code = withoutComments(read("service-worker.js"));
  const deletes = [...code.matchAll(/caches\.delete\(([^)]*)\)/g)].map((m) => m[1].trim());
  expect(deletes.length >= 1, "no cache deletion found: the check is out of date");
  expect(deletes.every((arg) => arg === "name"), "a cache is deleted by something other than a vetted name: " + deletes.join(", "));
  expect(code.includes("const name = APP_CACHE_PREFIX + copy.version;"), "storeCopy must delete only its own versioned cache");
  expect(code.includes("name.startsWith(APP_CACHE_PREFIX) && !keep.has(name)"), "cleanup must be limited to app copies that are not in use");
  const prefixes = [...code.matchAll(/const (APP_CACHE_PREFIX|API_CACHE|IMAGE_CACHE|META_CACHE) = "([^"]+)"/g)].map((m) => m[2]);
  expect(prefixes.length === 4 && prefixes.every((p) => p.startsWith("ygo-")), "every cache name must start with ygo-");
});

check("offline use that cannot work is explained in plain words", () => {
  const code = read("shared/app-shell.js");
  expect(code.includes("Open the app from its web address to install it and use it offline."), "file address message missing");
  expect(code.includes("Offline use needs a secure web address (https)."), "insecure address message missing");
  expect(code.includes("Offline use is unavailable in this browser window."), "blocked storage message missing");
  expect(/window\.location\.protocol === "file:"/.test(code), "the file: address case is not detected");
  expect(code.includes("isEntryScreen()"), "notices must stay on the profile screen and the main menu");
});

let failed = 0;
results.forEach((r) => {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : " -> " + r.error}`);
  if (!r.ok) failed++;
});
console.log(failed ? `${failed} failed` : "offline checks: OK");
process.exit(failed ? 1 : 0);
