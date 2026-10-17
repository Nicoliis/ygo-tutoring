/*
 * Profile registry + per-profile storage key resolution.
 * All persistence goes through saveData/loadData/removeData (save-utils.js).
 * Every key starts with "ygo" so exportAll/importAll cover profiles automatically.
 */
const PROFILES_KEY = "ygoProfiles";
const SANDBOX_ID = "sandbox";
const PROFILE_NAME_MAX = 40;

const GAME_MODES = {
  progression: { label: "Progression Run", selectable: true },
  sandbox: { label: "Sandbox", selectable: false },
};

function readProfileRegistry() {
  const stored = loadData(PROFILES_KEY);
  if (stored && Array.isArray(stored.profiles)) return stored;
  const hasLegacy = loadData("ygoCollection") !== null || loadData("ygoDeck") !== null;
  const registry = { activeId: null, profiles: [] };
  if (hasLegacy) {
    registry.profiles.push({
      id: SANDBOX_ID,
      name: "Sandbox",
      mode: "sandbox",
      createdAt: new Date().toISOString(),
    });
    saveData(registry, PROFILES_KEY);
  }
  return registry;
}

function writeProfileRegistry(registry) {
  return saveData(registry, PROFILES_KEY);
}

function listProfiles() {
  return readProfileRegistry().profiles;
}

function getActiveProfile() {
  const registry = readProfileRegistry();
  return registry.profiles.find((p) => p.id === registry.activeId) || null;
}

function setActiveProfile(id) {
  const registry = readProfileRegistry();
  if (!registry.profiles.some((p) => p.id === id)) throw new Error("Profile not found.");
  registry.activeId = id;
  if (!writeProfileRegistry(registry)) throw new Error("Could not save: browser storage is unavailable or full.");
}

function profileKey(baseKey) {
  const active = getActiveProfile();
  if (!active) throw new Error("No active profile.");
  return active.id === SANDBOX_ID ? baseKey : `${baseKey}_${active.id}`;
}

function validateProfileName(name, registry, ignoreId) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "Enter a profile name.";
  if (trimmed.length > PROFILE_NAME_MAX) return `Name must be at most ${PROFILE_NAME_MAX} characters.`;
  const clash = registry.profiles.some(
    (p) => p.id !== ignoreId && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (clash) return "A profile with that name already exists.";
  return null;
}

function generateProfileId(registry) {
  let id;
  do {
    id = "p" + Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  } while (registry.profiles.some((p) => p.id === id));
  return id;
}

function createProfile(name, mode) {
  const registry = readProfileRegistry();
  const modeDef = GAME_MODES[mode];
  if (!modeDef || !modeDef.selectable) throw new Error("Choose a game mode.");
  const error = validateProfileName(name, registry, null);
  if (error) throw new Error(error);
  const profile = {
    id: generateProfileId(registry),
    name: String(name).trim(),
    mode,
    createdAt: new Date().toISOString(),
  };
  registry.profiles.push(profile);
  registry.activeId = profile.id;
  if (!writeProfileRegistry(registry)) throw new Error("Could not save: browser storage is unavailable or full.");
  return profile;
}

function renameProfile(id, name) {
  const registry = readProfileRegistry();
  const index = registry.profiles.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Profile not found.");
  const error = validateProfileName(name, registry, id);
  if (error) throw new Error(error);
  registry.profiles[index] = { ...registry.profiles[index], name: String(name).trim() };
  if (!writeProfileRegistry(registry)) throw new Error("Could not save: browser storage is unavailable or full.");
}

/* Caller must have asked for confirmation. Removes only this profile's data. */
function deleteProfile(id) {
  const registry = readProfileRegistry();
  if (!registry.profiles.some((p) => p.id === id)) throw new Error("Profile not found.");
  if (id === SANDBOX_ID) {
    removeData("ygoCollection");
    removeData("ygoDeck");
  } else {
    listSaveKeys()
      .filter((key) => key.endsWith(`_${id}`))
      .forEach(removeData);
  }
  registry.profiles = registry.profiles.filter((p) => p.id !== id);
  if (registry.activeId === id) registry.activeId = null;
  if (!writeProfileRegistry(registry)) throw new Error("Could not save: browser storage is unavailable or full.");
}
