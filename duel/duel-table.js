/*
 * Duel table rules: pure and deterministic, no DOM, no network, no storage. The same table and the same event always
 * give the same result, so two pages that apply the same numbered events end with the same table and log.
 *
 *   table  = { duelId, seq, players: [{ name, lp }, { name, lp }], turn, active, phase, coin, die, winner, log }
 *   event  = { kind: "lp" | "phase" | "coin" | "die" | "name" | "undo", by: 0 | 1, ... } (see data-model.md)
 *   applyEvent(table, event) -> { table, ok, reason }
 *
 * Player 0 is the room's creator (and starts), player 1 the joiner.
 */
const STARTING_LP = 8000;
const DUEL_PHASES = ["Draw", "Standby", "Main 1", "Battle", "Main 2", "End"];
const LOG_MAX_ENTRIES = 500; // older entries are dropped beyond this
const NAME_MAX = 24;
const LP_AMOUNT_LIMIT = 1000000; // largest amount of one life point change
const COIN_RESULTS = ["heads", "tails"];
const DIE_FACES = 6;
const DEFAULT_NAMES = ["Player 1", "Player 2"];

function newTable(duelId, creatorName, joinerName) {
  return {
    duelId,
    seq: 0,
    players: [
      { name: cleanName(creatorName) || DEFAULT_NAMES[0], lp: STARTING_LP },
      { name: cleanName(joinerName) || DEFAULT_NAMES[1], lp: STARTING_LP },
    ],
    turn: 1,
    active: 0,
    phase: DUEL_PHASES[0],
    coin: null,
    die: null,
    winner: null,
    sim: null, // the cards' board (duel-board.js); null while no cards are used
    log: [],
  };
}

/* A name trimmed to NAME_MAX characters ("" when nothing is left). */
function cleanName(name) {
  return String(name === undefined || name === null ? "" : name).trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
}

function refuse(table, reason) {
  return { table, ok: false, reason };
}

function winnerOf(players) {
  if (players[0].lp === 0) return 1;
  if (players[1].lp === 0) return 0;
  return null;
}

function validPlayer(index) {
  return index === 0 || index === 1;
}

/* The log line of an event as it would read, used for the entries. */
function describeEvent(table, event) {
  const who = table.players[event.by] ? table.players[event.by].name : "?";
  switch (event.kind) {
    case "lp": {
      const target = table.players[event.target];
      const verb = event.mode === "set" ? `set ${target.name}'s life points to ${event.amount}` : `${event.amount < 0 ? "took" : "gave"} ${Math.abs(event.amount)} ${event.amount < 0 ? "from" : "to"} ${target.name}`;
      return `${who} ${verb}`;
    }
    case "phase":
      return `${who} moved to the next phase`;
    case "coin":
      return `${who} flipped a coin: ${event.result}`;
    case "die":
      return `${who} rolled a die: ${event.result}`;
    case "name":
      return `${who} is now called ${cleanName(event.name)}`;
    case "undo":
      return `${who} undid their last change`;
    default:
      return "";
  }
}

function withEntry(table, patch, entry) {
  const seq = table.seq + 1;
  const log = table.log.concat({ seq, ...entry }).slice(-LOG_MAX_ENTRIES);
  return { ...table, ...patch, seq, log };
}

function applyLp(table, event) {
  if (!validPlayer(event.target) || !Number.isInteger(event.amount) || Math.abs(event.amount) > LP_AMOUNT_LIMIT) return refuse(table, "That life point change is not valid.");
  if (event.mode !== "add" && event.mode !== "set") return refuse(table, "That life point change is not valid.");
  const before = table.players[event.target].lp;
  const next = Math.max(0, event.mode === "set" ? event.amount : before + event.amount);
  const players = table.players.map((p, i) => (i === event.target ? { ...p, lp: next } : p));
  const winner = winnerOf(players);
  let result = withEntry(table, { players, winner }, {
    by: event.by,
    kind: "lp",
    text: `${describeEvent(table, event)}: ${before} → ${next}`,
    before: { target: event.target, lp: before },
    after: { target: event.target, lp: next },
  });
  if (winner !== null && table.winner === null) {
    result = withEntry(result, {}, { by: event.by, kind: "win", text: `${players[winner].name} wins the duel` });
  }
  return { table: result, ok: true };
}

