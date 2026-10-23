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

/* ---- files on disk ---- */

const SKIPPED_DIRS = new Set([".git", "specs", ".specify", ".claude", "node_modules"]);

function listFiles(dir, found = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = dir ? dir + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) listFiles(relative, found);
    } else found.push(relative);
  }
  return found;
}

const allFiles = listFiles("");
const appPagesText = read("service-worker.js").match(/const APP_PAGES = \[([\s\S]*?)\];/)[1];
const appPages = [...appPagesText.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

check("every page of the app is listed in the worker and every listed page exists", () => {
  const pages = allFiles.filter((file) => file.endsWith(".html") && file !== "shared/tests.html");
  const missingFromList = pages.filter((page) => !appPages.includes(page));
  expect(missingFromList.length === 0, "pages not in APP_PAGES: " + missingFromList.join(", "));
  const missingOnDisk = appPages.filter((page) => !fs.existsSync(path.join(root, page)));
  expect(missingOnDisk.length === 0, "listed pages that do not exist: " + missingOnDisk.join(", "));
});

check("every app page carries the manifest, theme color, icons and the app shell", () => {
  for (const page of appPages.filter((p) => p !== "offline.html")) {
    const html = read(page);
    const up = "../".repeat(page.split("/").length - 1);
    for (const needle of ['rel="manifest"', 'name="theme-color"', 'rel="apple-touch-icon"', up + "shared/app-shell.css", up + "shared/app-shell.js"]) {
      expect(html.includes(needle), page + " lacks " + needle);
    }
  }
});

check("offline.html is self-contained and loads no app script", () => {
  expect(!/<script[^>]+src=/.test(read("offline.html")), "offline.html loads a script");
});

check("the manifest is valid and every icon exists with its stated size", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  for (const field of ["name", "short_name", "start_url", "scope", "display", "theme_color", "background_color", "icons"]) {
    expect(manifest[field], "manifest lacks " + field);
  }
  expect(manifest.display === "standalone", "display must be standalone");
  for (const icon of manifest.icons) {
    const file = path.join(root, icon.src);
    expect(fs.existsSync(file), "icon missing: " + icon.src);
    if (icon.type === "image/png") {
      const header = fs.readFileSync(file);
      const size = header.readUInt32BE(16) + "x" + header.readUInt32BE(20); // PNG: width and height follow the signature and IHDR tag
      expect(size === icon.sizes, icon.src + " is " + size + ", the manifest says " + icon.sizes);
    }
  }
});

check("every picture, sound or data file named inside the scripts exists", () => {
  const extraText = (read("service-worker.js").match(/const EXTRA_FILES = \[([\s\S]*?)\];/) || [, ""])[1];
  const extra = [...extraText.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const scripts = allFiles.filter((file) => file.endsWith(".js") && !file.endsWith(".test.js") && file !== "shared/contract-tests.js" && !file.startsWith("icons/") && file !== "service-worker.js");
  const names = new Set(allFiles.map((file) => file.split("/").pop()));
  const lost = [];
  for (const script of scripts) {
    const code = withoutComments(read(script));
    for (const m of code.matchAll(/["'`]([^"'`\s{}$:?#]+\.(?:png|jpg|jpeg|svg|webp|gif|mp3|ogg|json))["'`]/g)) {
      const name = m[1];
      if (/^(https?:|data:)/.test(name) || name.includes("*")) continue;
      if (!names.has(name.split("/").pop()) && !extra.includes(name)) lost.push(script + " -> " + name);
    }
  }
  expect(lost.length === 0, "files named in scripts that are not on disk: " + lost.join("; "));
});

let failed = 0;
results.forEach((r) => {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : " -> " + r.error}`);
  if (!r.ok) failed++;
});
console.log(failed ? `${failed} failed` : "offline checks: OK");
process.exit(failed ? 1 : 0);
