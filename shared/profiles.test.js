// Contract tests for profiles + Progression Run rules. Run: node shared/profiles.test.js
const fs = require("fs");
const path = require("path");

const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
console.warn = () => {};

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), "utf8");
const source = [
  read("save-utils.js"),
  read("profiles.js"),
  read("../progression/progression-state.js"),
  read("contract-tests.js"),
].join("\n");
const results = new Function(`${source}; return runContractTests();`)();

let failed = 0;
results.forEach((r) => {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : " -> " + r.error}`);
  if (!r.ok) failed++;
});
console.log(failed ? `${failed} failed` : "profiles contract: OK");
process.exit(failed ? 1 : 0);
