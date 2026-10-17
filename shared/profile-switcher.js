function buildProfileSwitcher() {
  const profile = getActiveProfile();
  if (!profile) return null;
  const box = document.createElement("div");
  box.className = "sidebar-profile";

  const label = document.createElement("span");
  label.className = "sidebar-profile-name";
  label.textContent = profile.name;
  label.title = `Active profile: ${profile.name}`;

  const link = document.createElement("a");
  link.className = "sidebar-link";
  link.href = hrefForSlug("");
  link.textContent = "Switch profile";
  link.setAttribute("aria-label", `Switch profile (current: ${profile.name})`);

  box.appendChild(label);
  box.appendChild(link);
  if (typeof saveFileState === "function") addSaveFileLink(box, profile);
  return box;
}

/* Shown only when the save file needs action: not created yet, or permission must be re-granted. */
function addSaveFileLink(box, profile) {
  saveFileState(profile).then((state) => {
    if (state === "granted") return;
    const btn = document.createElement("a");
    btn.className = "sidebar-link";
    btn.href = "#";
    btn.textContent = state === "prompt" ? "Reconnect save file" : "Create save file";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await (state === "prompt" ? reconnectSaveFile(profile) : createSaveFile(profile));
        btn.remove();
      } catch (err) {
        if (err.name !== "AbortError") alertDialog(err.message);
      }
    });
    box.appendChild(btn);
  });
}

function initProfileSwitcher() {
  const aside = document.getElementById("appSidebar");
  const box = buildProfileSwitcher();
  if (aside && box) aside.insertBefore(box, aside.querySelector(".sidebar-area") || aside.querySelector("nav"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfileSwitcher);
} else {
  initProfileSwitcher();
}
