/*
 * Duel Room behaviour: the room's screens and the flow from creating or joining, through the link, to the shared table,
 * dropping and reconnecting. The rules are in duel-table.js, the order of events in duel-session.js, the network in
 * duel-link.js and the drawing in views/duel-view.js. Needs dialogs.js (confirmDialog), save-utils.js and profiles.js.
 */
const SAVED_DUEL_KEY = "ygoDuelRoom"; // the last duel of this browser: { duelId, role, table }
const CODE_EXPIRY_MS = 600000; // after this the page suggests a new invitation (10 minutes)
const COPIED_MESSAGE = "Code copied. Send it to your friend.";
const DEFAULT_PLAYER_NAME = "Player";
const PRACTICE_OPPONENT_NAME = "Practice opponent"; // the empty side of a practice duel

const duelRootEl = document.getElementById("duelRoot");
let room = {
  phase: "start",
  status: "",
  error: "",
  notice: "",
  code: "",
  role: null,
  link: null,
  session: null,
  expiryTimer: null,
  reconnecting: null, // the saved duel being resumed, when there is one
  practice: false, // playing alone against an empty side (no link)
};

/* ---- the saved duel ---- */

function readSavedDuel() {
  const saved = loadData(SAVED_DUEL_KEY);
  return saved && saved.table && Array.isArray(saved.table.players) ? saved : null;
}

function saveDuel() {
  if (room.practice) return; // a practice duel is never saved
  if (!room.session || !room.session.getTable()) return;
  saveData({ duelId: room.session.getTable().duelId, role: room.role, table: room.session.getTable() }, SAVED_DUEL_KEY);
}

function myName() {
  const profile = typeof getActiveProfile === "function" ? getActiveProfile() : null;
  return cleanName(profile && profile.name) || DEFAULT_PLAYER_NAME;
}

/* ---- drawing ---- */

function drawRoom() {
  const saved = readSavedDuel();
  renderRoom(
    duelRootEl,
    {
      phase: room.phase,
      status: room.status,
      error: room.error,
      notice: room.notice,
      code: room.code,
      table: room.session ? room.session.getTable() : null,
      deckChoice: room.phase === "connected" ? deckChoiceModel() : null,
      board: room.session && room.session.getTable() ? boardModel() : null,
      rematch: rematchState(),
      practice: room.practice,
      oldBoard: Boolean(room.session && room.session.getTable() && room.session.getTable().sim && room.session.getTable().sim.started && isOldBoard(room.session.getTable().sim)),
      privateLost: Boolean(room.session && room.session.getTable() && room.session.getTable().sim && room.session.getTable().sim.started && !isOldBoard(room.session.getTable().sim) && !play.priv),
      you: room.role === null ? 0 : room.role,
      savedDuel: saved && room.phase === "start" ? { names: saved.table.players.map((p) => p.name), turn: saved.table.turn } : null,
    },
    {
      onCreate: () => createRoom(null),
      onJoin: joinRoom,
      onSubmitReply: submitReply,
      onCopy: copyCode,
      onStartOver: startOver,
      onReconnect: reconnect,
      onClearDuel: clearDuel,
      onLpChange: (target, mode, amount) => intent({ kind: "lp", target, mode, amount }),
      onNextPhase: () => intent({ kind: "phase" }),
      onCoin: () => intent({ kind: "coin" }),
      onDie: () => intent({ kind: "die" }),
      onUndo: () => intent({ kind: "undo" }),
      onRename: (name) => intent({ kind: "name", name }),
      boardHandlers: boardHandlers(),
      onRematch: proposeRematch,
      onAcceptRematch: acceptRematch,
      onDeclineRematch: declineRematch,
      onChooseDeck: chooseDeck,
      onNoCards: playWithoutCards,
      onPractice: startPractice,
      onLeavePractice: startOver,
      onLeaveRoom: leaveRoom,
    }
  );
}

function setRoom(patch) {
  room = { ...room, ...patch };
  drawRoom();
}

