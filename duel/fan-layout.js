/*
 * Where the round buttons of a fan menu go. Pure: numbers in, numbers out; no DOM.
 *
 *   fanLayout({ anchor, count, buttonPx, gap, radius }) -> [{ x, y }]   (centres of the buttons, left to right)
 *   fanSubmenu({ anchor, count, buttonPx, gap }) -> [{ x, y }]           (a submenu: a tight block right on its parent button)
 *   fanShift(points, bounds, half) -> { dx, dy }                         (how far to slide a whole fan to fit the window)
 *
 * The same shape every time, so the buttons can be found without looking: they sit on an arc of FAN_RADIUS_PX around
 * `anchor`, centred straight above it, `count` buttons spaced just far enough apart not to touch (a fan of two or
 * three is a short arc, five nearly a semicircle; a longer one keeps to the semicircle with a wider radius). A submenu is a fan around the button it came from,
 * so every choice opens above the previous one. Fans never turn or flip: when one would leave the window `fanShift`
 * slides it as a whole.
 */
const FAN_BUTTON_PX = 56; // diameter of a fan button
const FAN_GAP_PX = 4; // space between neighbouring buttons
const FAN_RADIUS_PX = 80; // distance from the anchor to the button centres
const FAN_UP_DEG = -90; // straight up, in screen angles (0 = right)
const FAN_SUBMENU_ONE_ROW_MAX = 4; // a submenu of up to this many buttons is one row; more are two rows

function fanLayout({ anchor, count, buttonPx = FAN_BUTTON_PX, gap = FAN_GAP_PX, radius = FAN_RADIUS_PX }) {
  const chord = buttonPx + gap;
  const touching = (2 * Math.asin(Math.min(1, chord / (2 * radius))) * 180) / Math.PI; // angle between neighbours at this radius
  const stepDeg = count > 1 ? Math.min(touching, 180 / (count - 1)) : 0; // never wider than a semicircle in total
  const far = count > 1 && stepDeg < touching ? chord / (2 * Math.sin((stepDeg * Math.PI) / 360)) : radius; // then the radius grows instead
  return Array.from({ length: count }, (_, i) => {
    const angle = ((FAN_UP_DEG + (i - (count - 1) / 2) * stepDeg) * Math.PI) / 180;
    return { x: anchor.x + far * Math.cos(angle), y: anchor.y + far * Math.sin(angle) };
  });
}

/*
 * A submenu sits right on the button it came from, so choosing needs little or no mouse movement: a row of buttons
 * (two rows from five buttons up) centred on the parent. They never touch each other but they do cover the parent.
 */
function fanSubmenu({ anchor, count, buttonPx = FAN_BUTTON_PX, gap = FAN_GAP_PX }) {
  const pitch = buttonPx + gap;
  const rows = count > FAN_SUBMENU_ONE_ROW_MAX ? [Math.ceil(count / 2), Math.floor(count / 2)] : [count];
  const points = [];
  rows.forEach((inRow, r) => {
    const y = anchor.y + (r - (rows.length - 1) / 2) * pitch;
    for (let i = 0; i < inRow; i++) points.push({ x: anchor.x + (i - (inRow - 1) / 2) * pitch, y });
  });
  return points;
}

/* The slide (in pixels) that brings every point, with `half` of a button around it, inside `bounds` as far as possible. */
function fanShift(points, bounds, half) {
  const low = (key) => Math.min(...points.map((p) => p[key])) - half;
  const high = (key) => Math.max(...points.map((p) => p[key])) + half;
  const slide = (from, to, min, max) => (to - from > max - min ? min - from : from < min ? min - from : to > max ? max - to : 0);
  return { dx: slide(low("x"), high("x"), bounds.left, bounds.right), dy: slide(low("y"), high("y"), bounds.top, bounds.bottom) };
}
