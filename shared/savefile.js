/*
 * Per-profile save file on the player's PC (File System Access API).
 * A profile is linked to one .json file: created once, then rewritten automatically
 * after every save. The file handle lives in IndexedDB (localStorage can't hold it).
 * Browsers without the API fall back to download / file-input (manual, no autosave).
 * Depends on save-utils.js and profiles.js.
 */
const PROFILE_SAVE_FORMAT = "ygo-tutoring-profile-save";
const PROFILE_SAVE_VERSION = 1;
const GLOBAL_SAVE_KEYS = ["ygoProfiles", "ygoSetDates", "ygoSidebarCollapsed"];
const SAVEFILE_DB = "ygoSaveFiles";
const SAVEFILE_AUTOSAVE_MS = 800;

const saveFileSupported = typeof window !== "undefined" && "showSaveFilePicker" in window && "showOpenFilePicker" in window;
let saveFileTimer = null;

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SAVEFILE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("handles");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function handleStore(mode, run) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("handles", mode);
    const result = run(tx.objectStore("handles"));
    tx.oncomplete = () => resolve(result.result);
    tx.onerror = () => reject(tx.error);
  });
}

const getSaveHandle = (profileId) => handleStore("readonly", (s) => s.get(profileId)).catch(() => null);
const putSaveHandle = (profileId, handle) => handleStore("readwrite", (s) => s.put(handle, profileId));
const clearSaveHandle = (profileId) => handleStore("readwrite", (s) => s.delete(profileId)).catch(() => {});

/* Keys that belong to one profile. Sandbox uses the bare keys; others use `<base>_<id>`. */
function profileSaveKeys(profile) {
  const keys = listSaveKeys().filter((k) => !GLOBAL_SAVE_KEYS.includes(k));
  if (profile.id !== SANDBOX_ID) return keys.filter((k) => k.endsWith(`_${profile.id}`));
  const others = listProfiles().filter((p) => p.id !== SANDBOX_ID).map((p) => `_${p.id}`);
  return keys.filter((k) => !others.some((suffix) => k.endsWith(suffix)));
}

function keyBelongsToProfile(key, profile) {
  if (profile.id !== SANDBOX_ID) return key.endsWith(`_${profile.id}`);
  return !GLOBAL_SAVE_KEYS.includes(key);
}

function buildProfileSave(profile) {
  const data = {};
  profileSaveKeys(profile).forEach((key) => {
    data[key] = readRaw(key);
  });
  return { format: PROFILE_SAVE_FORMAT, version: PROFILE_SAVE_VERSION, savedAt: new Date().toISOString(), profile, data };
}

function saveFileName(profile) {
  const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile";
  return `ygo-${slug}.save.json`;
}

async function writeToHandle(handle, profile) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(buildProfileSave(profile), null, 2));
  await writable.close();
}

/* "granted" | "prompt" | "none" (no linked file). */
async function saveFileState(profile) {
  if (!saveFileSupported) return "none";
  const handle = await getSaveHandle(profile.id);
  if (!handle) return "none";
  return (await handle.queryPermission({ mode: "readwrite" })) === "granted" ? "granted" : "prompt";
}

async function linkedSaveFileName(profile) {
  const handle = saveFileSupported ? await getSaveHandle(profile.id) : null;
  return handle ? handle.name : null;
}

/* Must run from a click. Asks the player where to store the file, links it, writes it. */
async function createSaveFile(profile) {
  if (!saveFileSupported) {
    downloadProfileSave(profile);
    return;
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: saveFileName(profile),
    types: [{ description: "YGO save file", accept: { "application/json": [".json"] } }],
  });
  await putSaveHandle(profile.id, handle);
  await writeToHandle(handle, profile);
}

/* Must run from a click. Re-grants permission to a linked file after a browser restart. */
async function reconnectSaveFile(profile) {
  const handle = await getSaveHandle(profile.id);
  if (!handle) throw new Error("No save file linked.");
  if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") throw new Error("Permission to the save file was denied.");
  await writeToHandle(handle, profile);
}

async function saveNow(profile) {
  const handle = await getSaveHandle(profile.id);
  if (!handle) throw new Error("No save file linked.");
  await writeToHandle(handle, profile);
}