/* ---- the link ---- */

function openLink() {
  if (room.link) room.link.close();
  clearTimeout(room.expiryTimer);
  const link = createLink({
    onStatus: (status, detail) => {
      if (room.link !== link) return; // an older link
      onLinkStatus(status, detail);
    },
    onMessage: (message) => {
      if (room.link === link && room.session) room.session.receive(message);
    },
  });
  room.link = link;
  return link;
}

function makeSession(table) {
  return createDuelSession({
    role: room.role,
    table,
    send: (message) => (room.link ? room.link.send(message) : false),
    onChange: () => {
      saveDuel();
      // a joiner's table (and so the knowledge that a duel is on) arrives with the creator's snapshot
      if (room.role === ROLE_JOINER && !play.priv && room.session && room.session.getTable()) prepareCards();
      // the joiner's first table arrives after the link opens: from then on the table is shown
      if (room.phase === "joining" && room.session && room.session.getTable() && room.link && room.link.getStatus() === "connected") {
        room = { ...room, phase: "connected", status: "Connected." };
      }
      drawRoom();
    },
    onNotice: (text) => setRoom({ notice: text }),
    onRefused: (reason) => setRoom({ error: reason }),
    onApplied: (event, table) => onDuelEvent(event, table),
  });
}

/* The decks and, for a duel that was already going, this device's private cards, once the link is open. */
function prepareCards() {
  loadWorkshopDecks();
  const table = room.session && room.session.getTable();
  if (!table || !table.sim || !table.sim.started) return;
  if (play.priv && play.priv.duelId === table.duelId && play.priv.side === room.role) return; // this page still has its own cards
  const saved = restorePrivate(table);
  if (saved) {
    play.priv = saved.priv;
    play.chosenDeckId = saved.deckId;
    const built = buildDuelDeck(play.collection, saved.deckId, room.role);
    play.built = built.ok ? built : null;
  } else {
    play.priv = null;
  }
}

function onLinkStatus(status, detail) {
  if (status === "connected") {
    clearTimeout(room.expiryTimer);
    prepareCards();
    if (room.role === ROLE_JOINER) {
      room.session.hello(myName());
      setRoom({ phase: room.session.getTable() ? "connected" : "joining", status: "Connected. Syncing the table…", error: "" });
    } else {
      saveDuel();
      setRoom({ phase: "connected", status: "Connected.", error: "" });
    }
  } else if (status === "connecting") {
    setRoom({ status: "Connecting…" });
  } else if (status === "disconnected") {
    setRoom({ phase: room.session && room.session.getTable() ? "disconnected" : "failed", status: "", error: detail || "Opponent disconnected." });
  } else if (status === "failed") {
    setRoom({ phase: "failed", status: "", error: detail || "The connection could not be made." });
  }
}

/* ---- creating and joining ---- */

async function createRoom(saved) {
  const link = openLink();
  const table = saved ? saved.table : newTable(newDuelId(), myName(), "");
  setRoom({ role: ROLE_CREATOR, session: null, reconnecting: saved, status: "Preparing your invitation…", error: "", notice: "" });
  room.session = makeSession(table);
  try {
    const { code } = await link.createOffer();
    if (room.link !== link) return;
    room.expiryTimer = setTimeout(
      () => setRoom({ status: "This invitation may have expired. Start over to get a new code." }),
      CODE_EXPIRY_MS
    );
    setRoom({ phase: "creating", code, status: "Waiting for your friend's reply code…" });
  } catch (err) {
    setRoom({ phase: "failed", error: `Could not create the room: ${err.message}` });
  }
}

