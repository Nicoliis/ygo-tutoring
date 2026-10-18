/*
 * Central persistence layer. CONTRACT (do not break):
 *  1. Nothing here knows the shape of the data. No field whitelists, so a new
 *     field saved by any feature is persisted, loaded, exported and imported
 *     with zero changes in this file.
 *  2. saveData never drops fields already stored under the key: top-level
 *     fields of a stored object that the caller's object lacks are kept.
 *  3. exportAll/importAll cover EVERY localStorage key starting with
 *     SAVE_KEY_PREFIX (discovered at runtime, no key list to maintain) and
 *     move values as raw strings, byte-for-byte.
 *  New storage keys MUST start with SAVE_KEY_PREFIX ("ygo").
 *  Contract tests: shared/save-utils.test.js (run: node shared/save-utils.test.js).
 */
const ISO_DATE_LENGTH = 10; // "YYYY-MM-DD"
const JSON_INDENT = 2; // spaces used to pretty-print saved JSON

const SAVE_KEY_PREFIX = "ygo";
const SAVE_FORMAT = "ygo-tutoring-backup";
const SAVE_FORMAT_VERSION = 1;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`Could not read "${key}":`, err);
    return null;
  }
}

/* Lets savefile.js (when loaded) mirror writes to the profile's save file. */
function notifySaved(key) {
  if (typeof onSaveCommitted === "function") onSaveCommitted(key);
}

function saveData(data, key) {
  try {
    let toStore = data;
    if (isPlainObject(data)) {
      const raw = readRaw(key);
      if (raw) {
        const existing = JSON.parse(raw);
        if (isPlainObject(existing)) toStore = { ...existing, ...data };
      }
    }
    localStorage.setItem(key, JSON.stringify(toStore));
    notifySaved(key);
    return true;
  } catch (err) {
    console.warn(`Could not save "${key}":`, err);
    return false;
  }
}

function loadData(key) {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Could not parse "${key}":`, err);
    return null;
  }
}

function listSaveKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SAVE_KEY_PREFIX)) keys.push(key);
  }
  return keys.sort();
}

function buildBackup() {
  const data = {};
  listSaveKeys().forEach((key) => {
    data[key] = readRaw(key);
  });
  return {
    format: SAVE_FORMAT,
    version: SAVE_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

function exportAll(filename) {
  const name = filename || `ygo-backup-${new Date().toISOString().slice(0, ISO_DATE_LENGTH)}.json`;
  const blob = new Blob([JSON.stringify(buildBackup(), null, JSON_INDENT)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* `file` is a File from <input type="file">. Resolves to the list of keys
 * restored. Replaces each key present in the backup; keys not in the backup
 * are left untouched. Validates everything before writing anything. */
async function importAll(file) {
  const backup = JSON.parse(await file.text());
  if (!backup || backup.format !== SAVE_FORMAT || !isPlainObject(backup.data)) {
    throw new Error("Not a valid backup file.");
  }
  const entries = Object.entries(backup.data);
  entries.forEach(([key, value]) => {
    if (!key.startsWith(SAVE_KEY_PREFIX) || typeof value !== "string") {
      throw new Error(`Invalid entry in backup: "${key}"`);
    }
  });
  entries.forEach(([key, value]) => localStorage.setItem(key, value));
  return entries.map(([key]) => key);
}

/* Additive helper (does not alter any method above): removes one key. */
function removeData(key) {
  try {
    localStorage.removeItem(key);
    notifySaved(key);
    return true;
  } catch (err) {
    console.warn(`Could not remove "${key}":`, err);
    return false;
  }
}
