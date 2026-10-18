/*
 * Contract tests for profiles, per-profile storage and Progression Run rules.
 * Needs these globals loaded first: save-utils.js, profiles.js, progression/progression-state.js
 * and a (mock) global `localStorage`. Used by shared/profiles.test.js (Node) and shared/tests.html (browser).
 */
function runContractTests() {
  const results = [];

  function check(name, fn) {
    localStorage.clear();
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  }

  function expect(condition, message) {
    if (!condition) throw new Error(message || "assertion failed");
  }

  function expectThrows(fn, fragment) {
    let threw = false;
    try {
      fn();
    } catch (err) {
      threw = true;
      if (fragment) expect(err.message.includes(fragment), `wrong error: ${err.message}`);
    }
    expect(threw, "expected an error");
  }

  const LIST = ["A", "B", "C"];

  check("profileKey: sandbox keeps legacy keys, others are suffixed, none throws", () => {
    localStorage.setItem("ygoCollection", "{}");
    listProfiles();
    expectThrows(() => profileKey("ygoCollection"), "No active profile");
    setActiveProfile(SANDBOX_ID);
    expect(profileKey("ygoCollection") === "ygoCollection");
    const p = createProfile("Run1", "progression");
    expect(profileKey("ygoCollection") === `ygoCollection_${p.id}`);
    expect(profileKey("ygoDeck") === `ygoDeck_${p.id}`);
  });

  check("migration: legacy data creates Sandbox and never touches legacy keys", () => {
    localStorage.setItem("ygoCollection", '{"cards":[1],"future":true}');
    localStorage.setItem("ygoDeck", "[2]");
    const profiles = listProfiles();
    expect(profiles.length === 1 && profiles[0].id === SANDBOX_ID && profiles[0].mode === "sandbox");
    expect(localStorage.getItem("ygoCollection") === '{"cards":[1],"future":true}');
    expect(localStorage.getItem("ygoDeck") === "[2]");
  });

  check("migration: no legacy data creates no profile and writes nothing", () => {
    expect(listProfiles().length === 0);
    expect(localStorage.getItem(PROFILES_KEY) === null);
  });

  check("names: empty, duplicate (case-insensitive) and invalid mode are rejected", () => {
    expectThrows(() => createProfile("  ", "progression"), "name");
    createProfile("Alpha", "progression");
    expectThrows(() => createProfile("alpha", "progression"), "already exists");
    expectThrows(() => createProfile("Beta", "sandbox"), "game mode");
    expectThrows(() => createProfile("Beta", "nope"), "game mode");
  });

  check("rename: allows own name changes, rejects other profile's name", () => {
    const a = createProfile("Alpha", "progression");
    const b = createProfile("Beta", "progression");
    renameProfile(a.id, "ALPHA");
    expectThrows(() => renameProfile(b.id, "alpha"), "already exists");
  });

  check("unknown registry fields are preserved on write", () => {
    saveData({ activeId: null, profiles: [], futureField: { x: 1 } }, PROFILES_KEY);
    createProfile("Alpha", "progression");
    expect(loadData(PROFILES_KEY).futureField.x === 1);
  });

  check("delete: removes only that profile's keys; legacy and other profiles untouched", () => {
    localStorage.setItem("ygoCollection", "{}");
    const a = createProfile("Alpha", "progression");
    const b = createProfile("Beta", "progression");
    localStorage.setItem(`ygoCollection_${a.id}`, "{}");
    localStorage.setItem(`ygoRun_${a.id}`, "{}");
    localStorage.setItem(`ygoCollection_${b.id}`, "{}");
    deleteProfile(a.id);
    expect(localStorage.getItem(`ygoCollection_${a.id}`) === null);
    expect(localStorage.getItem(`ygoRun_${a.id}`) === null);
    expect(localStorage.getItem(`ygoCollection_${b.id}`) !== null);
    expect(localStorage.getItem("ygoCollection") !== null);
    expect(listProfiles().length === 2);
  });

  check("export covers profile registry, per-profile collection and run keys", () => {
    const p = createProfile("Alpha", "progression");
    saveData({ cards: [] }, profileKey("ygoCollection"));
    saveRun(p.id, newRun(LIST));
    const keys = Object.keys(buildBackup().data);
    expect(keys.includes(PROFILES_KEY));
    expect(keys.includes(`ygoCollection_${p.id}`));
    expect(keys.includes(`ygoRun_${p.id}`));
  });

  check("removeData removes a key", () => {
    saveData({ a: 1 }, "ygoTmp");
    expect(removeData("ygoTmp") && loadData("ygoTmp") === null);
  });

  check("run: starts at first booster with box closed", () => {
    const run = newRun(LIST);
    expect(run.current === "A" && run.completed.length === 0 && run.boxOpened === false);
    expect(runSummary(null, LIST) === "Stage 1/3 – Box not opened");
  });

  check("run: cannot complete before opening, cannot open twice", () => {
    let run = newRun(LIST);
    expect(!canCompleteStage(run).ok && canCompleteStage(run).reason.length > 0);
    expect(canOpenBox(run).ok);
    run = openBoxApplied(run);
    expect(!canOpenBox(run).ok && canOpenBox(run).reason.length > 0);
    expect(canCompleteStage(run).ok);
    expect(runSummary(run, LIST) === "Stage 1/3 – Box opened");
  });

  check("run: completing advances in list order, keeps history, finishes at the end", () => {
    let run = openBoxApplied(newRun(LIST));
    run = completeStage(run, LIST);
    expect(run.current === "B" && run.completed.join() === "A" && run.boxOpened === false);
    run = completeStage(openBoxApplied(run), LIST);
    run = completeStage(openBoxApplied(run), LIST);
    expect(run.current === null && run.completed.join() === "A,B,C" && run.finishedAt);
    expect(runSummary(run, LIST) === "Finished");
    expect(!canOpenBox(run).ok && !canCompleteStage(run).ok);
  });

  check("run: booster added mid-run appears in remaining; finished run stays finished", () => {
    let run = completeStage(openBoxApplied(newRun(LIST)), LIST);
    const extended = ["A", "B", "B2", "C"];
    expect(remainingStages(run, extended).join() === "B2,C");
    run = completeStage(openBoxApplied(run), extended);
    expect(run.current === "B2" && run.completed.join() === "A,B");

    let done = newRun(["A"]);
    done = completeStage(openBoxApplied(done), ["A"]);
    expect(done.current === null);
    expect(remainingStages(done, ["A", "Z"]).length === 0);
  });

  check("run: persists via saveData and unknown fields survive", () => {
    const run = { ...newRun(LIST), future: "keep" };
    saveRun("p1", run);
    saveRun("p1", completeStage(openBoxApplied(loadRun("p1")), LIST));
    const stored = loadRun("p1");
    expect(stored.future === "keep" && stored.current === "B");
  });

  /* ---- Money, set prices (spec 011) ---- */

  check("money: toCents, formatMoney and the escalating booster price", () => {
    expect(toCents("6.97") === 697 && toCents(2) === 200 && toCents("0.10") === 10);
    expect(toCents(null) === null && toCents("") === null && toCents("abc") === null && toCents(0) === null && toCents("-1") === null);
    expect(formatMoney(475) === "4.75" && formatMoney(5) === "0.05" && formatMoney(0) === "0.00" && formatMoney(100) === "1.00");
    expect([0, 1, 2, 3, 4].map(priceForPurchase).join() === "100,150,225,338,506");
    expect(totalForPurchases(0, 3) === 475, "3 fresh packs must cost 4.75");
    expect(totalForPurchases(2, 2) === 225 + 338);
    expect(totalForPurchases(5, 0) === 0);
  });

  check("resolveSalePriceCents: set price, else Cardmarket, else 0.01", () => {
    expect(resolveSalePriceCents("6.97", "1.00") === 697, "set price wins");
    expect(resolveSalePriceCents("0", "1.25") === 125, "zero set price falls back to Cardmarket");
    expect(resolveSalePriceCents(null, "0.40") === 40, "missing set price falls back to Cardmarket");
    expect(resolveSalePriceCents("0.00", "0") === 1 && resolveSalePriceCents(undefined, undefined) === 1, "no price at all is 0.01");
  });

  check("printings: setPrice is stored at first pull, filled in once if missing, then never changed", () => {
    const card = { name: "X", quantityOwned: 0 };
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1 });
    expect(printingSaleValue(card.printings[0]) === 1, "no set price recorded: worth 0.01");
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1, setPrice: 250 });
    expect(card.printings[0].setPrice === 250 && printingSaleValue(card.printings[0]) === 250);
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1, setPrice: 999 });
    expect(card.printings[0].setPrice === 250 && card.printings[0].quantity === 3);
    addPrinting(card, { set: "S2", rarity: "Rare", price: 1, setPrice: 40 });
    expect(card.printings[1].setPrice === 40);
  });

  check("printings: the set code is stored at first pull and filled in once if missing", () => {
    const card = { name: "X", quantityOwned: 0 };
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1 });
    expect(!card.printings[0].setCode);
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1, setCode: "LOB-EN001" });
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1, setCode: "OTHER-001" });
    expect(card.printings[0].setCode === "LOB-EN001" && card.printings[0].quantity === 3);
  });

  check("mergeCardsIntoBacklog carries setPrice into the printing", () => {
    createProfile("SetPrice", "progression");
    const key = profileKey("ygoCollection");
    saveData({ cards: [] }, key);
    mergeCardsIntoBacklog([{ name: "Dragon", set: "S1", rarity: "Ultra Rare", price: 5, setPrice: 697 }]);
    const printing = loadData(key).cards[0].printings[0];
    expect(printing.setPrice === 697 && printingSaleValue(printing) === 697);
  });

  /* ---- Store: selling, buying, bought packs (spec 011) ---- */

  const storeCollection = () => ({
    cards: [
      {
        id: "c1",
        name: "Dragon",
        quantityOwned: 4,
        printings: [
          { set: "S1", rarity: "Ultra Rare", price: 5, setPrice: 697, quantity: 2 },
          { set: "S2", rarity: "Common", price: 0.1, quantity: 1 },
        ],
      },
    ],
    engines: [{ id: "e1", name: "Engine", cards: [{ cardId: "c1", quantity: 3 }] }],
    decks: [{ id: "d1", name: "Deck", main: [{ cardId: "c1", quantity: 3 }], extra: [] }],
  });

  check("canSell: every copy sells; unpriced ones for 0.01", () => {
    const col = storeCollection();
    const card = col.cards[0];
    expect(canSell(card, 0).ok && canSell(card, 0).valueCents === 697);
    expect(canSell(card, 1).ok && canSell(card, 1).valueCents === 1, "printing without setPrice sells for 0.01");
    expect(!canSell(card, 5).ok, "no such printing");
    expect(canSell({ quantityOwned: 2 }, -1).ok && canSell({ quantityOwned: 2 }, -1).valueCents === 1, "unknown copies sell for 0.01");
    expect(!canSell({ quantityOwned: 2, printings: [{ set: "S", rarity: null, quantity: 2 }] }, -1).ok, "no unknown copy left");
  });

  check("sellPrinting: credits the set price, removes one copy, clamps engines and decks", () => {
    const col = storeCollection();
    let run = { completed: [], current: "A", balanceCents: 100, futureField: "keep" };
    run = sellPrinting(run, col, "c1", 0);
    expect(run.balanceCents === 797 && run.futureField === "keep");
    expect(col.cards[0].quantityOwned === 3 && col.cards[0].printings[0].quantity === 1);
    run = sellPrinting(run, col, "c1", 0);
    expect(run.balanceCents === 1494);
    expect(col.cards[0].printings.length === 1 && col.cards[0].printings[0].set === "S2", "printing removed at 0");
    expect(col.cards[0].quantityOwned === 2);
    expect(col.engines[0].cards[0].quantity === 2 && col.decks[0].main[0].quantity === 2, "allocations clamped to owned");
    expect(allocationsOverLimit(col, "c1", 1).length === 2, "selling one more would shrink the engine and the deck");
    run = sellPrinting(run, col, "c1", 0);
    expect(run.balanceCents === 1495, "the printing without a set price sold for 0.01");
    expect(col.cards[0].printings.length === 0 && col.cards[0].quantityOwned === 1);
    run = sellPrinting(run, col, "c1", -1);
    expect(run.balanceCents === 1496 && col.cards[0].quantityOwned === 0, "the unknown copy sold for 0.01");
    let threw = false;
    try { sellPrinting(run, col, "c1", -1); } catch (err) { threw = true; }
    expect(threw, "nothing left to sell");
  });

  check("sell extras: every copy over 3 within each printing; other sets are separate", () => {
    const col = {
      cards: [
        {
          id: "a",
          name: "A",
          quantityOwned: 9,
          printings: [
            { set: "S1", rarity: "Common", price: 0.1, setPrice: 10, quantity: 5 },
            { set: "S2", rarity: "Common", price: 0.1, setPrice: 20, quantity: 2 },
            { set: "S3", rarity: "Rare", price: 1, setPrice: 100, quantity: 1 },
          ],
        },
        { id: "b", name: "B", quantityOwned: 3, printings: [{ set: "S1", rarity: "Rare", setPrice: 50, quantity: 3 }] },
        { id: "c", name: "C", quantityOwned: 5 },
      ],
      engines: [],
      decks: [],
    };
    expect(hasExtras(col.cards[0]) && !hasExtras(col.cards[1]) && hasExtras(col.cards[2]), "the list filter counts all sets together");
    const preview = previewExtras({ completed: [], current: "A", balanceCents: 0 }, col);
    expect(preview.soldCount === 4 && preview.cardCount === 2, "2 extras of A (S1 only) + 2 unknown extras of C");
    expect(col.cards[0].quantityOwned === 9, "preview changes nothing");
    const result = sellExtras({ completed: [], current: "A", balanceCents: 1000, futureField: "keep" }, col);
    // A: S1 has 5 (sell 2 at 0.10); its 1 unknown copy and S2/S3 stay. C: 2 unknown copies at 0.01
    expect(result.soldCount === 4 && result.totalCents === 10 + 10 + 1 + 1);
    expect(result.run.balanceCents === 1000 + result.totalCents && result.run.futureField === "keep");
    expect(col.cards[0].quantityOwned === 7 && col.cards[0].printings.map((p) => p.quantity).join() === "3,2,1", "other sets untouched");
    expect(col.cards[1].quantityOwned === 3 && col.cards[2].quantityOwned === 3);
    expect(sellExtras(result.run, col).soldCount === 0, "nothing left to sell");
    const keepOne = sellExtras({ completed: [], current: "A", balanceCents: 0 }, col, 1);
    expect(keepOne.soldCount === 2 + 1 + 2 + 2 && col.cards[0].printings.map((p) => p.quantity).join() === "1,1,1", "keep 1 per printing");
  });

  check("binder: every card appears once across the views, empty slots only at the end", () => {
    [BINDER_WIDE_PAGES, BINDER_NARROW_PAGES].forEach((pages) => {
      [0, 1, 9, 10, 18, 19, 40].forEach((length) => {
        const cards = Array.from({ length }, (_, i) => ({ id: `c${i}` }));
        const size = binderViewSize(pages);
        const seen = [];
        let offset = 0;
        for (let v = 0; v < viewCount(length, pages); v++) {
          const flat = slotsOfPage(cards, offset, pages).flat();
          expect(flat.length === size, "a view always has its full number of slots");
          const firstEmpty = flat.indexOf(null);
          expect(firstEmpty === -1 || flat.slice(firstEmpty).every((slot) => slot === null), "empty slots only at the end");
          flat.filter(Boolean).forEach((card) => seen.push(card.id));
          offset += size;
        }
        expect(seen.length === length && new Set(seen).size === length, `each of ${length} cards once (${pages} pages)`);
      });
    });
  });

  check("binder: clampOffset, turn and view counts", () => {
    expect(viewCount(0, 2) === 1 && viewCount(18, 2) === 1 && viewCount(19, 2) === 2 && viewCount(19, 1) === 3);
    expect(clampOffset(0, 0, 2) === 0, "no cards: first view");
    expect(clampOffset(40, 40, 2) === 36, "past the end: last view");
    expect(clampOffset(20, 40, 2) === 18, "aligned down to a view start");
    expect(turn(0, BINDER_PREVIOUS, 40, 2) === 0, "previous stops at the first view");
    expect(turn(0, BINDER_NEXT, 40, 2) === 18 && turn(36, BINDER_NEXT, 40, 2) === 36, "next stops at the last view");
    expect(turn(27, BINDER_NEXT, 40, 1) === 36 && turn(36, BINDER_PREVIOUS, 40, 1) === 27, "narrow turns one page");
    expect(clampOffset(27, 40, 2) === 18 && clampOffset(18, 40, 1) === 18, "switching between 2 pages and 1 stays near the same card");
  });

  check("binder: position label", () => {
    expect(positionLabel(0, 40, 2) === "Pages 1–2 of 5");
    expect(positionLabel(36, 40, 2) === "Pages 5–5 of 5".replace("Pages 5–5", "Page 5"), "last view with one page");
    expect(positionLabel(0, 0, 2) === "Page 1 of 1");
    expect(positionLabel(9, 40, 1) === "Page 2 of 5");
  });

  /* ---- Completionist binder (spec 015) ---- */

  function apiCardFixture(id, name, entries) {
    return { id, name, type: "Effect Monster", card_images: [{ image_url_small: `s${id}`, image_url: `f${id}` }], desc: `text ${name}`, card_sets: entries };
  }
  const SET_A = "Set A";
  const apiCards = [
    apiCardFixture(2, "Beta", [
      { set_name: SET_A, set_code: "SA-002", set_rarity: "Common" },
      { set_name: SET_A, set_code: "SA-002", set_rarity: "Ultra Rare" },
      { set_name: "Set B", set_code: "SB-009", set_rarity: "Common" },
    ]),
    apiCardFixture(1, "Alpha", [
      { set_name: SET_A, set_code: "SA-001", set_rarity: "Rare" },
      { set_name: SET_A, set_code: "SA-E001", set_rarity: "Rare" },
      { set_name: SET_A, set_code: "SA-EN001", set_rarity: "Rare" },
    ]),
    apiCardFixture(3, "Gamma", [
      { set_name: SET_A, set_code: "SA-003", set_rarity: "Super Rare" },
      { set_name: SET_A, set_code: "SA-003", set_rarity: "Common" },
    ]),
  ];

  check("set slots: one per card_sets entry of the set, in set-code order", () => {
    const slots = buildSetSlots(apiCards, SET_A);
    expect(slots.length === 5, "Beta has two rarities in the set, its Set B entry is left out, Alpha's three regional numbers are one slot");
    expect(slots.map((sl) => `${sl.setCode}:${sl.rarity}`).join() === "SA-EN001:Rare,SA-002:Common,SA-002:Ultra Rare,SA-003:Common,SA-003:Super Rare", "set code, then common to rare; the English number represents Alpha");
    expect(new Set(slots.map((sl) => sl.key)).size === 5, "keys are unique");
    expect(slots[0].card.name === "Alpha" && slots[0].card.effect === "text Alpha" && slots[0].card.imageSmall === "s1");
    expect(buildSetSlots(apiCards, "Nope").length === 0);
  });

  check("set slots: ownership counts only the same card, set and rarity", () => {
    const slots = buildSetSlots(apiCards, SET_A);
    const beta = { name: "beta", apiId: 2, quantityOwned: 3, printings: [{ set: SET_A, rarity: "common", quantity: 2 }, { set: "Set B", rarity: "Ultra Rare", quantity: 1 }] };
    const bySlot = (key) => slots.find((sl) => sl.key === key);
    const alpha = bySlot("1|rare");
    expect(ownedFor(bySlot("2|common"), [beta]) === 2, "name casing and rarity casing do not matter");
    expect(ownedFor(bySlot("2|ultra rare"), [beta]) === 0, "another rarity of the same card stays missing");
    const coded = { name: "Gamma", apiId: 3, quantityOwned: 1, printings: [{ set: SET_A, rarity: "Common", setCode: "SA-003", quantity: 1 }] };
    expect(ownedFor(bySlot("3|common"), [coded]) === 1 && ownedFor(bySlot("3|super rare"), [coded]) === 0, "a recorded set number does not change which rarity it is");
    const regional = { name: "Alpha", apiId: 1, quantityOwned: 1, printings: [{ set: SET_A, rarity: "Rare", setCode: "SA-E001", quantity: 1 }] };
    expect(ownedFor(alpha, [regional]) === 1, "any regional set number of the printing colours its slot");
    expect(ownedFor(alpha, [beta, coded]) === 0, "another card never matches");
  });

  check("set slots: completion and unmatched copies", () => {
    const slots = buildSetSlots(apiCards, SET_A);
    expect(JSON.stringify(completion([], [])) === JSON.stringify({ owned: 0, total: 0, percent: 0, complete: false }), "empty set");
    const cards = [{ name: "Alpha", apiId: 1, quantityOwned: 2, printings: [{ set: SET_A, rarity: "Rare", quantity: 2 }] }];
    const part = completion(slots, cards);
    expect(part.owned === 1 && part.total === 5 && part.percent === 20 && !part.complete);
    const everything = [
      { name: "Alpha", apiId: 1, quantityOwned: 1, printings: [{ set: SET_A, rarity: "Rare", quantity: 1 }] },
      { name: "Beta", apiId: 2, quantityOwned: 2, printings: [{ set: SET_A, rarity: "Common", quantity: 1 }, { set: SET_A, rarity: "Ultra Rare", quantity: 1 }] },
      { name: "Gamma", apiId: 3, quantityOwned: 2, printings: [{ set: SET_A, rarity: "Super Rare", quantity: 1 }, { set: SET_A, rarity: "Common", quantity: 1 }] },
    ];
    const full = completion(slots, everything);
    expect(full.owned === 5 && full.percent === 100 && full.complete);
    expect(unmatchedCopies(everything) === 0, "fully recorded cards leave nothing unmatched");
    expect(unmatchedCopies([{ name: "Old", quantityOwned: 4 }]) === 4, "cards without printings");
    expect(unmatchedCopies([{ name: "X", quantityOwned: 3, printings: [{ set: SET_A, rarity: "Rare", quantity: 1 }] }]) === 2, "copies beyond the recorded printings");
    expect(unmatchedCopies([{ name: "Y", quantityOwned: 2, printings: [{ set: SET_A, rarity: null, quantity: 2 }] }]) === 2, "a printing with no rarity");
  });

  /* ---- Engines panel in the card details window (spec 016) ---- */

  function enginesFixture() {
    return {
      cards: [
        { id: "k1", name: "Dragon", apiId: 11, quantityOwned: 2 },
        { id: "k2", name: "Wizard", apiId: 12, quantityOwned: 5 },
      ],
      engines: [{ id: "e1", name: "Dragons", cards: [] }, { id: "e2", name: "Dragons", cards: [] }],
      decks: [],
    };
  }

  check("engine rules: the owned card is found by id, apiId or name", () => {
    const col = enginesFixture();
    expect(resolveOwnedCard(col, { id: "k2" }).name === "Wizard");
    expect(resolveOwnedCard(col, { apiId: 11, name: "other" }).id === "k1");
    expect(resolveOwnedCard(col, { name: "  dragon " }).id === "k1", "name ignores case and spaces");
    expect(resolveOwnedCard(col, { name: "Unknown" }) === null && resolveOwnedCard(col, {}) === null);
  });

  check("engine rules: an engine holds at most the copies owned, never more than 3", () => {
    const col = enginesFixture();
    const dragon = col.cards[0];
    const wizard = col.cards[1];
    expect(canAddCopy(col, "e1", dragon).ok);
    addCopy(col, "e1", "k1");
    expect(addCopy(col, "e1", "k1") === 2 && col.engines[0].cards.length === 1, "entries merge by card");
    expect(!canAddCopy(col, "e1", dragon).ok && canAddCopy(col, "e1", dragon).reason === NO_COPIES_LEFT_REASON, "2 owned, 2 held");
    expect(canAddCopy(col, "e1", dragon, 1).ok, "a copy that can still be saved counts");
    expect(canAddCopy(col, "e2", dragon).ok, "engines are independent");
    for (let i = 0; i < 3; i++) addCopy(col, "e2", "k2");
    expect(!canAddCopy(col, "e2", wizard).ok && canAddCopy(col, "e2", wizard).reason === ENGINE_LIMIT_REASON, "5 owned but 3 is the cap");
    expect(!canAddCopy(col, "missing", dragon).ok && !canAddCopy(col, "e1", null).ok);
  });

  check("engine rules: removing copies and creating an engine with a card", () => {
    const col = enginesFixture();
    addCopy(col, "e1", "k1");
    addCopy(col, "e1", "k1");
    expect(removeCopy(col, "e1", "k1") === 1);
    expect(removeCopy(col, "e1", "k1") === 0 && col.engines[0].cards.length === 0, "the last copy drops the entry");
    expect(removeCopy(col, "e1", "k1") === 0, "removing from an engine without the card does nothing");
    expect(createEngineWithCard(col, "   ", "k1", "n0") === null && col.engines.length === 2, "an empty name creates nothing");
    const made = createEngineWithCard(col, "  Dragons ", "k1", "n1");
    expect(made.name === "Dragons" && made.cards.length === 1 && made.cards[0].quantity === 1 && col.engines.length === 3, "trimmed, one copy");
    expect(createEngineWithCard(col, "Dragons", "k1", "n2") !== null && col.engines.length === 4, "names do not have to be unique");
  });

  check("clampAllocationsToOwned drops entries that reach zero", () => {
    const col = storeCollection();
    col.cards[0].quantityOwned = 0;
    expect(clampAllocationsToOwned(col) === 2);
    expect(col.engines[0].cards.length === 0 && col.decks[0].main.length === 0);
  });

  check("buying: reached boosters, escalating price, totals and blocked purchases", () => {
    const list = ["A", "B", "C", "D"];
    let run = { completed: ["A", "B"], current: "C", balanceCents: 1000 };
    expect(reachedBoosters(run, list).join() === "A,B,C");
    expect(nextPriceCents(run, "A") === 100);
    expect(!canBuy(run, "D", 1, list).ok, "not reached");
    expect(!canBuy(run, "A", 0, list).ok && !canBuy(run, "A", 1.5, list).ok, "invalid amount");
    const preview = canBuy(run, "A", 3, list);
    expect(preview.ok && preview.totalCents === 475);
    run = buyBoosters(run, "A", 3, list);
    expect(run.balanceCents === 525 && run.boosterBuys.A === 3 && run.packInventory.A === 3);
    expect(nextPriceCents(run, "A") === 338, "next price shown is 3.38");
    expect(nextPriceCents(run, "B") === 100, "other boosters keep their own price");
    const poor = canBuy({ ...run, balanceCents: 300 }, "A", 1, list);
    expect(!poor.ok && poor.missingCents === 38 && poor.totalCents === 338);
    expect(canBuy({ ...run, balanceCents: 338 }, "A", 1, list).ok, "exact balance is enough");
    let threw = false;
    try { buyBoosters({ ...run, balanceCents: 0 }, "A", 1, list); } catch (err) { threw = true; }
    expect(threw);
  });

  check("run without economy fields reads as empty balance and inventory", () => {
    const run = { completed: [], current: "A" };
    expect(getBalanceCents(run) === 0 && getPackCount(run, "A") === 0 && getBoosterBuys(run, "A") === 0);
    expect(getExtraPack(run) === null);
  });

  check("bought packs: start, reveal and finish an extra pack", () => {
    const run0 = { completed: [], current: "A", packInventory: { A: 2 } };
    const cards = [{ name: "a" }, { name: "b" }];
    let run = startExtraPack(run0, "A", cards);
    expect(run.packInventory.A === 1 && getExtraPack(run).setName === "A");
    expect(run0.packInventory.A === 2, "input record untouched");
    let threw = false;
    try { startExtraPack(run, "A", cards); } catch (err) { threw = true; }
    expect(threw, "only one bought pack at a time");
    run = revealInExtraPack(run, 0);
    run = revealInExtraPack(run, 0);
    expect(getExtraPack(run).pack.revealed.join() === "true,false");
    run = revealInExtraPack(run, 1);
    const done = finishExtraPack(run);
    expect(done.cards.length === 2 && done.run.extraPack === null && done.run.packInventory.A === 1);
    threw = false;
    try { startExtraPack({ completed: [], current: "A" }, "A", cards); } catch (err) { threw = true; }
    expect(threw, "no pack in the inventory");
  });

  check("economy fields survive a save and keep unknown run fields", () => {
    const list = ["A", "B"];
    createProfile("Econ", "progression");
    const profile = getActiveProfile();
    let run = { ...newRun(list), futureField: "keep", balanceCents: 500 };
    saveRun(profile.id, run);
    run = buyBoosters(loadRun(profile.id), "A", 2, list);
    saveRun(profile.id, run);
    const stored = loadRun(profile.id);
    expect(stored.balanceCents === 500 - 250 && stored.futureField === "keep" && stored.packInventory.A === 2);
    expect(Object.keys(buildBackup().data).includes(`ygoRun_${profile.id}`), "exported with the rest of the save");
  });

  /* ---- Backlog type filter (spec 012) ---- */

  check("groupOf: every card lands in exactly one tab, Pendulum first", () => {
    const g = (type, frameType) => groupOf({ type, frameType });
    expect(g("Effect Monster") === "monster" && g("Normal Monster") === "monster" && g("Flip Effect Monster") === "monster");
    expect(g("Normal Tuner Monster") === "monster" && g("Token") === "monster");
    expect(g("Spell Card") === "spell" && g("Trap Card") === "trap");
    expect(g("Ritual Effect Monster") === "ritual" && g("Fusion Monster") === "fusion" && g("Synchro Tuner Monster") === "synchro");
    expect(g("XYZ Monster") === "xyz" && g("Link Monster") === "link");
    expect(g("Pendulum Effect Monster") === "pendulum" && g("Pendulum Effect Fusion Monster") === "pendulum");
    expect(g("XYZ Pendulum Effect Monster") === "pendulum" && g("Synchro Pendulum Effect Monster") === "pendulum");
    expect(g(null, "fusion") === "fusion" && g(undefined, "effect_pendulum") === "pendulum", "frameType fallback");
    expect(g("Skill Card") === null && g(null, null) === null && groupOf({}) === null, "unrecognizable");
  });

  check("availableValues: only values present in cards of that tab, sorted", () => {
    const cards = [
      { type: "Effect Monster", attribute: "DARK", race: "Fiend", level: 4 },
      { type: "Normal Monster", attribute: "LIGHT", race: "Fiend", level: 10 },
      { type: "Normal Monster", attribute: "DARK", race: "Dragon", level: 2 },
      { type: "Spell Card", race: "Quick-Play" },
      { type: "Spell Card", race: "Continuous" },
      { type: "Trap Card", race: "Counter" },
      { type: "XYZ Monster", attribute: "WATER", race: "Aqua", level: 4 },
      { type: "Effect Monster" },
    ];
    const monster = availableValues(cards, "monster");
    expect(monster.attribute.join() === "DARK,LIGHT" && monster.race.join() === "Dragon,Fiend" && monster.level.join() === "2,4,10");
    expect(availableValues(cards, "spell").subtype.join() === "Continuous,Quick-Play");
    expect(availableValues(cards, "trap").subtype.join() === "Counter");
    expect(availableValues(cards, "xyz").rank.join() === "4");
    expect(availableValues(cards, "link").linkval.length === 0 && availableValues(cards, "link").attribute.length === 0, "empty tab");
    expect(Object.keys(availableValues(cards, "nope")).length === 0);
  });

  check("ATK and DEF are ranges: present min/max offered, min/max filter, missing stats never match", () => {
    const cards = [
      { type: "Effect Monster", atk: 500, def: 2000 },
      { type: "Effect Monster", atk: 1800, def: 1000 },
      { type: "Effect Monster", atk: 3000, def: 0 },
      { type: "Effect Monster" },
      { type: "Link Monster", atk: 2300 },
      { type: "Spell Card" },
    ];
    const monster = availableValues(cards, "monster");
    expect(monster.atk.min === 500 && monster.atk.max === 3000 && monster.def.min === 0 && monster.def.max === 2000);
    const link = availableValues(cards, "link");
    expect(link.atk.min === 2300 && link.def === undefined, "Link monsters have no DEF filter");
    expect(availableValues(cards, "spell").atk === undefined);
    expect(availableValues([], "monster").atk.min === null, "no cards: empty range");
    const f = (values) => ({ types: ["monster-effect"], values: { monster: values } });
    const names = (filter) => cards.filter((c) => matchesFilter(c, filter)).map((c) => c.atk).join();
    expect(names(f({ atk: { min: 1000, max: null } })) === "1800,3000");
    expect(names(f({ atk: { min: null, max: 1800 } })) === "500,1800");
    expect(names(f({ atk: { min: 1000, max: 2000 } })) === "1800");
    expect(names(f({ atk: { min: 1000, max: null }, def: { min: null, max: 1000 } })) === "1800,3000", "ATK and DEF combine with AND");
    expect(names(f({ atk: { min: null, max: null } })) === "500,1800,3000," , "an empty range restricts nothing");
    expect(sanitizeFilter(f({ atk: { min: "x", max: 5 }, def: { min: null, max: null } })).values.monster.atk.max === 5);
    expect(sanitizeFilter(f({ def: { min: null, max: null } })).values.monster === undefined, "empty ranges are dropped");
    expect(sanitizeFilter(f({ atk: [1, 2] })).values.monster === undefined, "malformed range ignored");
  });

  check("matchesFilter: tabs OR, groups AND, values OR, missing values never match", () => {
    const dark4 = { type: "Effect Monster", attribute: "DARK", race: "Fiend", level: 4 };
    const light4 = { type: "Effect Monster", attribute: "LIGHT", race: "Fiend", level: 4 };
    const noDetails = { type: "Effect Monster" };
    const spell = { type: "Spell Card", race: "Quick-Play" };
    const trap = { type: "Trap Card", race: "Counter" };
    const unknown = { name: "?" };
    expect([dark4, spell, unknown].every((c) => matchesFilter(c, emptyFilter())), "no filter lists everything");
    const onlySpell = { types: ["spell"], values: {} };
    expect(matchesFilter(spell, onlySpell) && !matchesFilter(dark4, onlySpell) && !matchesFilter(trap, onlySpell) && !matchesFilter(unknown, onlySpell));
    const spellOrTrap = { types: ["spell", "trap"], values: {} };
    expect(matchesFilter(spell, spellOrTrap) && matchesFilter(trap, spellOrTrap) && !matchesFilter(dark4, spellOrTrap));
    const darkLevel4 = { types: ["monster-effect"], values: { monster: { attribute: ["DARK"], level: [4, 5] } } };
    expect(matchesFilter(dark4, darkLevel4) && !matchesFilter(light4, darkLevel4), "groups combine with AND");
    expect(!matchesFilter(noDetails, darkLevel4), "a card missing the value does not match");
    expect(matchesFilter(noDetails, { types: ["monster-effect"], values: {} }), "no value selected: type alone is enough");
    const attrs = { types: ["monster-effect"], values: { monster: { attribute: ["DARK", "LIGHT"] } } };
    expect(matchesFilter(dark4, attrs) && matchesFilter(light4, attrs), "values in a group are OR");
    expect(matchesFilter(spell, { types: ["spell", "monster-effect"], values: { monster: { attribute: ["WIND"] }, spell: { subtype: ["Quick-Play"] } } }), "each tab uses its own values");
    expect(activeFilterCount(spellOrTrap) === 2 && activeFilterCount(emptyFilter()) === 0 && isFilterActive(onlySpell));
  });

  check("Monster tab: normal and effect monsters are included separately", () => {
    const normal = { type: "Normal Monster", attribute: "EARTH", level: 4 };
    const effect = { type: "Effect Monster", attribute: "EARTH", level: 4 };
    const token = { type: "Token" };
    const flip = { type: "Flip Effect Monster" };
    const normalTuner = { type: "Normal Tuner Monster" };
    expect(monsterKind(normal) === "normal" && monsterKind(token) === "normal" && monsterKind(normalTuner) === "normal");
    expect(monsterKind(effect) === "effect" && monsterKind(flip) === "effect");
    expect(includeIdOf(effect) === "monster-effect" && includeIdOf({ type: "Spell Card" }) === "spell");
    const onlyNormal = { types: ["monster-normal"], values: {} };
    const onlyEffect = { types: ["monster-effect"], values: {} };
    const both = { types: ["monster-normal", "monster-effect"], values: {} };
    expect(matchesFilter(normal, onlyNormal) && !matchesFilter(effect, onlyNormal));
    expect(matchesFilter(effect, onlyEffect) && !matchesFilter(normal, onlyEffect));
    expect(matchesFilter(normal, both) && matchesFilter(effect, both) && !matchesFilter({ type: "Spell Card" }, both));
    const withValues = { types: ["monster-normal"], values: { monster: { attribute: ["EARTH"] } } };
    expect(matchesFilter(normal, withValues) && !matchesFilter({ type: "Normal Monster", attribute: "FIRE" }, withValues));
    expect(filterIncludesOf("monster").length === 2 && filterIncludesOf("spell").length === 1 && FILTER_GROUPS[0].label === "Monster");
    // a filter saved before the split used the single id "monster": it means both kinds
    expect(sanitizeFilter({ types: ["monster", "spell"] }).types.join() === "monster-normal,monster-effect,spell");
    expect(activeFilterCount(both) === 2);
  });

  check("search: name, effect text, attribute, race and type; every word must be found", () => {
    const cards = [
      { name: "Water Dragon", type: "Effect Monster", attribute: "WATER", race: "Dragon", effect: "A dragon." },
      { name: "Aqua Mage", type: "Effect Monster", attribute: "WATER", race: "Spellcaster", effect: "Sea magic." },
      { name: "Flame Knight", type: "Effect Monster", attribute: "FIRE", race: "Warrior", effect: "Burns." },
      { name: "Rain Charm", type: "Spell Card", race: "Quick-Play", effect: "Target 1 WATER monster you control." },
      { name: "Dry Trap", type: "Trap Card", race: "Normal", desc: "Destroy a Water monster." },
      { name: "Plain" },
    ];
    const hits = (q) => cards.filter((c) => cardMatchesSearch(c, q)).map((c) => c.name).join();
    expect(hits("water") === "Water Dragon,Aqua Mage,Rain Charm,Dry Trap", "name, attribute and effect text all match");
    expect(hits("WATER destroy") === "Dry Trap" && hits("water target") === "Rain Charm", "case-insensitive, every word needed");
    expect(hits("dragon") === "Water Dragon" && hits("fire") === "Flame Knight" && hits("quick-play") === "Rain Charm");
    expect(hits("") === cards.map((c) => c.name).join() && hits("zzz") === "");
  });

  check("sorting: by name, rarity, copies, type and stats; stable ties; input untouched", () => {
    const cards = [
      { name: "B", quantityOwned: 1, type: "Spell Card", level: null, printings: [{ set: "S", rarity: "Common", quantity: 1 }] },
      { name: "A", quantityOwned: 3, type: "Effect Monster", level: 4, atk: 1800, def: 1000, printings: [{ set: "S", rarity: "Ultra Rare", quantity: 3 }] },
      { name: "C", quantityOwned: 2, type: "XYZ Monster", level: 8, atk: 3000, def: 2500 },
      { name: "D", quantityOwned: 2, type: "Trap Card" },
    ];
    const names = (id) => sortBacklogCards(cards, id).map((c) => c.name).join("");
    expect(names("added") === "BACD" && names("nope") === "BACD");
    expect(names("name-asc") === "ABCD" && names("name-desc") === "DCBA");
    expect(names("rarity-desc") === "ABCD" || names("rarity-desc") === "ABDC", "Ultra first, unknown last");
    expect(sortBacklogCards(cards, "rarity-desc")[0].name === "A" && sortBacklogCards(cards, "rarity-asc").slice(-1)[0].name === "A");
    expect(names("qty-desc") === "ACDB", "3 first, ties by name");
    const types = sortBacklogCards(cards, "type").map((c) => groupOf(c)).join();
    expect(types === "monster,spell,trap,xyz", "grouped in the order of the filter tabs");
    expect(names("level-desc") === "CABD" && names("atk-desc") === "CABD" && names("def-desc") === "CABD");
    expect(cards.map((c) => c.name).join("") === "BACD", "input array not reordered");
  });

  check("backlog sort is saved per profile and unknown values fall back", () => {
    createProfile("SortA", "progression");
    expect(loadBacklogSort() === "added");
    saveBacklogSort("name-desc");
    expect(loadBacklogSort() === "name-desc");
    createProfile("SortB", "progression");
    expect(loadBacklogSort() === "added", "the other profile has its own order");
    saveData("sideways", profileKey("ygoBacklogSort"));
    expect(loadBacklogSort() === "added", "unknown value ignored");
    saveBacklogSort("added");
    expect(loadData(profileKey("ygoBacklogSort")) === null);
  });

  check("backlog filter: saved per profile, malformed data is harmless, unknown fields survive", () => {
    createProfile("FilterA", "progression");
    expect(!isFilterActive(loadBacklogFilter()), "nothing saved yet");
    saveBacklogFilter({ types: ["spell", "bogus"], values: { spell: { subtype: ["Continuous"], nope: ["x"] }, ghost: { a: [1] } } });
    const stored = loadBacklogFilter();
    expect(stored.types.join() === "spell" && stored.values.spell.subtype.join() === "Continuous");
    expect(!("nope" in stored.values.spell) && !("ghost" in stored.values), "unknown groups dropped");
    saveData({ types: ["spell"], values: {}, futureField: "keep" }, profileKey("ygoBacklogFilter"));
    saveBacklogFilter({ types: ["trap"], values: {} });
    expect(loadData(profileKey("ygoBacklogFilter")).futureField === "keep", "unknown fields preserved");
    const profileA = getActiveProfile().id;
    createProfile("FilterB", "progression");
    expect(!isFilterActive(loadBacklogFilter()), "the other profile has its own (empty) filter");
    setActiveProfile(profileA);
    expect(loadBacklogFilter().types.join() === "trap");
    saveData("garbage", profileKey("ygoBacklogFilter"));
    expect(!isFilterActive(loadBacklogFilter()), "malformed record reads as no filter");
    saveBacklogFilter({ types: ["monster-normal"], values: {} });
    expect(Object.keys(buildBackup().data).includes(`ygoBacklogFilter_${profileA}`), "exported with the rest of the save");
    saveBacklogFilter({ types: [], values: {} });
    expect(loadData(profileKey("ygoBacklogFilter")) === null, "an empty filter clears the key");
  });

  /* ---- Filter counts and synergy names (spec 013) ---- */

  const synergyCards = [
    { name: "Dark Magician", type: "Normal Monster", race: "Spellcaster", attribute: "DARK", level: 7, effect: "The ultimate wizard." },
    { name: "Dark Magician Girl", type: "Effect Monster", race: "Spellcaster", attribute: "DARK", level: 6, effect: 'Gains 300 ATK for each "Dark Magician" in the GY. "dark  magician" again.' },
    { name: "Magic Cylinder", type: "Trap Card", race: "Normal", effect: "Negate. Not about dark magician without quotes." },
    { name: "Thousand Dragon", type: "Effect Monster", race: "Dragon", attribute: "WIND", level: 5, effect: "Treated as “Blue-Eyes White Dragon” while on the field. Also \"Blue-Eyes White Dragon\"." },
    { name: "Blue-Eyes White Dragon", type: "Normal Monster", race: "Dragon", attribute: "LIGHT", level: 8 },
    { name: "Mystical Space Typhoon", type: "Spell Card", race: "Quick-Play" },
  ];

  check("valueCounts: distinct cards per value, monster normal/effect split, missing values skipped", () => {
    const counts = valueCounts(synergyCards, "monster");
    expect(counts.attribute.DARK === 2 && counts.attribute.WIND === 1 && counts.attribute.LIGHT === 1);
    expect(counts.race.Dragon === 2 && counts.race.Spellcaster === 2);
    expect(counts.level["7"] === 1 && counts.level["8"] === 1);
    expect(counts["monster-normal"] === 2 && counts["monster-effect"] === 2);
    expect(!("atk" in counts), "ranges are not counted");
    expect(valueCounts(synergyCards, "trap").subtype.Normal === 1);
    expect(valueCounts(synergyCards, "spell").subtype["Quick-Play"] === 1);
    const only = { types: ["monster-normal", "monster-effect"], values: { monster: { attribute: ["DARK"] } }, synergy: [] };
    expect(synergyCards.filter((c) => matchesFilter(c, only)).length === counts.attribute.DARK, "count equals the listed cards");
  });

  check("quotedNames: straight and curly quotes, trimmed, deduplicated, quoted only", () => {
    const names = quotedNames(synergyCards[1].effect);
    expect(names.length === 1 && names[0] === "Dark Magician", "case/space duplicates merged, first spelling kept");
    expect(quotedNames(synergyCards[3].effect).join() === "Blue-Eyes White Dragon", "curly and straight merge");
    expect(quotedNames("no quotes here dark magician").length === 0);
    expect(quotedNames('"' + "x".repeat(81) + '" and "  Ok   Name "').join() === "Ok Name", "over-long dropped, spaces collapsed");
    expect(quotedNames(undefined).length === 0);
  });

  check("buildSynergyIndex: ties by quote or own name, once per card, sorted by count", () => {
    const index = buildSynergyIndex(synergyCards);
    const byKey = Object.fromEntries(index.entries.map((e) => [e.key, e.count]));
    expect(byKey["dark magician"] === 2, "Dark Magician (name) and Dark Magician Girl (quote and name) only; the unquoted trap mention is ignored");
    expect(byKey["blue-eyes white dragon"] === 2, "the quoting card and the card with that name");
    expect(index.entries[0].count >= index.entries[1].count, "highest count first");
    expect(index.entries.length === 2);
    expect(cardTiedTo(synergyCards[2], "dark magician") === false);
  });

  check("synergy: vanilla Fusion Monsters add no names and are not tied through their materials", () => {
    const vanilla = { name: "Fusion Vanilla", type: "Fusion Monster", frameType: "fusion", race: "Dragon", effect: '"Blue-Eyes White Dragon" + "Blue-Eyes White Dragon"' };
    const withEffect = { name: "Fusion Effect", type: "Fusion Monster", frameType: "fusion", race: "Dragon", effect: '"Material One" + "Material Two"\r\nOnce per turn: add 1 "Polymerization" from your Deck.' };
    const typedEffect = { name: "Fusion Typed", type: "Pendulum Effect Fusion Monster", frameType: "fusion_pendulum", effect: '"Typed Material" + "Typed Other"' };
    expect(isVanillaFusion(vanilla) && !isVanillaFusion(withEffect) && !isVanillaFusion(synergyCards[1]));
    expect(!isVanillaFusion(typedEffect), "a Fusion that is also an Effect Monster keeps its materials");
    const index = buildSynergyIndex([vanilla, withEffect, synergyCards[4]]);
    const keys = index.entries.map((e) => e.key).sort().join("|");
    expect(keys === "material one|material two|polymerization", "only the fusion with an effect adds names");
    expect(cardTiedTo(vanilla, "blue-eyes white dragon") === false, "its materials do not tie it");
    expect(cardTiedTo({ ...vanilla, name: "Blue-Eyes Ultimate Dragon" }, "blue-eyes") === true, "its own name still does");
  });

  check("synergy: cards with no effect and self-naming cards are not counted, unless another card names them", () => {
    const flavor = { name: "Flavor Normal", type: "Normal Monster", frameType: "normal", effect: 'He once met "Dark Magician".' };
    const selfNamer = { name: "Solo Dragon", type: "Effect Monster", frameType: "effect", effect: 'If "Solo Dragon" is summoned: draw 1.' };
    const namedByOther = { name: "Hero One", type: "Effect Monster", frameType: "effect", effect: 'Add "Hero Two" from your Deck.' };
    const hero2 = { name: "Hero Two", type: "Normal Monster", frameType: "normal", effect: "Plain." };
    const dm = synergyCards[0];
    let index = buildSynergyIndex([flavor, dm]);
    expect(index.entries.length === 0, "a Normal monster's flavor text names nothing");
    index = buildSynergyIndex([selfNamer]);
    expect(index.entries.length === 0 && !index.tied(selfNamer, "solo dragon"), "a card that only names itself is not counted");
    index = buildSynergyIndex([selfNamer, namedByOther, hero2]);
    const byKey = Object.fromEntries(index.entries.map((e) => [e.key, e.count]));
    expect(byKey["hero two"] === 2 && !("solo dragon" in byKey), "a card with no effect IS counted when a different card names it");
    expect(index.tied(hero2, "hero two") && index.tied(namedByOther, "hero two") && !index.tied(selfNamer, "hero two"));
    const girl = synergyCards[1];
    expect(buildSynergyIndex([girl, dm]).tied(dm, "dark magician"), "named by a different card");
    expect(!buildSynergyIndex([dm]).tied(dm, "dark magician"), "nobody names it: not counted");
    expect(matchesFilter(hero2, { types: [], values: {}, synergy: ["hero two"] }, index) && !matchesFilter(selfNamer, { types: [], values: {}, synergy: ["hero two"] }, index));
  });

  check("synergy filter: cross-type, OR inside, AND with the type tabs, empty means no restriction", () => {
    const names = (filter) => synergyCards.filter((c) => matchesFilter(c, filter)).map((c) => c.name).join("|");
    expect(names({ types: [], values: {}, synergy: ["dark magician"] }) === "Dark Magician|Dark Magician Girl");
    expect(names({ types: [], values: {}, synergy: ["dark magician", "blue-eyes white dragon"] }).split("|").length === 4, "union of two names");
    expect(names({ types: ["monster-effect"], values: {}, synergy: ["dark magician"] }) === "Dark Magician Girl", "type AND synergy");
    expect(synergyCards.every((c) => matchesFilter(c, { types: [], values: {}, synergy: [] })));
    expect(isFilterActive({ types: [], values: {}, synergy: ["x"] }) && activeFilterCount({ types: ["spell"], values: {}, synergy: ["x"] }) === 2);
  });

  check("synergy selection: sanitized, saved per profile, restored, cleared, unknown names harmless", () => {
    const clean = sanitizeFilter({ types: [], values: {}, synergy: ["  Dark   Magician ", "dark magician", 5, "", "x".repeat(81)] });
    expect(clean.synergy.join() === "dark magician", "trimmed, unique, strings only, short");
    expect(sanitizeFilter({ types: ["spell"], values: {} }).synergy.length === 0, "an older record loads without synergy");
    createProfile("SynA", "progression");
    const profileA = getActiveProfile().id;
    saveBacklogFilter({ types: [], values: {}, synergy: ["gone card"] });
    expect(loadBacklogFilter().synergy.join() === "gone card" && isFilterActive(loadBacklogFilter()));
    expect(Object.keys(buildBackup().data).includes(`ygoBacklogFilter_${profileA}`), "exported with the rest of the save");
    expect(!synergyCards.some((c) => matchesFilter(c, loadBacklogFilter())), "a name no card mentions matches nothing");
    createProfile("SynB", "progression");
    expect(!isFilterActive(loadBacklogFilter()), "the other profile has its own filter");
    setActiveProfile(profileA);
    clearBacklogFilter();
    expect(loadData(profileKey("ygoBacklogFilter")) === null);
  });

  /* ---- Pull history, rarity and pack opening (spec 010) ---- */

  check("printings: same set+rarity increments, different set/rarity adds, price stays at first pull", () => {
    const card = { name: "X", quantityOwned: 0 };
    addPrinting(card, { set: "S1", rarity: "Ultra Rare", price: 5 });
    addPrinting(card, { set: "S1", rarity: "Ultra Rare", price: 9 });
    addPrinting(card, { set: "S2", rarity: "Common", price: 0.1 });
    expect(card.printings.length === 2);
    expect(card.printings[0].quantity === 2 && card.printings[0].price === 5);
    expect(card.printings[1].set === "S2" && card.printings[1].rarity === "Common");
  });

  check("printingSummary: unknown copies for old cards, none for fresh ones", () => {
    expect(printingSummary({ quantityOwned: 3 }).unknownQuantity === 3);
    const card = { quantityOwned: 3, printings: [{ set: "S", rarity: "Rare", price: 1, quantity: 2 }] };
    const summary = printingSummary(card);
    expect(summary.unknownQuantity === 1 && summary.printings.length === 1);
    expect(printingSummary({ quantityOwned: 0, printings: [] }).unknownQuantity === 0);
  });

  check("trimPrintings keeps quantityOwned >= sum of printings (oldest trimmed first)", () => {
    const card = {
      quantityOwned: 2,
      printings: [
        { set: "A", rarity: "Rare", price: 1, quantity: 2 },
        { set: "B", rarity: "Common", price: 0, quantity: 2 },
      ],
    };
    trimPrintings(card);
    expect(printingsTotal(card) === 2);
    expect(card.printings.length === 1 && card.printings[0].set === "B");
    card.quantityOwned = 0;
    trimPrintings(card);
    expect(card.printings.length === 0);
  });

  check("rarityRank orders rarities and treats unknown as common", () => {
    expect(rarityRank("Common") === 0 && rarityRank(null) === 0 && rarityRank("") === 0);
    expect(rarityRank("Rare") > rarityRank("Common"));
    expect(rarityRank("Super Rare") > rarityRank("Rare"));
    expect(rarityRank("Secret Rare") > rarityRank("Super Rare"));
    expect(rarityRank("Ultra Secret Rare") > rarityRank("Secret Rare"));
    expect(rarityLabel(null) === "Unknown rarity" && rarityLabel("Ultra Rare") === "Ultra Rare");
  });

  check("every rarity tier has its own look and specific names beat generic ones", () => {
    const looks = RARITY_GLOW_TIERS.map((t) => t.color || (t.shine ? t.shine.join("+") : "rainbow"));
    expect(new Set(looks).size === looks.length, "two tiers share the same color");
    expect(!looks.includes(DEFAULT_RARITY_GLOW.color), "a tier reuses the common color");
    const glow = (r) => getRarityGlow(r).id;
    expect(glow("Common") === "common" && glow(null) === "common");
    expect(glow("Short Print") === "short-print" && glow("Super Short Print") === "super-short-print");
    expect(glow("Rare") === "rare" && glow("Super Rare") === "super-rare" && glow("Ultra Rare") === "ultra-rare");
    expect(glow("Ultra Rare") !== glow("Rare"), "Ultra Rare must not look like Rare");
    expect(glow("Secret Rare") === "secret" && glow("Ultra Secret Rare") === "ultra-secret");
    expect(glow("Duel Terminal Normal Parallel Rare") === "normal-parallel");
    expect(glow("Ultra Parallel Rare") === "ultra-parallel" && glow("Secret Parallel Rare") === "secret-parallel");
    expect(glow("Starlight Rare") === "starlight" && glow("Gold Secret Rare") === "gold-secret");
    expect(rarityRank("Short Print") > rarityRank("Common") && rarityRank("Rare") > rarityRank("Short Print"));
    expect(rarityRank("Ultra Rare") > rarityRank("Super Rare") && rarityRank("Ultimate Rare") > rarityRank("Ultra Rare"));
  });

  check("sortPackByRarity: rarest last, ties by price, input untouched", () => {
    const pack = [
      { name: "a", rarity: "Secret Rare", price: 1 },
      { name: "b", rarity: "Common", price: 2 },
      { name: "c", rarity: "Common", price: 1 },
      { name: "d", rarity: "Rare", price: 1 },
      { name: "e", rarity: null, price: 0 },
    ];
    const sorted = sortPackByRarity(pack);
    expect(sorted.map((c) => c.name).join("") === "ecbda");
    expect(pack[0].name === "a");
  });

  check("mergeCardsIntoBacklog records printings and preserves unknown fields", () => {
    createProfile("Merge", "progression");
    const key = profileKey("ygoCollection");
    saveData({ cards: [], decks: [{ x: 1 }], futureField: "keep" }, key);
    const ok = mergeCardsIntoBacklog([
      { name: "Dragon", set: "S1", rarity: "Ultra Rare", price: 5 },
      { name: "Dragon", set: "S2", rarity: "Common", price: 0.2 },
      { name: "Dragon", set: "S1", rarity: "Ultra Rare", price: 7 },
    ]);
    expect(ok === true);
    const blob = loadData(key);
    expect(blob.futureField === "keep" && blob.decks.length === 1);
    expect(blob.cards.length === 1 && blob.cards[0].quantityOwned === 3);
    expect(blob.cards[0].printings.length === 2 && blob.cards[0].printings[0].quantity === 2);
    expect(blob.cards[0].printings[0].price === 5);
  });

  /* ---- Copies saved early from the card details window (spec 016) ---- */

  const earlyCopy = { name: "Dragon", set: "S1", rarity: "Ultra Rare", setCode: "S1-001" };
  function openBoxPack() {
    let run = startPack(newRun(LIST), { cards: [{ ...earlyCopy }, { ...earlyCopy }, { name: "Wizard", set: "S1", rarity: "Common" }] });
    run = revealInPack(run, 0);
    run = revealInPack(run, 1);
    return run;
  }

  check("saved early: marking flags one identical revealed copy at a time", () => {
    let run = openBoxPack();
    expect(unsavedCopiesOf(run, PACK_SOURCE_BOX, earlyCopy) === 2, "two revealed identical copies");
    expect(unsavedCopiesOf(run, PACK_SOURCE_BOX, { name: "Wizard", set: "S1", rarity: "Common" }) === 0, "an unrevealed card cannot be saved early");
    run = markCardSavedEarly(run, PACK_SOURCE_BOX, earlyCopy);
    expect(run.box.pack.cards.filter((c) => c.savedEarly).length === 1 && unsavedCopiesOf(run, PACK_SOURCE_BOX, earlyCopy) === 1);
    run = markCardSavedEarly(run, PACK_SOURCE_BOX, earlyCopy);
    expect(unsavedCopiesOf(run, PACK_SOURCE_BOX, earlyCopy) === 0);
    const same = markCardSavedEarly(run, PACK_SOURCE_BOX, earlyCopy);
    expect(same === run, "with no copy left the run is unchanged");
    expect(run.box.pack.cards[2].savedEarly === undefined, "other cards are left alone");
  });

  check("saved early: a bought pack is marked the same way", () => {
    let run = { ...newRun(LIST), extraPack: { setName: "A", pack: { cards: [{ ...earlyCopy }], revealed: [true] } } };
    run = markCardSavedEarly(run, PACK_SOURCE_EXTRA, earlyCopy);
    expect(run.extraPack.pack.cards[0].savedEarly === true);
    expect(finishExtraPack(run).cards.length === 0, "a copy saved early is not saved again");
  });

  check("saved early: finishing the pack skips flagged copies, so the backlog gets exactly the pulled copies", () => {
    createProfile("Early", "progression");
    const key = profileKey("ygoCollection");
    saveData({ cards: [] }, key);
    let run = openBoxPack();
    run = revealInPack(run, 2);
    // the user puts one of the two Dragons in an engine: that single copy is saved now and flagged
    expect(mergeCardsIntoBacklog([earlyCopy]) === true);
    run = markCardSavedEarly(run, PACK_SOURCE_BOX, earlyCopy);
    const finished = finishPack(run);
    expect(finished.cards.length === 2, "the flagged copy is left out");
    expect(mergeCardsIntoBacklog(finished.cards) === true);
    const blob = loadData(key);
    const dragon = blob.cards.find((c) => c.name === "Dragon");
    expect(dragon.quantityOwned === 2 && dragon.printings[0].quantity === 2, "two Dragons were pulled, two are owned");
    expect(blob.cards.find((c) => c.name === "Wizard").quantityOwned === 1);
    expect(mergeCardsIntoBacklog([{ ...earlyCopy, savedEarly: true }]) === true && loadData(key).cards.find((c) => c.name === "Dragon").quantityOwned === 2, "the merge itself ignores flagged copies");
  });

  check("saved early: an early save can be taken back", () => {
    createProfile("Undo", "progression");
    const key = profileKey("ygoCollection");
    saveData({ cards: [] }, key);
    mergeCardsIntoBacklog([earlyCopy]);
    expect(unmergeCardFromBacklog(earlyCopy) === true && loadData(key).cards.length === 0, "the only copy goes away with its card");
    mergeCardsIntoBacklog([earlyCopy, earlyCopy]);
    unmergeCardFromBacklog(earlyCopy);
    const dragon = loadData(key).cards[0];
    expect(dragon.quantityOwned === 1 && dragon.printings[0].quantity === 1, "one copy and one printing copy remain");
  });

  check("box: phases, reveal, finish and stage completion", () => {
    let run = newRun(LIST);
    expect(boxPhase(run) === "not-started" && canOpenBox(run).ok);
    const pack = { cards: [{ name: "a" }, { name: "b" }] };
    run = startPack(run, pack);
    expect(boxPhase(run) === "in-progress" && !canOpenBox(run).ok);
    expect(run.box.pack.revealed.length === 2 && run.box.pack.revealed.every((r) => r === false));
    run = revealInPack(run, 0);
    run = revealInPack(run, 0); // revealing twice changes nothing
    expect(run.box.pulled.length === 1 && run.box.pack.revealed[0] === true);
    run = revealInPack(run, 1);
    const finished = finishPack(run);
    expect(finished.cards.length === 2 && finished.run.box.packsOpened === 1 && finished.run.box.pack === null);
    expect(!finished.run.boxOpened && boxPhase(finished.run) === "in-progress");
    expect(!canCompleteStage(finished.run).ok);
  });

  check("box: the 24th pack opens the box; stage completion resets box progress", () => {
    let run = newRun(LIST);
    for (let i = 0; i < BOX_PACKS; i++) {
      run = startPack(run, { cards: [{ name: "a" }] });
      run = revealInPack(run, 0);
      run = finishPack(run).run;
    }
    expect(run.boxOpened === true && boxPhase(run) === "finished" && run.box.packsOpened === BOX_PACKS);
    expect(canCompleteStage(run).ok);
    run = completeStage(run, LIST);
    expect(run.current === "B" && run.box.packsOpened === 0 && run.box.pulled.length === 0);
    expect(boxPhase(run) === "not-started");
  });

  check("box: legacy runs (boxOpened without box, or no box at all) still work", () => {
    const legacyOpened = { completed: [], current: "A", boxOpened: true };
    expect(boxPhase(legacyOpened) === "finished" && canCompleteStage(legacyOpened).ok);
    const legacyClosed = { completed: [], current: "A", boxOpened: false };
    expect(boxPhase(legacyClosed) === "not-started");
  });

  check("stageState: opened / next / locked", () => {
    let run = newRun(LIST);
    expect(stageState(run, "A", LIST) === "next");
    expect(stageState(run, "B", LIST) === "locked");
    run = openBoxApplied(run);
    expect(stageState(run, "A", LIST) === "opened");
    run = completeStage(run, LIST);
    expect(stageState(run, "A", LIST) === "opened" && stageState(run, "B", LIST) === "next" && stageState(run, "C", LIST) === "locked");
  });

  return results;
}