async function joinRoom(text) {
  const decoded = decodeCode(text);
  if (!decoded.ok) {
    setRoom({ error: decoded.reason, status: "" }); // the pasted text stays in the box
    return;
  }
  const link = openLink();
  const saved = room.reconnecting && room.reconnecting.role === ROLE_JOINER ? room.reconnecting : null;
  setRoom({ role: ROLE_JOINER, session: null, status: "Preparing your reply…", error: "", notice: "" });
  room.session = makeSession(saved ? saved.table : null);
  try {
    const { code } = await link.acceptOffer(text);
    if (room.link !== link) return;
    setRoom({ phase: "joining", code, status: "Waiting for the room creator to paste your reply…" });
  } catch (err) {
    room.link.close();
    setRoom({ phase: "start", role: null, session: null, error: err.message, status: "" });
  }
}

async function submitReply(text) {
  if (!room.link) return;
  try {
    await room.link.acceptAnswer(text);
    setRoom({ error: "", status: "Connecting…" });
  } catch (err) {
    setRoom({ error: err.message }); // keep waiting; the typed reply stays in the box
  }
}

function newDuelId() {
  return newRoomId();
}

/* ---- the table ---- */

function intent(event) {
  if (!room.session) return;
  const result = room.session.intent(event);
  if (result && result.ok === false) setRoom({ error: result.reason });
  else if (room.error) setRoom({ error: "" });
}

/* ---- leaving, reconnecting, clearing ---- */

function startOver() {
  if (room.link) room.link.close();
  clearTimeout(room.expiryTimer);
  play.priv = null; // a practice duel's cards go with it
  setRoom({ phase: "start", status: "", error: "", notice: "", code: "", role: null, link: null, session: null, reconnecting: null, practice: false });
}

/* Leaving a live duel closes the link; the duel stays saved so it can be resumed with Reconnect. */
async function leaveRoom() {
  const ok = await confirmDialog("Leave the room? Your opponent will be disconnected. You can reconnect to this duel later from the start screen.", { title: "Leave room", confirmLabel: "Leave" });
  if (ok) startOver();
}

/* Practice alone: the same table with no link; the other side is an empty player (see onDuelEvent in duel-play.js). */
function startPractice() {
  if (room.link) room.link.close();
  clearTimeout(room.expiryTimer);
  play.priv = null;
  play.built = null;
  play.chosenDeckId = null;
  const table = newTable(newDuelId(), myName(), PRACTICE_OPPONENT_NAME);
  setRoom({ role: ROLE_CREATOR, link: null, session: null, reconnecting: null, practice: true, status: "", error: "", notice: "" });
  room.session = makeSession(table);
  setRoom({ phase: "connected" });
}

function reconnect() {
  // a duel still open on this page is resumed as it is here (another tab of the same browser may have saved a
  // different duel); from the start screen the saved duel is resumed
  const here = room.role !== null && room.session && room.session.getTable() ? { role: room.role, table: room.session.getTable() } : null;
  const saved = here || readSavedDuel();
  if (!saved) return;
  if (room.link) room.link.close();
  if (saved.role === ROLE_CREATOR) {
    createRoom(saved);
  } else {
    // the joiner waits for a new invitation code from the creator
    setRoom({
      phase: "start",
      role: null,
      session: null,
      link: null,
      code: "",
      reconnecting: saved,
      error: "",
      notice: "",
      status: "To reconnect, ask the room creator to press Reconnect and send you the new invitation code, then paste it under Join a room.",
    });
  }
}

async function clearDuel() {
  const ok = await confirmDialog("Clear the saved duel? The table and its log will be deleted from this browser.", { title: "Clear duel", confirmLabel: "Clear" });
  if (!ok) return;
  removeData(SAVED_DUEL_KEY);
  [0, 1].forEach((side) => removeData(privateKey(side))); // this device's hand and deck go too
  play.priv = null;
  play.built = null;
  play.chosenDeckId = null;
  startOver();
}

async function copyCode(box) {
  try {
    await navigator.clipboard.writeText(box.value);
  } catch (err) {
    box.focus();
    box.select();
    document.execCommand("copy"); // older browsers and pages without clipboard permission
  }
  setRoom({ status: COPIED_MESSAGE });
}

drawRoom();
