function typeColorClass(type) {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t.includes("link")) return "type-color-link";
  if (t.includes("synchro")) return "type-color-synchro";
  if (t.includes("xyz")) return "type-color-xyz";
  if (t.includes("fusion")) return "type-color-fusion";
  if (t.includes("ritual")) return "type-color-ritual";
  if (t.includes("normal monster")) return "type-color-normal";
  if (t.includes("monster")) return "type-color-effect";
  if (t.includes("spell")) return "type-color-spell";
  if (t.includes("trap")) return "type-color-trap";
  return "";
}
