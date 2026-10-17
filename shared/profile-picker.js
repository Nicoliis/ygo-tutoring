const profileListEl = document.getElementById("profileList");
const profileStatusEl = document.getElementById("profileStatus");
const createProfileForm = document.getElementById("createProfileForm");
const profileNameInput = document.getElementById("profileNameInput");
const profileModeSelect = document.getElementById("profileModeSelect");
const toolsSectionEl = document.getElementById("toolsSection");
const toolsHeadingEl = document.getElementById("toolsHeading");

function setProfileStatus(message, isError) {
  profileStatusEl.textContent = message || "";
  profileStatusEl.classList.toggle("error", Boolean(isError));
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
  info.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "profile-actions";
  actions.append(
    buildProfileButton("Play", `Play as ${profile.name}`, () => runAction(() => setActiveProfile(profile.id)), true),
    buildProfileButton("Rename", `Rename ${profile.name}`, () => {
      const input = prompt("New name for this profile:", profile.name);
      if (input === null) return;
      runAction(() => renameProfile(profile.id, input));
    }),
    buildProfileButton("Delete", `Delete ${profile.name}`, () => {
      const extra = profile.id === SANDBOX_ID ? " This removes your pre-existing collection and deck data." : "";
      if (!confirm(`Delete profile "${profile.name}" and all its data? This can't be undone.${extra}`)) return;
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

  toolsSectionEl.hidden = !active;
  if (active) toolsHeadingEl.textContent = `Tools — playing as ${active.name}`;
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
    profileNameInput.value = "";
    setProfileStatus("");
  } catch (err) {
    setProfileStatus(err.message, true);
  }
  renderProfiles();
});

buildModeOptions();
renderProfiles();
