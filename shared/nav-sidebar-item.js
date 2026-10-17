function buildSidebarItem(page, isCurrent) {
  const li = document.createElement("li");

  if (isCurrent) {
    const span = document.createElement("span");
    span.className = "sidebar-link sidebar-link-current";
    span.setAttribute("aria-current", "page");
    span.textContent = page.label;
    li.appendChild(span);
  } else {
    const a = document.createElement("a");
    a.className = "sidebar-link";
    a.href = hrefFromRoot(page.href);
    a.textContent = page.label;
    li.appendChild(a);
  }

  return li;
}

function buildBackToMenuItem() {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.className = "sidebar-link sidebar-link-back";
  a.href = hrefFromRoot("menu.html");
  a.textContent = "← Back to menu";
  a.setAttribute("aria-label", "Back to main menu");
  li.appendChild(a);
  return li;
}
