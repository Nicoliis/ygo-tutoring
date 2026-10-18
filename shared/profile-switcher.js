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

/* Save-file line + action in the sidebar. Live status where the browser can keep a file open;
 * elsewhere (Firefox, Safari) a manual download, since a web page can't write to a file there. */
function addSaveFileLink(box, profile) {
  const status = document.createElement("span");
  status.className = "sidebar-profile-name";
  status.setAttribute("aria-live", "polite");
  box.appendChild(status);
  const showStatus = ({ text, error }) => {
    status.textContent = text;
    status.style.color = error ? "var(--danger, #e5534b)" : "";
  };
  document.addEventListener("savefile-status", (e) => showStatus(e.detail));
  showStatus(saveFileStatus);

  const btn = document.createElement("a");
  btn.className = "sidebar-link";
  btn.href = "#";
  box.appendChild(btn);

  saveFileState(profile).then((state) => {
    if (!saveFileSupported) {
      status.textContent = "Auto-save to file needs Chrome or Edge";
      btn.textContent = "Download save file";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        downloadProfileSave(profile);
      });
    } else if (state === "none") {
      btn.textContent = "Create save file";
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await createSaveFile(profile);
          btn.remove();
          showStatus({ text: `Saved ${new Date().toLocaleTimeString()}`, error: false });
        } catch (err) {
          if (err.name !== "AbortError") alertDialog(err.message);
        }
      });
    } else {
      btn.remove();
    }
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
