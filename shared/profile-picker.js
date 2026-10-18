const profileListEl = document.getElementById("profileList");
const profileStatusEl = document.getElementById("profileStatus");
const createProfileForm = document.getElementById("createProfileForm");
const profileNameInput = document.getElementById("profileNameInput");
const profileModeSelect = document.getElementById("profileModeSelect");

function setProfileStatus(message, isError) {
  profileStatusEl.textContent = message || "";
  profileStatusEl.classList.toggle("error", Boolean(isError));
}

function saveFileLabel(state, name) {
  if (!saveFileSupported) return "Auto-save to file needs Chrome or Edge (use Download save file)";
  if (state === "granted") return `Save file: ${name || "linked"} (auto-saving)`;
  if (state === "prompt") return `Save file: ${name || "linked"} (needs reconnecting)`;
  return "No save file yet";
}

function describeProfile(profile) {
  const modeLabel = GAME_MODES[profile.mode] ? GAME_MODES[profile.mode].label : profile.mode;
  if (profile.mode !== "progression") return modeLabel;
  return `${modeLabel} · ${runSummary(loadRun(profile.id), MAINLINE_BOOSTERS)}`;
}

function runAction(action) {
  try {
    action();
    setProfileStatus("");
  } catch (err) {
    setProfileStatus(err.message, true);
  }
  renderProfiles();
}

async function runAsyncAction(action) {
  try {
    await action();
    setProfileStatus("");
  } catch (err) {
    if (err.name !== "AbortError") setProfileStatus(err.message, true);
  }
  renderProfiles();
}

function buildProfileButton(label, ariaLabel, onClick, primary) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn " + (primary ? "btn-primary" : "btn-secondary");
  btn.textContent = label;
  btn.setAttribute("aria-label", ariaLabel);
  btn.addEventListener("click", onClick);
  return btn;
}

function buildProfileItem(profile, isActive) {
  const li = document.createElement("li");
  li.className = "profile-item" + (isActive ? " profile-item-active" : "");

  const info = document.createElement("div");
  info.className = "profile-info";
  const name = document.createElement("strong");
  name.textContent = profile.name + (isActive ? " (active)" : "");
  const meta = document.createElement("span");
  meta.className = "profile-meta";
  meta.textContent = describeProfile(profile);
  const fileMeta = document.createElement("span");
  fileMeta.className = "profile-meta";
  fileMeta.textContent = "Save file: …";
  Promise.all([saveFileState(profile), linkedSaveFileName(profile)]).then(([state, fileName]) => {
    fileMeta.textContent = saveFileLabel(state, fileName);
    if (state === "granted") return;
    const label = !saveFileSupported ? "Download save file" : state === "prompt" ? "Reconnect save file" : "Create save file";
    actions.children[0].after(
      buildProfileButton(label, `${label} for ${profile.name}`, () => runAsyncAction(async () => {
        await (state === "prompt" ? reconnectSaveFile(profile) : createSaveFile(profile));
        if (!saveFileSupported) return;
        setActiveProfile(profile.id);
        window.location.href = "menu.html";
      }))
    );
  });
  info.append(name, meta, fileMeta);

  const actions = document.createElement("div");
  actions.className = "profile-actions";
  actions.append(
    buildProfileButton("Play", `Play as ${profile.name}`, () => {
      try {
        setActiveProfile(profile.id);
        window.location.href = "menu.html";
      } catch (err) {
        setProfileStatus(err.message, true);
      }
    }, true),
    buildProfileButton("Rename", `Rename ${profile.name}`, async () => {
      const input = await promptDialog("New name for this profile:", profile.name, { title: "Rename profile" });
      if (input === null) return;
      runAction(() => renameProfile(profile.id, input));
    }),
    buildProfileButton("Delete", `Delete ${profile.name}`, async () => {
      const extra = profile.id === SANDBOX_ID ? " This removes your pre-existing collection and deck data." : "";
      const ok = await confirmDialog(`Delete profile "${profile.name}" and all its data? This can't be undone.${extra}`, { title: "Delete profile", confirmLabel: "Delete" });
      if (!ok) return;
      clearSaveHandle(profile.id); // the file on disk is left alone
      runAction(() => deleteProfile(profile.id));
    })
  );

  li.append(info, actions);
  return li;
}

function renderProfiles() {
  const profiles = listProfiles();
  const active = getActiveProfile();
  profileListEl.innerHTML = "";
  if (profiles.length === 0) {
    const empty = document.createElement("li");
    empty.className = "profile-empty";
    empty.textContent = "No profiles yet — create your first one below.";
    profileListEl.appendChild(empty);
  }
  profiles.forEach((p) => profileListEl.appendChild(buildProfileItem(p, Boolean(active) && active.id === p.id)));

}

function buildModeOptions() {
  Object.keys(GAME_MODES)
    .filter((mode) => GAME_MODES[mode].selectable)
    .forEach((mode) => {
      const option = document.createElement("option");
      option.value = mode;
      option.textContent = GAME_MODES[mode].label;
      profileModeSelect.appendChild(option);
    });
}

createProfileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    createProfile(profileNameInput.value, profileModeSelect.value);
    window.location.href = "menu.html"; // a new profile is active right away: go to the menu
    return;
  } catch (err) {
    setProfileStatus(err.message, true);
  }
  renderProfiles();
});

document.getElementById("importSaveBtn").addEventListener("click", () =>
  runAsyncAction(async () => {
    const profile = await importSaveFile();
    setProfileStatus(`Imported "${profile.name}".`);
  })
);

buildModeOptions();
renderProfiles();
