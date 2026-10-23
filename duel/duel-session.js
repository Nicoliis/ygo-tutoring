/*
 * Duel session: keeps two duel tables identical. The ROOM CREATOR is the authority: the joiner only sends intents,
 * the creator turns them into events (choosing the result of a coin or a die), applies them in the order they arrive
 * and sends each applied event to the joiner, who applies the same event with the same pure rules (duel-table.js).
 * No DOM, no network and no storage here: the caller gives it a `send` function and calls `receive` with what arrives.
 *
 *   const session = createDuelSession({ role: 0 | 1, table, send, random, onChange, onNotice, onRefused, onApplied })
 *   session.intent(event)      ask for a change (creator: applies it; joiner: sends it to the creator)
 *   session.receive(message)   feed a message from the other side
 *   session.hello(name)        joiner: introduce itself when the link opens
 *   session.intentFor(by, event)  creator, practice alone only: an event of the other side
 *   session.getTable()
 *
 * onApplied(event, table) is called on BOTH devices right after an event is applied (own or the other player's), in the
 * same order on both; the card simulator uses it to update its private state once the public side accepted an event.
 *
 * Messages: hello, snapshot, intent, event, resync, refused (see data-model.md). Needs duel-table.js.
 */
const ROLE_CREATOR = 0;
const ROLE_JOINER = 1;

function createDuelSession({ role, table, send, random = Math.random, onChange = () => {}, onNotice = () => {}, onRefused = () => {}, onApplied = () => {} }) {
  let current = table || null;

  function setTable(next) {
    current = next;
    onChange(current);
  }

  /* Creator: the event as it will be applied, with the player forced and any random result chosen here. */
  function resolve(event, by) {
    const resolved = { ...event, by };
    if (event.kind === "coin") resolved.result = random() < 0.5 ? COIN_RESULTS[0] : COIN_RESULTS[1];
    if (event.kind === "die") resolved.result = 1 + Math.floor(random() * DIE_FACES);
    return resolved;
  }

  /* Creator: applies an event and tells the joiner; returns the result of the rules. */
  function applyAsAuthority(event) {
    const base = current.seq;
    const result = applyEvent(current, event);
    if (!result.ok) return result;
    setTable(result.table);
    send({ type: "event", base, event });
    onApplied(event, current);
    return result;
  }

  function sendSnapshot() {
    send({ type: "snapshot", table: current });
  }

  function onHello(message) {
    if (role !== ROLE_CREATOR || !current) return;
    const name = cleanName(message.name);
    if (name && name !== current.players[1].name) applyAsAuthority(resolve({ kind: "name", name }, 1));
    sendSnapshot();
  }

  function onSnapshot(message) {
    if (role !== ROLE_JOINER || !message.table || !Array.isArray(message.table.players)) return;
    const differs = current !== null && JSON.stringify(current) !== JSON.stringify(message.table);
    setTable(message.table);
    if (differs) onNotice("Your table was replaced by the room creator's table.");
  }

  function onIntent(message) {
    if (role !== ROLE_CREATOR || !current || !message.event) return;
    const result = applyAsAuthority(resolve(message.event, 1));
    if (!result.ok) send({ type: "refused", reason: result.reason });
  }

  function onEvent(message) {
    if (role !== ROLE_JOINER || !current) return;
    if (message.base < current.seq) return; // already applied
    if (message.base > current.seq) {
      send({ type: "resync" }); // an event was missed: ask for the whole table
      return;
    }
    const result = applyEvent(current, message.event);
    if (!result.ok) {
      send({ type: "resync" });
      return;
    }
    setTable(result.table);
    onApplied(message.event, current);
  }

  return {
    getTable: () => current,
    setTable,
    hello(name) {
      send({ type: "hello", duelId: current ? current.duelId : null, name });
    },
    /* Practice alone only: the creator plays the other side too (an event as if the other player had sent it). */
    intentFor(by, event) {
      return role === ROLE_CREATOR ? applyAsAuthority(resolve(event, by)) : { ok: false };
    },
    intent(event) {
      if (role === ROLE_CREATOR) return applyAsAuthority(resolve(event, 0));
      send({ type: "intent", event });
      return { ok: true };
    },
    receive(message) {
      if (!message || typeof message !== "object") return;
      if (message.type === "hello") onHello(message);
      else if (message.type === "snapshot") onSnapshot(message);
      else if (message.type === "intent") onIntent(message);
      else if (message.type === "event") onEvent(message);
      else if (message.type === "resync" && role === ROLE_CREATOR && current) sendSnapshot();
      else if (message.type === "refused") onRefused(message.reason);
    },
  };
}