function downloadProfileSave(profile) {
  const blob = new Blob([JSON.stringify(buildProfileSave(profile), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = saveFileName(profile);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* Validates everything, then writes. Returns the imported profile. Replaces that profile's stored data. */
function applyProfileSave(save) {
  if (!save || save.format !== PROFILE_SAVE_FORMAT || !isPlainObject(save.data) || !isPlainObject(save.profile)) {
    throw new Error("Not a valid profile save file.");
  }
  const profile = save.profile;
  if (typeof profile.id !== "string" || !/^[a-z0-9]+$/i.test(profile.id) || typeof profile.name !== "string" || !GAME_MODES[profile.mode]) {
    throw new Error("The save file has an invalid profile.");
  }
  const entries = Object.entries(save.data);
  entries.forEach(([key, value]) => {
    if (!key.startsWith(SAVE_KEY_PREFIX) || typeof value !== "string" || !keyBelongsToProfile(key, profile)) {
      throw new Error(`Invalid entry in save file: "${key}"`);
    }
  });
  const registry = readProfileRegistry();
  const existing = registry.profiles.findIndex((p) => p.id === profile.id);
  const record = { id: profile.id, name: profile.name, mode: profile.mode, createdAt: profile.createdAt || new Date().toISOString() };
  if (existing === -1) {
    let name = record.name;
    for (let n = 2; validateProfileName(name, registry, null); n++) name = `${record.name} (${n})`;
    registry.profiles.push({ ...record, name });
  } else {
    registry.profiles[existing] = { ...registry.profiles[existing], ...record };
  }
  profileSaveKeys(record).forEach(removeData);
  entries.forEach(([key, value]) => localStorage.setItem(key, value));
  if (!writeProfileRegistry(registry)) throw new Error("Could not save: browser storage is unavailable or full.");
  return registry.profiles.find((p) => p.id === record.id);
}

/* Must run from a click. Picks a save file, restores the profile, and keeps the file linked. */
async function importSaveFile() {
  if (!saveFileSupported) {
    const file = await pickFileFallback();
    return applyProfileSave(JSON.parse(await file.text()));
  }
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: "YGO save file", accept: { "application/json": [".json"] } }],
  });
  const profile = applyProfileSave(JSON.parse(await (await handle.getFile()).text()));
  if ((await handle.requestPermission({ mode: "readwrite" })) === "granted") await putSaveHandle(profile.id, handle);
  return profile;
}

function pickFileFallback() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => (input.files[0] ? resolve(input.files[0]) : reject(new Error("No file chosen."))));
    input.click();
  });
}

/* ---- live mirroring ---------------------------------------------------- */

let saveFileWriteChain = Promise.resolve();
let saveFileStatus = { text: "", error: false };

function setSaveFileStatus(text, error) {
  saveFileStatus = { text, error: Boolean(error) };
  document.dispatchEvent(new CustomEvent("savefile-status", { detail: saveFileStatus }));
}

/* Rewrites the active profile's linked file from the current stored state. Writes never overlap. */
function mirrorToSaveFile() {
  saveFileWriteChain = saveFileWriteChain.then(async () => {
    try {
      const profile = getActiveProfile();
      if (!profile) return;
      const handle = await getSaveHandle(profile.id);
      if (!handle) return;
      if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
        setSaveFileStatus("Save file disconnected — click anywhere to reconnect", true);
        return;
      }
      await writeToHandle(handle, profile);
      setSaveFileStatus(`Saved ${new Date().toLocaleTimeString()}`, false);
    } catch (err) {
      console.warn("Could not write the save file:", err);
      setSaveFileStatus("Could not write the save file", true);
    }
  });
  return saveFileWriteChain;
}

/* Called by save-utils after every write/remove: a short debounce coalesces bursts of saves. */
function onSaveCommitted(key) {
  if (!saveFileSupported || typeof getActiveProfile !== "function") return;
  clearTimeout(saveFileTimer);
  saveFileTimer = setTimeout(() => {
    saveFileTimer = null;
    mirrorToSaveFile();
  }, 150);
}

/* On each page load: bring the file up to date, and if the browser forgot the permission
 * (new session), ask for it again on the first click/keypress, which is a user gesture. */
async function startSaveFileSync() {
  if (!saveFileSupported || typeof getActiveProfile !== "function") return;
  const profile = getActiveProfile();
  if (!profile) return;
  const state = await saveFileState(profile);
  if (state === "granted") {
    mirrorToSaveFile();
  } else if (state === "prompt") {
    setSaveFileStatus("Save file disconnected — click anywhere to reconnect", true);
    const reconnect = async () => {
      try {
        await reconnectSaveFile(profile);
        setSaveFileStatus(`Saved ${new Date().toLocaleTimeString()}`, false);
      } catch (err) {
        setSaveFileStatus("Save file disconnected — click anywhere to reconnect", true);
        document.addEventListener("pointerdown", reconnect, { once: true });
      }
    };
    document.addEventListener("pointerdown", reconnect, { once: true });
  }
}

/* Best effort: a save made just before leaving the page must not wait for the debounce. */
window.addEventListener("pagehide", () => {
  if (saveFileTimer) {
    clearTimeout(saveFileTimer);
    saveFileTimer = null;
    mirrorToSaveFile();
  }
});

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startSaveFileSync);
else startSaveFileSync();
