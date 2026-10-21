/*
 * The link between the two players' browsers: one ordered, reliable data channel made with the browser's built-in
 * peer-to-peer support, set up by exchanging two codes by hand (no server of this project takes part). A public STUN
 * address helps the browsers find a path to each other.
 *
 *   const link = createLink({ onStatus(status, detail), onMessage(message) })
 *   link.createOffer()        -> Promise<{ code, roomId }>   the invitation code (creator)
 *   link.acceptOffer(text)    -> Promise<{ code, roomId }>   the reply code (joiner)
 *   link.acceptAnswer(text)   -> Promise<void>               the reply pasted by the creator
 *   link.send(message) -> boolean, link.close()
 *
 * Statuses: "gathering" | "waiting-reply" | "connecting" | "connected" | "disconnected" | "failed".
 * Only messages of the allowed types (the table messages and the liveness ping) are passed on. Needs duel-code.js.
 */
const STUN_URL = "stun:stun.l.google.com:19302";
const CONNECT_TIMEOUT_MS = 30000; // gives up on a link that does not open
const ICE_GATHER_TIMEOUT_MS = 4000; // longest wait for connection candidates before showing a code
const LIVENESS_PING_MS = 3000; // heartbeat while connected
const LIVENESS_TIMEOUT_MS = 9000; // silence after which the opponent counts as gone
const MESSAGE_MAX_LENGTH = 200000; // a bigger message is not one of ours
const ALLOWED_MESSAGES = ["hello", "snapshot", "intent", "event", "resync", "refused", "ping", "pong"];
const ROOM_ID_LENGTH = 12;

function newRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_ID_LENGTH));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, ROOM_ID_LENGTH);
}

function waitForGathering(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const cleanup = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onChange);
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(); // use the candidates found so far
    }, ICE_GATHER_TIMEOUT_MS);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

function createLink({ onStatus = () => {}, onMessage = () => {} }) {
  let pc = null;
  let channel = null;
  let status = "idle";
  let roomId = null;
  let connectTimer = null;
  let pingTimer = null;
  let lastHeard = 0;
  let wasConnected = false;

  function setStatus(next, detail) {
    status = next;
    onStatus(next, detail);
  }

  function stopTimers() {
    clearTimeout(connectTimer);
    clearInterval(pingTimer);
    connectTimer = null;
    pingTimer = null;
  }

  function fail(detail) {
    stopTimers();
    if (status !== "failed" && status !== "disconnected") setStatus(wasConnected ? "disconnected" : "failed", detail);
  }

  function startConnectTimer() {
    clearTimeout(connectTimer);
    connectTimer = setTimeout(() => {
      if (status === "connecting") {
        fail("The connection could not be made in time. Some networks block direct connections between players.");
        if (pc) pc.close();
      }
    }, CONNECT_TIMEOUT_MS);
  }

  function startLiveness() {
    lastHeard = Date.now();
    clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (Date.now() - lastHeard > LIVENESS_TIMEOUT_MS) {
        fail("The other player stopped answering.");
        if (pc) pc.close();
        return;
      }
      send({ type: "ping" });
    }, LIVENESS_PING_MS);
  }

  function wireChannel(ch) {
    channel = ch;
    ch.onopen = () => {
      clearTimeout(connectTimer);
      wasConnected = true;
      setStatus("connected");
      startLiveness();
    };
    ch.onclose = () => {
      if (status === "connected") fail("The other player left or the connection was lost.");
    };
    ch.onmessage = (event) => {
      lastHeard = Date.now();
      let message;
      try {
        if (typeof event.data !== "string" || event.data.length > MESSAGE_MAX_LENGTH) return;
        message = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      if (!message || !ALLOWED_MESSAGES.includes(message.type)) return; // nothing else is ever passed on
      if (message.type === "ping") send({ type: "pong" });
      else if (message.type !== "pong") onMessage(message);
    };
  }

  function open() {
    pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_URL }] });
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") fail("The connection failed. Some networks block direct connections between players.");
      else if (pc.connectionState === "disconnected" && status === "connected") fail("The connection was lost.");
    };
  }

  function send(message) {
    if (!channel || channel.readyState !== "open") return false;
    channel.send(JSON.stringify(message));
    return true;
  }

  async function createOffer() {
    open();
    roomId = newRoomId();
    wireChannel(pc.createDataChannel("duel", { ordered: true }));
    setStatus("gathering");
    await pc.setLocalDescription(await pc.createOffer());
    await waitForGathering(pc);
    setStatus("waiting-reply");
    return { code: encodeCode({ kind: "offer", roomId, sdp: pc.localDescription.sdp }), roomId };
  }

  async function acceptOffer(text) {
    const decoded = decodeCode(text);
    if (!decoded.ok) throw new Error(decoded.reason);
    if (decoded.kind !== "offer") throw new Error("That is a reply code. Paste the invitation code the room creator sent you.");
    open();
    roomId = decoded.roomId;
    pc.ondatachannel = (event) => wireChannel(event.channel);
    setStatus("gathering");
    await pc.setRemoteDescription({ type: "offer", sdp: decoded.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await waitForGathering(pc);
    setStatus("connecting");
    startConnectTimer();
    return { code: encodeCode({ kind: "answer", roomId, sdp: pc.localDescription.sdp }), roomId };
  }

  async function acceptAnswer(text) {
    if (status !== "waiting-reply") throw new Error("This room is not waiting for a reply.");
    const decoded = decodeCode(text);
    if (!decoded.ok) throw new Error(decoded.reason);
    if (decoded.kind !== "answer") throw new Error("That is an invitation code. Paste the reply code your friend sent back.");
    if (decoded.roomId !== roomId) throw new Error("That reply does not belong to this room. Ask for a reply to the code you are showing.");
    await pc.setRemoteDescription({ type: "answer", sdp: decoded.sdp });
    setStatus("connecting");
    startConnectTimer();
  }

  function close() {
    stopTimers();
    wasConnected = false;
    if (channel) channel.onclose = null;
    if (pc) pc.close();
    pc = null;
    channel = null;
    status = "idle";
  }

  return { createOffer, acceptOffer, acceptAnswer, send, close, getStatus: () => status };
}
