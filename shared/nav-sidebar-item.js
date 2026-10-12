function buildSidebarItem(entry, activeSlug) {
  const li = document.createElement("li");

  if (entry.slug === activeSlug) {
    const span = document.createElement("span");
    span.className = "sidebar-link sidebar-link-current";
    span.setAttribute("aria-current", "page");
    span.textContent = entry.label;
    li.appendChild(span);
  } else {
    const a = document.createElement("a");
    a.className = "sidebar-link";
    a.href = hrefForSlug(entry.slug);
    a.textContent = entry.label;
    li.appendChild(a);
  }

  return li;
}
