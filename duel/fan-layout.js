/*
 * Where the round buttons of a fan menu go. Pure: numbers in, numbers out; no DOM.
 *
 *   fanLayout({ anchor, count, direction, span, buttonPx, gap, bounds }) -> [{ x, y }]  (centres of the buttons)
 *
 * The buttons sit on an arc around `anchor` ({ x, y }), centred on `direction` (degrees, 0 = right, -90 = up) and
 * `span` degrees wide. The radius is the smallest that keeps neighbouring buttons `gap` apart (never below
 * FAN_MIN_RADIUS_PX). When a button would leave `bounds` ({ left, top, right, bottom }) the arc is turned to the
 * nearest direction where all fit; if none does, a narrower arc (with a larger radius) is tried; as a last resort
 * the buttons are moved inside the bounds.
 */
const FAN_BUTTON_PX = 56; // diameter of a fan button
const FAN_GAP_PX = 8; // space between neighbouring buttons
const FAN_MIN_RADIUS_PX = 70; // the smallest distance from the anchor to a button centre
const FAN_FIRST_SPAN_DEG = 180; // the first fan is a semicircle
const FAN_SUB_SPAN_DEG = 120; // a submenu fans out from its button
const FAN_TURN_STEP_DEG = 15; // how far the arc is turned each try when it does not fit
const FAN_TURN_TRIES = 12; // tries on each side (a full turn)
const FAN_NARROWER_SPANS = [1, 0.75, 0.5]; // fractions of the span tried when no direction fits (the radius grows with them)

function fanArc(anchor, count, direction, span, buttonPx, gap) {
  const step = count > 1 ? span / (count - 1) : 0;
  const chord = buttonPx + gap;
  const radius = count > 1 ? Math.max(FAN_MIN_RADIUS_PX, chord / (2 * Math.sin(Math.min(step, 180) * Math.PI / 360))) : FAN_MIN_RADIUS_PX;
  return Array.from({ length: count }, (_, i) => {
    const angle = (count > 1 ? direction - span / 2 + step * i : direction) * Math.PI / 180;
    return { x: anchor.x + radius * Math.cos(angle), y: anchor.y + radius * Math.sin(angle) };
  });
}

/* How far, in total, the buttons stick out of the bounds (0 when all fit). */
function fanOverflow(points, bounds, half) {
  return points.reduce(
    (sum, p) => sum + Math.max(0, bounds.left + half - p.x) + Math.max(0, p.x - (bounds.right - half)) + Math.max(0, bounds.top + half - p.y) + Math.max(0, p.y - (bounds.bottom - half)),
    0,
  );
}

function fanLayout({ anchor, count, direction, span, buttonPx = FAN_BUTTON_PX, gap = FAN_GAP_PX, bounds }) {
  const half = buttonPx / 2;
  const tries = [0];
  for (let i = 1; i <= FAN_TURN_TRIES; i++) tries.push(i * FAN_TURN_STEP_DEG, -i * FAN_TURN_STEP_DEG);
  let best = null;
  for (const fraction of FAN_NARROWER_SPANS) {
    for (const turn of tries) {
      const points = fanArc(anchor, count, direction + turn, span * fraction, buttonPx, gap);
      const overflow = fanOverflow(points, bounds, half);
      if (overflow === 0) return points;
      if (!best || overflow < best.overflow) best = { points, overflow };
    }
  }
  return best.points.map((p) => ({
    x: Math.min(Math.max(p.x, bounds.left + half), bounds.right - half),
    y: Math.min(Math.max(p.y, bounds.top + half), bounds.bottom - half),
  }));
}
