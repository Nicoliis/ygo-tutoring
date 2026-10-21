/*
 * Connection codes: the text the two players pass to each other by hand. Pure, no DOM, no network.
 *
 *   encodeCode({ kind: "offer" | "answer", roomId, sdp }) -> "YGO1.<base64url>"
 *   decodeCode(text) -> { ok: true, kind, roomId, sdp } | { ok: false, reason }
 *
 * decodeCode finds the code inside whatever was pasted, so extra spaces, line breaks and chat text around it are fine.
 */
const CODE_PREFIX = "YGO1.";
const CODE_VERSION = 1;
const CODE_KINDS = ["offer", "answer"];
const CODE_MAX_LENGTH = 20000; // a longer text is not one of our codes
const CODE_PATTERN = /YGO1\.[A-Za-z0-9_-]+/;

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeCode({ kind, roomId, sdp }) {
  return CODE_PREFIX + toBase64Url(JSON.stringify({ v: CODE_VERSION, k: kind, r: roomId, s: sdp }));
}

function decodeCode(text) {
  const source = String(text === undefined || text === null ? "" : text);
  if (source.length > CODE_MAX_LENGTH * 4) return { ok: false, reason: "That text is too long to be a connection code." };
  const found = CODE_PATTERN.exec(source);
  if (!found) return { ok: false, reason: "That is not a connection code. Paste the whole code you received." };
  const token = found[0];
  if (token.length > CODE_MAX_LENGTH) return { ok: false, reason: "That code is too long to be valid." };
  let data;
  try {
    data = JSON.parse(fromBase64Url(token.slice(CODE_PREFIX.length)));
  } catch (err) {
    return { ok: false, reason: "That code is damaged. Copy it again and paste the whole thing." };
  }
  if (!data || data.v !== CODE_VERSION) return { ok: false, reason: "That code comes from a different version of the room." };
  if (!CODE_KINDS.includes(data.k) || typeof data.r !== "string" || !data.r || typeof data.s !== "string" || !data.s) {
    return { ok: false, reason: "That code is damaged. Copy it again and paste the whole thing." };
  }
  return { ok: true, kind: data.k, roomId: data.r, sdp: data.s };
}
