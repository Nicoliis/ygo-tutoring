/*
 * The engines panel of the card details window: behaviour. It works on the profile's SAVED collection (most pages
 * do not load the Workshop's in-memory one): read, apply a pure change from engine-rules.js, write, redraw, then call
 * the page's optional `onCardEnginesChanged()` so a page that keeps the collection in memory reloads it.
 *
 *   mountEnginesPanel(containerEl, card, pull)
 *
 * `pull` is null, or the context a page gives for a card just pulled or picked:
 *   { canSave, availableCopies(), saveEarly() }
 * saveEarly() merges ONE copy into the Backlog, flags it so the final save skips it, and returns false on failure.
 * Drawing is in views/card-engines-view.js. Needs engine-rules.js, save-utils.js, profiles.js and dom-utils.js (nextId).
 */
const ENGINE_COLLECTION_KEY = "ygoCollection"; // per-profile saved collection (see profileKey)
const ANNOUNCE_CLEAR_MS = 4000; // how long a panel message stays before it clears
const NOT_OWNED_NOTE = "Engines hold cards from your collection.";
const KEEP_FIRST_NOTE = "Keep this card first, then you can add it to an engine.";
const SAVE_NOW_NOTE = "Adding this card to an engine saves it to your backlog now.";
const ENGINE_SAVE_ERROR = "Couldn't save — browser storage is unavailable or full. Nothing was changed.";

function mountEnginesPanel(containerEl, card, pull) {
  let announcement = "";
  let focusKey = null;
  let clearTimer = null;

  const readCollection = () => loadData(profileKey(ENGINE_COLLECTION_KEY)) || { cards: [], engines: [], decks: [] };
  const writeCollection = (blob) => saveData(blob, profileKey(ENGINE_COLLECTION_KEY));
  const spareCopies = () => (pull && pull.canSave ? pull.availableCopies() : 0);

  function say(text, key = null) {
    announcement = text;
    focusKey = key;
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      announcement = "";
      focusKey = null;
      draw();
    }, ANNOUNCE_CLEAR_MS);
    draw();
  }

  function changed() {
    if (typeof onCardEnginesChanged === "function") onCardEnginesChanged();
  }

  function draw() {
    const blob = readCollection();
    const owned = resolveOwnedCard(blob, card);
    const spare = spareCopies();
    const readOnly = !owned && spare === 0 ? (pull && !pull.canSave ? KEEP_FIRST_NOTE : NOT_OWNED_NOTE) : null;
    const notes = [];
    if (readOnly) notes.push(readOnly);
    else if (!owned && spare > 0) notes.push(SAVE_NOW_NOTE);

    const engines = listEngines(blob)
      .slice()
      .reverse() // newest first
      .map((engine) => {
        let check = { ok: !readOnly, reason: readOnly || "" };
        if (!readOnly) check = owned ? canAddCopy(blob, engine.id, owned, spare) : { ok: true, reason: "" };
        return {
          id: engine.id,
          name: engine.name,
          count: owned ? copiesInEngine(engine, owned.id) : 0,
          canAdd: check.ok,
          addReason: check.reason,
        };
      });

    renderEnginesPanel(
      containerEl,
      { cardName: card.name, engines, notes, newEngineEnabled: !readOnly, announcement, focusKey },
      { onAdd, onRemove, onCreate }
    );
  }

  /* The owned card after making sure a pulled/picked copy is in the Backlog when the engine needs one more copy. */
  function ensureCopy(blob, owned, neededCount) {
    if (owned && owned.quantityOwned >= neededCount) return { blob, owned };
    if (!pull || !pull.canSave || spareCopies() === 0 || !pull.saveEarly()) return null;
    const fresh = readCollection();
    const savedOwned = resolveOwnedCard(fresh, card);
    return savedOwned ? { blob: fresh, owned: savedOwned } : null;
  }

  function onAdd(engineId) {
    let blob = readCollection();
    let owned = resolveOwnedCard(blob, card);
    const check = owned ? canAddCopy(blob, engineId, owned, spareCopies()) : { ok: spareCopies() > 0, reason: NOT_OWNED_NOTE };
    if (!check.ok) return say(check.reason, `add:${engineId}`);
    const engine = listEngines(blob).find((e) => e.id === engineId);
    const ensured = ensureCopy(blob, owned, (owned ? copiesInEngine(engine, owned.id) : 0) + 1);
    if (!ensured) return say(ENGINE_SAVE_ERROR, `add:${engineId}`);
    ({ blob, owned } = ensured);
    addCopy(blob, engineId, owned.id);
    if (!writeCollection(blob)) return say(ENGINE_SAVE_ERROR, `add:${engineId}`);
    changed();
    say(`Added to ${engine.name}`, `add:${engineId}`);
  }

  function onRemove(engineId) {
    const blob = readCollection();
    const owned = resolveOwnedCard(blob, card);
    const engine = listEngines(blob).find((e) => e.id === engineId);
    if (!owned || !engine || copiesInEngine(engine, owned.id) === 0) return;
    removeCopy(blob, engineId, owned.id);
    if (!writeCollection(blob)) return say(ENGINE_SAVE_ERROR, `remove:${engineId}`);
    changed();
    say(`Removed from ${engine.name}`, `remove:${engineId}`);
  }

  function onCreate(name) {
    if (!name.trim()) return say("Enter an engine name.", "name");
    let blob = readCollection();
    let owned = resolveOwnedCard(blob, card);
    const ensured = ensureCopy(blob, owned, 1);
    if (!ensured) return say(ENGINE_SAVE_ERROR, "name");
    ({ blob, owned } = ensured);
    const engine = createEngineWithCard(blob, name, owned.id, nextId("engine"));
    if (!writeCollection(blob)) return say(ENGINE_SAVE_ERROR, "name");
    changed();
    say(`Created ${engine.name}`, "name");
  }

  draw();
}