function applyPhase(table, event) {
  const index = DUEL_PHASES.indexOf(table.phase);
  const before = { phase: table.phase, turn: table.turn, active: table.active };
  const endOfTurn = index === DUEL_PHASES.length - 1;
  const after = endOfTurn
    ? { phase: DUEL_PHASES[0], turn: table.turn + 1, active: 1 - table.active }
    : { phase: DUEL_PHASES[index + 1], turn: table.turn, active: table.active };
  return {
    table: withEntry(table, after, {
      by: event.by,
      kind: "phase",
      text: `${describeEvent(table, event)}: ${after.phase}${endOfTurn ? ` (turn ${after.turn}, ${table.players[after.active].name}'s turn)` : ""}`,
      before,
      after,
    }),
    ok: true,
  };
}

const SIM_KINDS = ["ready", "start", "draw", "move", "flip", "position", "reveal", "hide", "search", "shuffle", "rematch", "rematch-accept", "reset"];
const ZONE_WORDS = { monster: "monster zone", spell: "spell and trap zone", field: "field zone", pendulum: "pendulum zone", gy: "graveyard", banished: "banished zone", hand: "hand", deck: "deck", extra: "extra deck" };

/* The log line of a board event. It only names a card that is visible to both players. */
function describeSim(table, event, result) {
  const who = table.players[event.by] ? table.players[event.by].name : "?";
  const named = (card) => (card ? card.name : "a card");
  switch (event.kind) {
    case "ready":
      return `${who} chose the deck ${event.deckName} (${event.mainCount} cards, ${event.extraCount} in the extra deck)`;
    case "start":
      return "The duel starts: each player draws the starting hand";
    case "draw":
      return result.note === "empty-deck" ? `${who} tried to draw from an empty deck` : `${who} drew a card`;
    case "move": {
      const known = event.card || publicCardName(table.sim, event.by, event.uid) ? { name: (event.card && event.card.name) || publicCardName(table.sim, event.by, event.uid) } : null;
      const to = event.to.zone;
      if (to === "gy") return `${who} sent ${named(event.card)} to the graveyard`;
      if (to === "banished") return event.faceUp ? `${who} banished ${named(event.card)}` : `${who} banished a card face-down`;
      if (to === "hand") return `${who} returned ${named(known)} to the hand`;
      if (to === "deck") return `${who} returned ${named(known)} to the ${event.to.end === "bottom" ? "bottom" : "top"} of the deck`;
      if (to === "extra") return `${who} returned ${named(known)} to the extra deck`;
      return event.faceUp ? `${who} placed ${named(event.card)} in the ${ZONE_WORDS[to]}` : `${who} set a card in the ${ZONE_WORDS[to]}`;
    }
    case "flip":
      return event.faceUp ? `${who} flipped ${named(event.card || (table.sim && { name: publicCardName(table.sim, event.by, event.uid) }))} face-up` : `${who} flipped a card face-down`;
    case "position":
      return `${who} changed a monster to ${event.pos === "def" ? "defense" : "attack"} position`;
    case "reveal":
      return `${who} revealed ${named(event.card)} from the hand`;
    case "hide":
      return `${who} hid a revealed card`;
    case "search":
      return `${who} searched the deck`;
    case "shuffle":
      return `${who} shuffled the deck`;
    case "rematch":
      return `${who} proposed a rematch`;
    case "rematch-accept":
      return `${who} accepted the rematch`;
    case "reset":
      return "A new duel starts";
    default:
      return "";
  }
}

function applySim(table, event) {
  const result = applyBoardEvent(table.sim || newSim(), event);
  if (!result.ok) return refuse(table, result.reason);
  let patch = { sim: result.sim };
  if (event.kind === "reset") {
    patch = {
      sim: result.sim,
      players: table.players.map((p) => ({ ...p, lp: STARTING_LP })),
      turn: 1,
      active: 0,
      phase: DUEL_PHASES[0],
      coin: null,
      die: null,
      winner: null,
    };
  }
  return {
    table: withEntry(table, patch, { by: event.by, kind: "sim", sim: event.kind, text: describeSim(table, event, result), inverse: result.inverse || null }),
    ok: true,
  };
}

function applyUndo(table, event) {
  // the last change that is not an automatic "win" note
  let at = table.log.length - 1;
  while (at >= 0 && table.log[at].kind === "win") at--;
  const last = at >= 0 ? table.log[at] : null;
  const undoableMove = last && last.kind === "sim" && last.inverse;
  if (!last || last.by !== event.by || (last.kind !== "lp" && last.kind !== "phase" && !undoableMove)) {
    return refuse(table, "Only your own last life point, phase or card move can be undone.");
  }
  if (undoableMove) {
    const reverted = applyBoardEvent(table.sim, last.inverse);
    if (!reverted.ok) return refuse(table, reverted.reason);
    return {
      table: withEntry(table, { sim: reverted.sim }, { by: event.by, kind: "undo", text: describeEvent(table, event), undoes: last.seq }),
      ok: true,
    };
  }
  let patch;
  if (last.kind === "lp") {
    const players = table.players.map((p, i) => (i === last.before.target ? { ...p, lp: last.before.lp } : p));
    patch = { players, winner: winnerOf(players) };
  } else {
    patch = { ...last.before };
  }
  return {
    table: withEntry(table, patch, { by: event.by, kind: "undo", text: describeEvent(table, event), undoes: last.seq }),
    ok: true,
  };
}

function applyEvent(table, event) {
  if (!event || !validPlayer(event.by)) return refuse(table, "Unknown player.");
  switch (event.kind) {
    case "lp":
      return applyLp(table, event);
    case "phase":
      return applyPhase(table, event);
    case "coin":
      if (!COIN_RESULTS.includes(event.result)) return refuse(table, "That coin result is not valid.");
      return { table: withEntry(table, { coin: event.result }, { by: event.by, kind: "coin", text: describeEvent(table, event) }), ok: true };
    case "die":
      if (!Number.isInteger(event.result) || event.result < 1 || event.result > DIE_FACES) return refuse(table, "That die result is not valid.");
      return { table: withEntry(table, { die: event.result }, { by: event.by, kind: "die", text: describeEvent(table, event) }), ok: true };
    case "name": {
      const name = cleanName(event.name);
      if (!name) return refuse(table, "A name cannot be empty.");
      const players = table.players.map((p, i) => (i === event.by ? { ...p, name } : p));
      const before = table.players[event.by].name;
      return {
        table: withEntry(table, { players }, { by: event.by, kind: "name", text: `${before} is now called ${name}`, before: { name: before }, after: { name } }),
        ok: true,
      };
    }
    case "undo":
      return applyUndo(table, event);
    default:
      if (SIM_KINDS.includes(event.kind)) return applySim(table, event);
      return refuse(table, "Unknown change.");
  }
}
