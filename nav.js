/* Shared sidebar navigation — included identically by index.html, collection.html,
   and tracker.html. See specs/007-sidebar-navigation/contracts/nav-component.md. */
(() => {
  "use strict";

  const COLLAPSE_KEY = "ygoSidebarCollapsed";
  const MOBILE_QUERY = "(max-width: 640px)";

  const NAV_ENTRIES = [
    { label: "Proxy Sheet Builder", href: "index.html" },
    { label: "Draft Collection Manager", href: "collection.html" },
    { label: "Progression Series Pack Puller", href: "tracker.html" },
  ];

  function currentPage() {
    const path = window.location.pathname;
    const file = path.substring(path.lastIndexOf("/") + 1);
    return file === "" ? "index.html" : file;
  }

  function readCollapsedState() {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (err) {
      /* localStorage unavailable (e.g. privacy mode) — fall through to default */
    }
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function writeCollapsedState(collapsed) {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "true" : "false");
    } catch (err) {
      /* ignore persistence failures */
    }
  }

  function buildSidebar() {
    const active = currentPage();

    const aside = document.createElement("aside");
    aside.id = "appSidebar";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "appSidebarToggle";
    toggle.setAttribute("aria-label", "Toggle navigation sidebar");
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "☰";
    aside.appendChild(toggle);

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Tool navigation");

    const list = document.createElement("ul");
    nav.appendChild(list);

    NAV_ENTRIES.forEach((entry) => {
      const li = document.createElement("li");
      const isActive = entry.href === active;

      if (isActive) {
        const span = document.createElement("span");
        span.className = "sidebar-link sidebar-link-current";
        span.setAttribute("aria-current", "page");
        span.textContent = entry.label;
        li.appendChild(span);
      } else {
        const a = document.createElement("a");
        a.className = "sidebar-link";
        a.href = entry.href;
        a.textContent = entry.label;
        li.appendChild(a);
      }

      list.appendChild(li);
    });

    aside.appendChild(nav);

    toggle.addEventListener("click", () => {
      const collapsed = !aside.classList.contains("collapsed");
      applyCollapsedState(aside, toggle, collapsed);
      writeCollapsedState(collapsed);
    });

    return aside;
  }

  function applyCollapsedState(aside, toggle, collapsed) {
    aside.classList.toggle("collapsed", collapsed);
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function init() {
    const aside = buildSidebar();
    document.body.insertBefore(aside, document.body.firstChild);
    document.body.classList.add("has-app-sidebar");

    const toggle = aside.querySelector("#appSidebarToggle");
    applyCollapsedState(aside, toggle, readCollapsedState());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
