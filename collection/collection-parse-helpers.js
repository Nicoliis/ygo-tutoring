function parsePositiveInt(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function parseNonNegativeInt(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
