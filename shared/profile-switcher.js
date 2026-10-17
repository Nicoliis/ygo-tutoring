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
  return box;
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
