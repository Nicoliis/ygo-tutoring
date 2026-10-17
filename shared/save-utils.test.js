// Contract tests for save-utils.js. Run: node shared/save-utils.test.js
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
global.console.warn = () => {};

const src = fs.readFileSync(path.join(__dirname, "save-utils.js"), "utf8");
const api = new Function(`${src}; return { saveData, loadData, buildBackup, importAll };`)();

// 1. Unknown/new fields round-trip untouched
api.saveData({ cards: [1], futureField: { a: 1 } }, "ygoCollection");
assert.deepStrictEqual(api.loadData("ygoCollection"), { cards: [1], futureField: { a: 1 } });

// 2. Saving a stale/partial object never drops stored fields
api.saveData({ cards: [1, 2] }, "ygoCollection");
assert.deepStrictEqual(api.loadData("ygoCollection").futureField, { a: 1 });
assert.deepStrictEqual(api.loadData("ygoCollection").cards, [1, 2]);

// 3. Export includes every ygo* key (even brand-new ones, even non-JSON), nothing else
localStorage.setItem("ygoBrandNewFeature", "plain-string");
localStorage.setItem("ygoSidebarCollapsed", "true");
localStorage.setItem("unrelated", "x");
const backup = api.buildBackup();
assert.deepStrictEqual(
  Object.keys(backup.data).sort(),
  ["ygoBrandNewFeature", "ygoCollection", "ygoSidebarCollapsed"]
);

// 4. Import restores byte-for-byte
store.clear();
const file = { text: async () => JSON.stringify(backup) };
api.importAll(file).then((keys) => {
  assert.strictEqual(keys.length, 3);
  assert.strictEqual(localStorage.getItem("ygoBrandNewFeature"), "plain-string");
  assert.deepStrictEqual(api.loadData("ygoCollection").futureField, { a: 1 });

  // 5. Invalid backups write nothing
  store.clear();
  const bad = { text: async () => JSON.stringify({ format: "ygo-tutoring-backup", data: { ygoA: "1", evil: "2" } }) };
  return api.importAll(bad).then(
    () => assert.fail("should reject"),
    () => assert.strictEqual(store.size, 0)
  );
}).then(() => console.log("save-utils contract: OK"));
