const NAV_ENTRIES = [
  { label: "Welcome", slug: "" },
  { label: "Draft Collection Manager", slug: "collection" },
  { label: "Booster Draft", slug: "draft" },
  { label: "Progression Series Pack Puller", slug: "tracker" },
  { label: "Progression Run", slug: "progression" },
  { label: "Proxy Sheet Builder", slug: "proxy-builder" },
];

const TOOL_SLUGS = NAV_ENTRIES.map((entry) => entry.slug).filter(Boolean);

function pageIsInsideToolFolder() {
  return TOOL_SLUGS.some((slug) => window.location.pathname.includes(`/${slug}/`));
}

function currentSlug() {
  return TOOL_SLUGS.find((slug) => window.location.pathname.includes(`/${slug}/`)) || "";
}

function hrefForSlug(slug) {
  const prefix = pageIsInsideToolFolder() ? "../" : "";
  return slug ? `${prefix}${slug}/index.html` : `${prefix}index.html`;
}
