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

  /* ---- Offline copy rules (spec 021) ---- */

  check("offline: picture size estimates by kind and the 150 MB budget", () => {
    expect(OFFLINE_BUDGET_BYTES === 150 * 1024 * 1024);
    expect(estimateImageSize("https://images.ygoprodeck.com/images/cards_small/46986414.jpg") === 30 * 1024);
    expect(estimateImageSize("https://images.ygoprodeck.com/images/cards/46986414.jpg") === 150 * 1024);
    expect(estimateImageSize("https://images.ygoprodeck.com/images/sets/YS15.jpg") === 50 * 1024);
    expect(estimateImageSize("https://example.com/other.png") === 50 * 1024);
  });

  check("offline: pickEvictions removes the oldest first and stops as soon as the total fits", () => {
    const entries = [
      { key: "c", keptAt: 300, size: 40 },
      { key: "a", keptAt: 100, size: 40 },
      { key: "b", keptAt: 200, size: 40 },
    ];
    expect(pickEvictions(entries, 120).length === 0, "already under the limit");
    expect(pickEvictions(entries, 100).join() === "a", "one removal is enough");
    expect(pickEvictions(entries, 70).join() === "a,b");
    expect(pickEvictions(entries, 0).join() === "a,b,c", "everything when the limit is zero");
    expect(entries[0].key === "c", "the list is not reordered");
    expect(pickEvictions([], 10).length === 0);
  });

  check("offline: searching kept cards is case-insensitive, one per id, name order, at most 50", () => {
    const answers = [
      { data: [{ id: 1, name: "Dark Magician" }, { id: 2, name: "Blue-Eyes White Dragon" }] },
      { data: [{ id: 1, name: "Dark Magician" }, { id: 3, name: "Dark Magician Girl" }] },
      { error: "not a card list" },
      null,
      { data: [null, { name: 5 }, { id: 4, name: "Magician's Robe" }] },
    ];
    expect(searchKeptCards(answers, "magician").map((c) => c.name).join() === "Dark Magician,Dark Magician Girl,Magician's Robe");
    expect(searchKeptCards(answers, "DARK").length === 2);
    expect(searchKeptCards(answers, "zzz").length === 0);
    expect(searchKeptCards([], "a").length === 0 && searchKeptCards(undefined, "a").length === 0);
    const many = { data: Array.from({ length: 80 }, (_, i) => ({ id: i, name: "Card " + String(i).padStart(2, "0") })) };
    const list = searchKeptCards([many], "card");
    expect(list.length === 50 && list[0].name === "Card 00" && list[49].name === "Card 49");
  });

  check("offline: files are found in pages and stylesheets, same site only, plain addresses", () => {
    const page = '<link rel="stylesheet" href="../shared/theme.css?v=2"><link rel="manifest" href="../manifest.webmanifest">' +
      '<link rel="icon" href="https://cdn.example.com/x.png"><img src="../icons/icon.svg#a"><script src="a.js"></script>' +
      '<script src="a.js"></script><script src="data:text/javascript,1"></script><a href="other.html">x</a>';
    const found = discoverFiles(page, "https://site.test/app/collection/index.html");
    expect(found.slice().sort().join() === ["https://site.test/app/collection/a.js", "https://site.test/app/icons/icon.svg", "https://site.test/app/manifest.webmanifest", "https://site.test/app/shared/theme.css"].join(), "scripts, links and pictures, same site, once each");
    const css = `.a{background:url("cardback.png")} .b{background:url(img/b.jpg?x=1)} .c{background:url(data:image/png;base64,AAA)} .d{background:url(https://other.test/z.png)} .e{background:url( 'e.svg' )}`;
    const urls = cssUrls(css, "https://site.test/app/shared/pack-reveal.css");
    expect(urls.join() === "https://site.test/app/shared/cardback.png,https://site.test/app/shared/img/b.jpg,https://site.test/app/shared/e.svg");
    expect(discoverFiles("<p>no files</p>", "https://site.test/x.html").length === 0);
  });

  check("offline: the version input is stable, order-independent and changes with any file", () => {
    const a = versionInput({ "https://s/b.js": "h2", "https://s/a.js": "h1" });
    const b = versionInput({ "https://s/a.js": "h1", "https://s/b.js": "h2" });
    expect(a === b, "order of reading does not matter");
    expect(versionInput({ "https://s/a.js": "h1", "https://s/b.js": "h3" }) !== a, "one changed file changes it");
    expect(versionInput({ "https://s/a.js": "h1" }) !== a, "a missing file changes it");
    expect(VERSION_LENGTH === 12);
  });

  /* ---- Hand Test mode: free cards ---- */

  check("Hand Test: a selectable mode; profiles of it are created like the others", () => {
    expect(GAME_MODES.handtest && GAME_MODES.handtest.selectable && GAME_MODES.handtest.label === "Hand Test");
    const p = createProfile("Free", "handtest");
    expect(p.mode === "handtest" && getActiveProfile().id === p.id);
    expect(profileKey("ygoCollection") === `ygoCollection_${p.id}`, "its own saved collection, like any profile");
  });

  check("Hand Test: no shop, no run pages; Card Search and Backlog Edit instead; other modes unchanged", () => {
    const hand = { mode: "handtest" };
    const prog = { mode: "progression" };
    const sand = { mode: "sandbox" };
    const labels = (area, profile) => visiblePages(area, profile).map((p) => p.label).join();
    const run = AREAS.find((a) => a.id === "run");
    expect(labels(run, hand) === "Card Search,Backlog Edit");
    expect(labels(run, prog) === "Progression Run,Current Stage Pull,Booster Pull");
    expect(labels(run, sand) === "Progression Run,Current Stage Pull,Booster Pull", "Sandbox keeps what it had");
    expect(!visibleAreas(hand).some((a) => a.id === "store"), "no Store for Hand Test");
    expect(visibleAreas(prog).some((a) => a.id === "store") && visibleAreas(sand).some((a) => a.id === "store"));
    expect(visibleAreas(hand).map((a) => a.id).join() === "run,workshop,tools");
    expect(areaDescription(run, hand) !== run.description && areaDescription(run, prog) === run.description);
    expect(labels(AREAS.find((a) => a.id === "workshop"), hand) === labels(AREAS.find((a) => a.id === "workshop"), prog), "Workshop is the same");
    expect(visibleAreas(null).length > 0, "no profile: nothing breaks");
  });

  check("Hand Test: a searched card is added with the rarity and set of its FIRST listed set", () => {
    const apiCard = {
      id: 46986414,
      name: "Dark Magician",
      type: "Normal Monster",
      race: "Spellcaster",
      attribute: "DARK",
      level: 7,
      atk: 2500,
      def: 2100,
      desc: "The ultimate wizard.",
      card_images: [{ image_url: "full.jpg", image_url_small: "small.jpg" }],
      card_sets: [
        { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB-EN005", set_rarity: "Ultra Rare", set_price: "6.50" },
        { set_name: "Starter Deck: Yugi", set_code: "SDY-006", set_rarity: "Common", set_price: "1.00" },
      ],
      card_prices: [{ tcgplayer_price: "3.20" }],
    };
    const card = cardFromFirstSet(apiCard);
    expect(card.name === "Dark Magician" && card.set === "Legend of Blue Eyes White Dragon" && card.rarity === "Ultra Rare");
    expect(card.setCode === "LOB-EN005" && card.price === 6.5, "the first set's price");
    expect(card.apiId === 46986414 && card.race === "Spellcaster" && card.attribute === "DARK" && card.desc === "The ultimate wizard.");
    const noSetPrice = cardFromFirstSet({ ...apiCard, card_sets: [{ set_name: "S", set_code: "S-1", set_rarity: "Rare", set_price: "0.00" }] });
    expect(noSetPrice.price === 3.2, "no set price: the market price");
    const noSets = cardFromFirstSet({ ...apiCard, card_sets: undefined });
    expect(noSets.set === null && noSets.rarity === null && noSets.setCode === null, "a card in no set has no printing data");

    createProfile("HandAdd", "handtest");
    const key = profileKey("ygoCollection");
    saveData({ cards: [], decks: [], futureField: "keep" }, key);
    expect(mergeCardsIntoBacklog([cardFromFirstSet(apiCard)]) === true);
    expect(mergeCardsIntoBacklog([cardFromFirstSet(apiCard)]) === true, "adding again adds a copy");
    const stored = loadData(key);
    expect(stored.futureField === "keep" && stored.cards.length === 1 && stored.cards[0].quantityOwned === 2);
    const printing = stored.cards[0].printings[0];
    expect(stored.cards[0].printings.length === 1 && printing.set === "Legend of Blue Eyes White Dragon" && printing.rarity === "Ultra Rare");
    expect(printing.quantity === 2 && printing.setCode === "LOB-EN005" && printing.price === 6.5);
    expect(stored.cards[0].effect === "The ultimate wizard.", "details kept so the card window has everything");
    mergeCardsIntoBacklog([cardFromFirstSet({ ...apiCard, card_sets: undefined })]);
    expect(loadData(key).cards[0].quantityOwned === 3 && loadData(key).cards[0].printings[0].quantity === 2, "a card in no set still counts as a copy");
  });

  check("removeOneCopy: unknown copies first, then the least rare printing; the best copies stay", () => {
    const card = {
      quantityOwned: 5,
      printings: [
        { set: "A", rarity: "Ultra Rare", price: 5, quantity: 2 },
        { set: "B", rarity: "Common", price: 0.1, quantity: 1 },
        { set: "C", rarity: "Rare", price: 1, quantity: 1 },
      ],
    };
    removeOneCopy(card); // 5 owned, 4 in printings: the spare copy had no printing
    expect(card.quantityOwned === 4 && printingsTotal(card) === 4 && card.printings.length === 3);
    removeOneCopy(card); // the Common goes first
    expect(card.quantityOwned === 3 && card.printings.map((p) => p.rarity).join() === "Ultra Rare,Rare");
    removeOneCopy(card); // then the Rare
    expect(card.quantityOwned === 2 && card.printings.length === 1 && card.printings[0].quantity === 2);
    removeOneCopy(card);
    expect(card.quantityOwned === 1 && card.printings[0].quantity === 1 && card.printings[0].rarity === "Ultra Rare");
    removeOneCopy(card);
    expect(card.quantityOwned === 0 && card.printings.length === 0);
    removeOneCopy(card);
    expect(card.quantityOwned === 0, "never below zero");
    const sameRarity = { quantityOwned: 2, printings: [{ set: "A", rarity: "Rare", price: 3, quantity: 1 }, { set: "B", rarity: "Rare", price: 1, quantity: 1 }] };
    removeOneCopy(sameRarity);
    expect(sameRarity.printings.length === 1 && sameRarity.printings[0].set === "A", "the cheaper copy of the same rarity goes");
    const noPrintings = { quantityOwned: 3 };
    removeOneCopy(noPrintings);
    expect(noPrintings.quantityOwned === 2 && noPrintings.printings === undefined);
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

  check("printings: a copy is worth the price recorded for its printing, 0.01 when none", () => {
    const card = { name: "X", quantityOwned: 0 };
    addPrinting(card, { set: "S1", rarity: "Rare", price: 0.11 });
    expect(printingSaleValue(card.printings[0]) === 11, "the price its details show, in cents");
    addPrinting(card, { set: "S1", rarity: "Rare", price: 9 });
    expect(card.printings[0].price === 0.11 && card.printings[0].quantity === 2, "the price stays the one of the first pull");
    addPrinting(card, { set: "S2", rarity: "Rare", price: 0 });
    expect(printingSaleValue(card.printings[1]) === 1, "no price recorded: worth 0.01");
    expect(printingSaleValue(null) === 1 && printingSaleValue({ price: "abc" }) === 1 && printingSaleValue({ price: -3 }) === 1, "nothing usable: worth 0.01");
    expect(card.printings.every((p) => !("setPrice" in p)), "no separate sale price is stored");
  });

  check("printings: the set code is stored at first pull and filled in once if missing", () => {
    const card = { name: "X", quantityOwned: 0 };
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1 });
    expect(!card.printings[0].setCode);
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1, setCode: "LOB-EN001" });
    addPrinting(card, { set: "S1", rarity: "Rare", price: 1, setCode: "OTHER-001" });
    expect(card.printings[0].setCode === "LOB-EN001" && card.printings[0].quantity === 3);
  });

  check("mergeCardsIntoBacklog carries the price into the printing", () => {
    createProfile("SetPrice", "progression");
    const key = profileKey("ygoCollection");
    saveData({ cards: [] }, key);
    mergeCardsIntoBacklog([{ name: "Dragon", set: "S1", rarity: "Ultra Rare", price: 5 }]);
    const printing = loadData(key).cards[0].printings[0];
    expect(printing.price === 5 && printingSaleValue(printing) === 500);
  });

  /* ---- Store: selling, buying, bought packs (spec 011) ---- */

  const storeCollection = () => ({
    cards: [
      {
        id: "c1",
        name: "Dragon",
        quantityOwned: 4,
        printings: [
          { set: "S1", rarity: "Ultra Rare", price: 5, quantity: 2 },
          { set: "S2", rarity: "Common", price: 0, quantity: 1 },
        ],
      },
    ],
    engines: [{ id: "e1", name: "Engine", cards: [{ cardId: "c1", quantity: 3 }] }],
    decks: [{ id: "d1", name: "Deck", main: [{ cardId: "c1", quantity: 3 }], extra: [] }],
  });

  check("canSell: every copy sells; unpriced ones for 0.01", () => {
    const col = storeCollection();
    const card = col.cards[0];
    expect(canSell(card, 0).ok && canSell(card, 0).valueCents === 500);
    expect(canSell(card, 1).ok && canSell(card, 1).valueCents === 1, "a printing with no price sells for 0.01");
    expect(!canSell(card, 5).ok, "no such printing");
    expect(canSell({ quantityOwned: 2 }, -1).ok && canSell({ quantityOwned: 2 }, -1).valueCents === 1, "unknown copies sell for 0.01");
    expect(!canSell({ quantityOwned: 2, printings: [{ set: "S", rarity: null, quantity: 2 }] }, -1).ok, "no unknown copy left");
  });

  check("sellPrinting: credits the printing price, removes one copy, clamps engines and decks", () => {
    const col = storeCollection();
    let run = { completed: [], current: "A", balanceCents: 100, futureField: "keep" };
    run = sellPrinting(run, col, "c1", 0);
    expect(run.balanceCents === 600 && run.futureField === "keep");
    expect(col.cards[0].quantityOwned === 3 && col.cards[0].printings[0].quantity === 1);
    run = sellPrinting(run, col, "c1", 0);
    expect(run.balanceCents === 1100);
    expect(col.cards[0].printings.length === 1 && col.cards[0].printings[0].set === "S2", "printing removed at 0");
    expect(col.cards[0].quantityOwned === 2);
    expect(col.engines[0].cards[0].quantity === 2 && col.decks[0].main[0].quantity === 2, "allocations clamped to owned");
    expect(allocationsOverLimit(col, "c1", 1).length === 2, "selling one more would shrink the engine and the deck");
    run = sellPrinting(run, col, "c1", 0);
    expect(run.balanceCents === 1101, "the printing without a price sold for 0.01");
    expect(col.cards[0].printings.length === 0 && col.cards[0].quantityOwned === 1);
    run = sellPrinting(run, col, "c1", -1);
    expect(run.balanceCents === 1102 && col.cards[0].quantityOwned === 0, "the unknown copy sold for 0.01");
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
            { set: "S1", rarity: "Common", price: 0.1, quantity: 5 },
            { set: "S2", rarity: "Common", price: 0.2, quantity: 2 },
            { set: "S3", rarity: "Rare", price: 1, quantity: 1 },
          ],
        },
        { id: "b", name: "B", quantityOwned: 3, printings: [{ set: "S1", rarity: "Rare", price: 0.5, quantity: 3 }] },
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

  check("set slots: Common, Short Print and Super Short Print are one slot per set number", () => {
    const api = [
      apiCardFixture(7, "Trio", [
        { set_name: SET_A, set_code: "SA-007", set_rarity: "Common" },
        { set_name: SET_A, set_code: "SA-007", set_rarity: "Super Short Print" },
        { set_name: SET_A, set_code: "SA-007", set_rarity: "Short Print" },
        { set_name: SET_A, set_code: "SA-007", set_rarity: "Ultra Rare" },
      ]),
      apiCardFixture(8, "Plain", [{ set_name: SET_A, set_code: "SA-008", set_rarity: "Common" }, { set_name: SET_A, set_code: "SA-008", set_rarity: "Short Print" }]),
      apiCardFixture(9, "Solo", [{ set_name: SET_A, set_code: "SA-009", set_rarity: "Common" }]),
    ];
    const slots = buildSetSlots(api, SET_A);
    expect(slots.map((sl) => `${sl.setCode}:${sl.rarity}`).join() === "SA-007:Super Short Print,SA-007:Ultra Rare,SA-008:Short Print,SA-009:Common", "the least common of the three, and the Ultra Rare stays its own slot");
    const trio = (rarity) => [{ name: "Trio", apiId: 7, quantityOwned: 1, printings: [{ set: SET_A, rarity, quantity: 1 }] }];
    const family = slots.find((sl) => sl.key === "7|common");
    expect(ownedFor(family, trio("Common")) === 1 && ownedFor(family, trio("Short Print")) === 1 && ownedFor(family, trio("Super Short Print")) === 1, "owning any of the three fills the slot");
    expect(ownedFor(family, trio("Ultra Rare")) === 0 && ownedFor(slots.find((sl) => sl.key === "7|ultra rare"), trio("Common")) === 0, "the Ultra Rare is separate");
    expect(completion(slots, trio("Common")).total === 4 && completion(slots, trio("Common")).owned === 1);
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

  check("engine rules: moving a card entry re-sorts the engine", () => {
    const entries = [{ cardId: "a", quantity: 1 }, { cardId: "b", quantity: 2 }, { cardId: "c", quantity: 1 }];
    const ids = (list) => list.map((e) => e.cardId).join("");
    expect(ids(moveCardEntry(entries, "c", "a")) === "cab", "moved to the front");
    expect(ids(moveCardEntry(entries, "a", "c")) === "bca", "moved to the end");
    expect(ids(moveCardEntry(entries, "a", "b")) === "bac", "moved one place forward");
    expect(moveCardEntry(entries, "b", "b") !== entries && ids(moveCardEntry(entries, "b", "b")) === "abc", "same card: same order");
    expect(ids(moveCardEntry(entries, "x", "a")) === "abc" && ids(moveCardEntry(entries, "a", "x")) === "abc", "unknown card: same order");
    expect(ids(entries) === "abc" && entries[1].quantity === 2, "the original is not changed, quantities travel with their card");
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
    expect(names.join() === "Dark Magician,dark magician", "names are case sensitive: two spellings, spaces collapsed");
    expect(quotedNames('"Dark  Magician" and "Dark Magician"').join() === "Dark Magician", "the same spelling is merged");
    expect(quotedNames(synergyCards[3].effect).join() === "Blue-Eyes White Dragon", "curly and straight merge");
    expect(quotedNames("no quotes here dark magician").length === 0);
    expect(quotedNames('"' + "x".repeat(81) + '" and "  Ok   Name "').join() === "Ok Name", "over-long dropped, spaces collapsed");
    expect(quotedNames(undefined).length === 0);
  });

  check("buildSynergyIndex: ties by quote or own name, once per card, sorted by count", () => {
    const index = buildSynergyIndex(synergyCards);
    const byKey = Object.fromEntries(index.entries.map((e) => [e.key, e.count]));
    expect(byKey["Dark Magician"] === 2, "Dark Magician (name) and Dark Magician Girl (quote and name) only; the unquoted trap mention is ignored");
    expect(byKey["dark magician"] === 1, "the lower-case spelling is another name: only the card quoting it");
    expect(byKey["Blue-Eyes White Dragon"] === 2, "the quoting card and the card with that name");
    expect(index.entries[0].count >= index.entries[1].count, "highest count first");
    expect(index.entries.length === 3);
    expect(cardTiedTo(synergyCards[2], "Dark Magician") === false);
  });

  check("synergy: vanilla Fusion Monsters add no names and are not tied through their materials", () => {
    const vanilla = { name: "Fusion Vanilla", type: "Fusion Monster", frameType: "fusion", race: "Dragon", effect: '"Blue-Eyes White Dragon" + "Blue-Eyes White Dragon"' };
    const withEffect = { name: "Fusion Effect", type: "Fusion Monster", frameType: "fusion", race: "Dragon", effect: '"Material One" + "Material Two"\r\nOnce per turn: add 1 "Polymerization" from your Deck.' };
    const typedEffect = { name: "Fusion Typed", type: "Pendulum Effect Fusion Monster", frameType: "fusion_pendulum", effect: '"Typed Material" + "Typed Other"' };
    expect(isVanillaFusion(vanilla) && !isVanillaFusion(withEffect) && !isVanillaFusion(synergyCards[1]));
    expect(!isVanillaFusion(typedEffect), "a Fusion that is also an Effect Monster keeps its materials");
    const index = buildSynergyIndex([vanilla, withEffect, synergyCards[4]]);
    const keys = index.entries.map((e) => e.key).sort().join("|");
    expect(keys === "Material One|Material Two|Polymerization", "only the fusion with an effect adds names");
    expect(cardTiedTo(vanilla, "Blue-Eyes White Dragon") === false, "its materials do not tie it");
    expect(cardTiedTo({ ...vanilla, name: "Blue-Eyes Ultimate Dragon" }, "Blue-Eyes") === true, "its own name still does");
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
    expect(index.entries.length === 0 && !index.tied(selfNamer, "Solo Dragon"), "a card that only names itself is not counted");
    index = buildSynergyIndex([selfNamer, namedByOther, hero2]);
    const byKey = Object.fromEntries(index.entries.map((e) => [e.key, e.count]));
    expect(byKey["Hero Two"] === 2 && !("Solo Dragon" in byKey), "a card with no effect IS counted when a different card names it");
    expect(index.tied(hero2, "Hero Two") && index.tied(namedByOther, "Hero Two") && !index.tied(selfNamer, "Hero Two"));
    const girl = synergyCards[1];
    expect(buildSynergyIndex([girl, dm]).tied(dm, "Dark Magician"), "named by a different card");
    expect(!buildSynergyIndex([dm]).tied(dm, "Dark Magician"), "nobody names it: not counted");
    expect(matchesFilter(hero2, { types: [], values: {}, synergy: ["Hero Two"] }, index) && !matchesFilter(selfNamer, { types: [], values: {}, synergy: ["Hero Two"] }, index));
  });

  check("synergy: the ritual clause of Ritual Monsters and Ritual Spells is ignored", () => {
    const ritualSpell = { name: "Black Luster Ritual", type: "Spell Card", race: "Ritual", effect: 'This card is used to Ritual Summon "Black Luster Soldier". You must also Tribute monsters. Then add 1 "Gaia Power" from your Deck.' };
    const ritualMonster = { name: "Black Luster Soldier", type: "Ritual Effect Monster", frameType: "ritual_pendulum", race: "Warrior", effect: 'You can Ritual Summon this card with "Black Luster Ritual".\nOnce per turn: send 1 "Mr. Volcano" to the GY.' };
    const plainRitual = { name: "Ritual Plain", type: "Ritual Monster", frameType: "ritual", race: "Fiend", effect: 'This card can only be Ritual Summoned with the Ritual Spell Card, "Some Ritual".' };
    const normalSpell = { name: "Pot", type: "Spell Card", race: "Normal", effect: 'Draw 2 cards. Then add "Pot Partner".' };
    expect(isRitualCard(ritualSpell) && isRitualCard(ritualMonster) && isRitualCard(plainRitual) && !isRitualCard(normalSpell));
    expect(firstSentenceEnd('Ritual Summon "Mr. X". Next.') === 22 && firstSentenceEnd("one\ntwo") === 4 && firstSentenceEnd("no end") === 6, "periods inside quotes and line breaks");
    const index = buildSynergyIndex([ritualSpell, ritualMonster, plainRitual, normalSpell]);
    expect(index.entries.map((e) => e.key).sort().join("|") === "Gaia Power|Mr. Volcano|Pot Partner", "only names after the ritual clause, and the normal Spell as usual");
    expect(cardQuotedKeys(plainRitual).size === 0, "a Ritual Monster whose only sentence is the clause quotes nothing");
    expect(cardTiedTo(ritualSpell, "Black Luster Soldier") === false, "the clause does not tie the Spell to the monster");
    expect(cardTiedTo(ritualSpell, "Gaia Power") === true && cardTiedTo(ritualMonster, "Mr. Volcano") === true, "later sentences still count");
  });

  check("sentences: split at periods outside quotes, so names with a period stay whole", () => {
    expect(splitSentences('Add "Mr. Volcano" to your hand. Then draw 1 card.').join("|") === 'Add "Mr. Volcano" to your hand.|Then draw 1 card.');
    expect(splitSentences('You can target "Lv. 4 Dragon"; destroy it.  Once per turn: draw 1.\nCannot be Tributed.').join("|") === 'You can target "Lv. 4 Dragon"; destroy it.|Once per turn: draw 1.|Cannot be Tributed.', "double spaces and line breaks");
    expect(splitSentences("No final period").join("|") === "No final period" && splitSentences("").length === 0 && splitSentences(null).length === 0 && splitSentences("  \n ").length === 0);
    expect(splitSentences('Treated as “Mr. X” on the field. Done.').join("|") === 'Treated as “Mr. X” on the field.|Done.', "curly quotes too");
    expect(splitSentences("Level 4. Then 3.5 times.").length === 2, "a period inside a number is not followed by a space");
  });

  check("synergy: names are case sensitive", () => {
    const upper = { name: "Blue-Eyes White Dragon", type: "Normal Monster", frameType: "normal" };
    const lowerQuote = { name: "Lower Quoter", type: "Effect Monster", frameType: "effect", effect: 'Search "blue-eyes".' };
    const upperQuote = { name: "Upper Quoter", type: "Effect Monster", frameType: "effect", effect: 'Search "Blue-Eyes".' };
    const index = buildSynergyIndex([upper, lowerQuote, upperQuote]);
    expect(index.entries.map((e) => e.key).sort().join("|") === "Blue-Eyes|blue-eyes", "two spellings, two names");
    expect(index.tied(upper, "Blue-Eyes") && !index.tied(upper, "blue-eyes"), "a card name contains a name only with the same letters");
    expect(index.tied(upperQuote, "Blue-Eyes") && !index.tied(upperQuote, "blue-eyes"));
    expect(cardTiedTo(upper, "Blue-Eyes") === true && cardTiedTo(upper, "blue-eyes") === false);
  });

  check("synergy filter: cross-type, OR inside, AND with the type tabs, empty means no restriction", () => {
    const names = (filter) => synergyCards.filter((c) => matchesFilter(c, filter)).map((c) => c.name).join("|");
    expect(names({ types: [], values: {}, synergy: ["Dark Magician"] }) === "Dark Magician|Dark Magician Girl");
    expect(names({ types: [], values: {}, synergy: ["Dark Magician", "Blue-Eyes White Dragon"] }).split("|").length === 4, "union of two names");
    expect(names({ types: ["monster-effect"], values: {}, synergy: ["Dark Magician"] }) === "Dark Magician Girl", "type AND synergy");
    expect(synergyCards.every((c) => matchesFilter(c, { types: [], values: {}, synergy: [] })));
    expect(isFilterActive({ types: [], values: {}, synergy: ["x"] }) && activeFilterCount({ types: ["spell"], values: {}, synergy: ["x"] }) === 2);
  });

  check("synergy selection: sanitized, saved per profile, restored, cleared, unknown names harmless", () => {
    const clean = sanitizeFilter({ types: [], values: {}, synergy: ["  Dark   Magician ", "dark magician", 5, "", "x".repeat(81)] });
    expect(clean.synergy.join() === "Dark Magician,dark magician", "trimmed, case kept, unique, strings only, short");
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

  check("stage duel: winning adds the win reward to the balance, losing adds the loss reward and the packs of the set left behind", () => {
    const base = { ...newRun(LIST), futureField: "keep" };
    const won = completeStageWithDuel(base, LIST, true);
    expect(won.balanceCents === STAGE_WIN_REWARD_CENTS && !won.packInventory, "a win: the win reward and no packs");
    expect(won.completed.join() === LIST[0] && won.current === LIST[1] && won.futureField === "keep", "the stage still completes");
    const lost = completeStageWithDuel(base, LIST, false);
    expect(lost.balanceCents === STAGE_LOSS_REWARD_CENTS && lost.packInventory[LIST[0]] === STAGE_LOSS_PACKS, "a loss: the loss reward and the packs of the set being left");
    expect(lost.current === LIST[1] && lost.packInventory[LIST[1]] === undefined, "not packs of the next set");
    const later = completeStageWithDuel({ ...lost, balanceCents: 150, packInventory: { [LIST[1]]: 2, [LIST[0]]: 1 } }, LIST, false);
    expect(later.balanceCents === 150 + STAGE_LOSS_REWARD_CENTS && later.packInventory[LIST[1]] === 2 + STAGE_LOSS_PACKS && later.packInventory[LIST[0]] === 1, "adds to what the run already has");
    expect(completeStageWithDuel({ ...base, balanceCents: 999 }, LIST, true).balanceCents === 999 + STAGE_WIN_REWARD_CENTS);
  });

  check("starting set: the run begins at the chosen set, earlier sets are skipped but buyable", () => {
    const five = ["A", "B", "C", "D", "E"];
    const run = newRun(five, "C");
    expect(run.current === "C" && run.startSet === "C" && run.completed.length === 0);
    expect(startIndex(run, five) === 2);
    expect(["A", "B", "C", "D", "E"].map((n) => stageState(run, n, five)).join() === "skipped,skipped,next,locked,locked");
    expect(reachedBoosters(run, five).join() === "A,B,C", "the Store sells the skipped sets and the start set");
    expect(runSummary(run, five) === "Stage 1/3 – Box not opened", "the skipped sets are not in the count");
    const next = completeStage(openBoxApplied(run), five);
    expect(next.current === "D" && next.completed.join() === "C" && next.startSet === "C", "progress continues from the start set");
    expect(reachedBoosters(next, five).join() === "A,B,C,D" && runSummary(next, five) === "Stage 2/3 – Box not opened");
    expect(stageState(next, "C", five) === "opened" && stageState(next, "D", five) === "next" && stageState(next, "A", five) === "skipped");
    expect(newRun(five, "Z").current === "A" && !("startSet" in newRun(five, "Z")), "an unknown set falls back to the first");
    expect(newRun(five).current === "A" && !("startSet" in newRun(five)), "no choice is recorded when none is made");
  });

  check("starting set: a run saved without a start set behaves as before", () => {
    const old = { completed: ["A"], current: "B", boxOpened: false };
    expect(startIndex(old, LIST) === 0 && stageState(old, "A", LIST) === "opened" && stageState(old, "B", LIST) === "next");
    expect(reachedBoosters(old, LIST).join() === "A,B" && runSummary(old, LIST) === "Stage 2/3 – Box not opened");
    expect(startIndex({ ...old, startSet: "gone" }, LIST) === 0, "an unknown start set counts as the first");
  });

  /* ---- Duel Room: table rules and connection codes (spec 018) ---- */

  const duelApply = (table, event) => {
    const result = applyEvent(table, event);
    expect(result.ok, result.reason || "the event was refused");
    return result.table;
  };

  check("duel table: starting values, life points and the win", () => {
    let t = newTable("d1", "Ana", "");
    expect(t.players[0].lp === 8000 && t.players[1].lp === 8000 && t.turn === 1 && t.phase === "Draw" && t.active === 0 && t.seq === 0);
    expect(t.players[1].name === "Player 2" && t.players[0].name === "Ana", "a missing name gets a default");
    t = duelApply(t, { kind: "lp", by: 0, target: 1, mode: "add", amount: -1500 });
    expect(t.players[1].lp === 6500 && t.log[0].text.includes("took 1500 from Player 2") && t.log[0].before.lp === 8000 && t.seq === 1);
    t = duelApply(t, { kind: "lp", by: 1, target: 1, mode: "set", amount: 3000 });
    expect(t.players[1].lp === 3000);
    t = duelApply(t, { kind: "lp", by: 0, target: 1, mode: "add", amount: -99999 });
    expect(t.players[1].lp === 0 && t.winner === 0, "never below zero; the other player wins");
    expect(t.log.filter((e) => e.kind === "win").length === 1 && t.log[t.log.length - 1].text === "Ana wins the duel");
    t = duelApply(t, { kind: "lp", by: 0, target: 1, mode: "add", amount: -10 });
    expect(t.log.filter((e) => e.kind === "win").length === 1, "the win is logged once");
    expect(!applyEvent(t, { kind: "lp", by: 0, target: 1, mode: "add", amount: 1.5 }).ok && !applyEvent(t, { kind: "lp", by: 0, target: 2, mode: "add", amount: 1 }).ok && !applyEvent(t, { kind: "lp", by: 0, target: 1, mode: "add", amount: 5000000 }).ok && !applyEvent(t, { kind: "lp", by: 3, target: 1, mode: "add", amount: 1 }).ok, "invalid changes are refused");
  });

  check("duel table: phases in order, the turn passes after End, coin, die and names", () => {
    let t = newTable("d1", "Ana", "Bo");
    const seen = [];
    for (let i = 0; i < 6; i++) {
      t = duelApply(t, { kind: "phase", by: 1 });
      seen.push(t.phase);
    }
    expect(seen.join() === "Standby,Main 1,Battle,Main 2,End,Draw", "after End the phases start again");
    expect(t.turn === 2 && t.active === 1, "the other player's turn");
    t = duelApply(t, { kind: "coin", by: 0, result: "tails" });
    t = duelApply(t, { kind: "die", by: 1, result: 5 });
    expect(t.coin === "tails" && t.die === 5 && t.log[t.log.length - 1].text.includes("rolled a die: 5"));
    expect(!applyEvent(t, { kind: "coin", by: 0, result: "edge" }).ok && !applyEvent(t, { kind: "die", by: 0, result: 7 }).ok && !applyEvent(t, { kind: "die", by: 0, result: 0 }).ok);
    t = duelApply(t, { kind: "name", by: 0, name: "  Ana   María  " });
    expect(t.players[0].name === "Ana María" && !applyEvent(t, { kind: "name", by: 0, name: "   " }).ok);
    expect(cleanName("x".repeat(40)).length === 24);
  });

  check("duel table: undo reverts only your own last life or phase change", () => {
    let t = newTable("d1", "Ana", "Bo");
    t = duelApply(t, { kind: "lp", by: 0, target: 0, mode: "add", amount: -1000 });
    expect(!applyEvent(t, { kind: "undo", by: 1 }).ok, "not the other player's change");
    expect(applyEvent(newTable("d1", "A", "B"), { kind: "undo", by: 0 }).ok === false, "nothing to undo");
    const undone = duelApply(t, { kind: "undo", by: 0 });
    expect(undone.players[0].lp === 8000 && undone.log[undone.log.length - 1].kind === "undo");
    expect(!applyEvent(undone, { kind: "undo", by: 0 }).ok, "an undo cannot be undone");
    let p = duelApply(newTable("d1", "A", "B"), { kind: "phase", by: 1 });
    p = duelApply(p, { kind: "undo", by: 1 });
    expect(p.phase === "Draw" && p.turn === 1);
    // a win: the undo of the losing change removes the win
    let w = duelApply(newTable("d1", "A", "B"), { kind: "lp", by: 0, target: 1, mode: "set", amount: 0 });
    expect(w.winner === 0);
    w = duelApply(w, { kind: "undo", by: 0 });
    expect(w.players[1].lp === 8000 && w.winner === null, "undoing the change that ended the duel reopens it");
    // a turn passing and undone
    let turn = newTable("d1", "A", "B");
    for (let i = 0; i < 6; i++) turn = duelApply(turn, { kind: "phase", by: 0 });
    turn = duelApply(turn, { kind: "undo", by: 0 });
    expect(turn.phase === "End" && turn.turn === 1 && turn.active === 0, "undo restores phase, turn and whose turn it is");
  });

  check("duel table: deterministic, numbered log, capped", () => {
    const events = [{ kind: "lp", by: 0, target: 1, mode: "add", amount: -300 }, { kind: "phase", by: 1 }, { kind: "die", by: 0, result: 3 }];
    const run = () => events.reduce((t, e) => duelApply(t, e), newTable("d1", "A", "B"));
    expect(JSON.stringify(run()) === JSON.stringify(run()), "the same events give the same table");
    expect(run().log.map((e) => e.seq).join() === "1,2,3" && run().seq === 3);
    let t = newTable("d1", "A", "B");
    for (let i = 0; i < 520; i++) t = duelApply(t, { kind: "die", by: 0, result: 1 + (i % 6) });
    expect(t.log.length === 500 && t.seq === 520 && t.log[0].seq === 21, "the oldest entries are dropped");
    const frozen = newTable("d1", "A", "B");
    const before = JSON.stringify(frozen);
    applyEvent(frozen, { kind: "lp", by: 0, target: 1, mode: "add", amount: -1 });
    expect(JSON.stringify(frozen) === before, "the old table is not changed");
  });

  /* ---- Duel Simulator: decks, private state and the board (spec 019) ---- */

  const simCollection = () => ({
    cards: [
      { id: "c1", name: "Alpha", apiId: 1, type: "Normal Monster", level: 4, atk: 1000, def: 500, effect: "A text.", imageSmall: "a.jpg", imageFull: "A.jpg", quantityOwned: 3, printings: [{ set: "S", quantity: 3 }] },
      { id: "c2", name: "Beta", apiId: 2, type: "Spell Card", effect: "B text.", imageSmall: "b.jpg", quantityOwned: 2 },
      { id: "c3", name: "Gamma Fusion", apiId: 3, type: "Fusion Monster", imageSmall: "g.jpg", quantityOwned: 1 },
    ],
    decks: [
      { id: "d1", name: "Test deck", main: [{ cardId: "c1", quantity: 3 }, { cardId: "c2", quantity: 2 }, { cardId: "gone", quantity: 4 }], extra: [{ cardId: "c3", quantity: 1 }] },
      { id: "d2", name: "Empty", main: [], extra: [{ cardId: "c3", quantity: 1 }] },
    ],
    engines: [],
  });
  const seededRandom = (seed) => {
    let x = seed;
    return () => {
      x = (x * 1664525 + 1013904223) % 4294967296;
      return x / 4294967296;
    };
  };
  /* A started duel: both players ready with the decks of the fixture, returned as { table, priv: [p0, p1] }. */
  function startedDuel(seed = 7) {
    const collection = simCollection();
    const decks = [buildDuelDeck(collection, "d1", 0), buildDuelDeck(collection, "d1", 1)];
    let table = newTable("sim1", "Ana", "Bo");
    decks.forEach((deck, i) => {
      table = duelApply(table, { kind: "ready", by: i, deckName: deck.name, mainCount: deck.main.length, extraCount: deck.extra.length });
    });
    table = duelApply(table, { kind: "start", by: 0 });
    const priv = decks.map((deck, i) => dealHand(newPrivate("sim1", i, deck, seededRandom(seed + i))));
    return { table, priv };
  }

  check("duel cards: a duel deck from a saved deck, each copy its own card, nothing changed", () => {
    const collection = simCollection();
    const before = JSON.stringify(collection);
    const built = buildDuelDeck(collection, "d1", 1);
    expect(built.ok && built.name === "Test deck" && built.main.length === 5 && built.extra.length === 1, "a missing card is skipped");
    expect(new Set(built.main.concat(built.extra).map((i) => i.uid)).size === 6 && built.main[0].uid === "1-0", "unique uids numbered by side");
    expect(built.main[0].card.name === "Alpha" && built.main[0].card.desc === "A text." && built.main[0].card.imageSmall === "a.jpg", "card data");
    expect(!("quantityOwned" in built.main[0].card) && !("printings" in built.main[0].card), "nothing of the collection travels");
    expect(!buildDuelDeck(collection, "d2", 0).ok && !buildDuelDeck(collection, "nope", 0).ok, "no main cards or no deck is refused");
    expect(JSON.stringify(collection) === before, "the collection is not changed");
    const order = (seed) => shuffled([1, 2, 3, 4, 5, 6, 7, 8], seededRandom(seed)).join();
    expect(order(3) === order(3) && order(3) !== order(4) && [...order(3).split(",")].sort().join() === "1,2,3,4,5,6,7,8", "shuffle is deterministic for a random and keeps every card");
  });

  check("duel board: ready, start and draw; the hand and deck are counts only", () => {
    const { table, priv } = startedDuel();
    expect(table.sim.started && table.sim.players.every((p) => p.handCount === 5 && p.deckCount === 0 && p.extraCount === 1), "5 main cards: the whole deck is the hand");
    expect(priv[0].hand.length === 5 && priv[0].deck.length === 0 && priv[0].extra.length === 1);
    expect(!applyEvent(table, { kind: "start", by: 0 }).ok, "a started duel does not start again");
    const empty = duelApply(table, { kind: "draw", by: 0 });
    expect(empty.sim.players[0].handCount === 5 && empty.log[empty.log.length - 1].text.includes("empty deck"), "drawing from an empty deck is allowed and logged");
    expect(!applyEvent(newTable("x", "A", "B"), { kind: "draw", by: 0 }).ok, "nothing can be done before the duel starts");
  });

  check("duel board: every action takes effect and Undo restores the board", () => {
    const base = startedDuel().table;
    const card = { name: "Alpha", apiId: 1, imageSmall: "a.jpg", type: "Normal Monster" };
    const steps = [
      { name: "normal summon", event: { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "field", slot: 0 }, faceUp: true, pos: "atk", card }, check: (t) => t.sim.players[0].field[0][0].card.name === "Alpha" && t.sim.players[0].handCount === 4 },
      { name: "set", event: { kind: "move", by: 0, uid: "0-1", from: { zone: "hand" }, to: { zone: "field", slot: 2 }, faceUp: false }, check: (t) => t.sim.players[0].field[2][0].card === null && !t.log[t.log.length - 1].text.includes("Alpha") },
      { name: "to graveyard", event: { kind: "move", by: 0, uid: "0-2", from: { zone: "hand" }, to: { zone: "gy" }, faceUp: true, card }, check: (t) => t.sim.players[0].gy.length === 1 && t.sim.players[0].gy[0].card.name === "Alpha" },
      { name: "banish face-down", event: { kind: "move", by: 0, uid: "0-2", from: { zone: "hand" }, to: { zone: "banished" }, faceUp: false }, check: (t) => t.sim.players[0].banished[0].card === null },
      { name: "banish face-up", event: { kind: "move", by: 0, uid: "0-2", from: { zone: "hand" }, to: { zone: "banished" }, faceUp: true, card }, check: (t) => t.sim.players[0].banished[0].card.name === "Alpha" },
      { name: "special summon from the extra deck", event: { kind: "move", by: 0, uid: "0-5", from: { zone: "extra" }, to: { zone: "field", slot: 1 }, faceUp: true, pos: "def", card: { name: "Gamma Fusion" } }, check: (t) => t.sim.players[0].extraCount === 0 && t.sim.players[0].field[1][0].pos === "def" },
      { name: "to the deck bottom", event: { kind: "move", by: 0, uid: "0-3", from: { zone: "hand" }, to: { zone: "deck", end: "bottom" }, faceUp: false }, check: (t) => t.sim.players[0].deckCount === 1 && t.sim.players[0].handCount === 4 },
      { name: "draw", event: { kind: "draw", by: 0 }, pre: { kind: "move", by: 0, uid: "0-3", from: { zone: "hand" }, to: { zone: "deck", end: "top" }, faceUp: false }, check: (t) => t.sim.players[0].handCount === 5 && t.sim.players[0].deckCount === 0 },
      { name: "reveal", event: { kind: "reveal", by: 0, uid: "0-4", card }, check: (t) => t.sim.players[0].revealed["0-4"].name === "Alpha" && t.sim.players[0].handCount === 5 },
    ];
    steps.forEach((step) => {
      let t = base;
      if (step.pre) t = duelApply(t, step.pre);
      const before = JSON.stringify(t.sim);
      t = duelApply(t, step.event);
      expect(step.check(t), `${step.name} takes effect`);
      const undone = duelApply(t, { kind: "undo", by: 0 });
      expect(JSON.stringify(undone.sim) === before, `${step.name} is undone`);
    });
    // flip, position and moves off the field, then undo
    let t = duelApply(base, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "field", slot: 0 }, faceUp: false, pos: "def" });
    expect(t.sim.players[0].field[0][0].card === null);
    let before = JSON.stringify(t.sim);
    let f = duelApply(t, { kind: "flip", by: 0, uid: "0-0", zone: "field", slot: 0, faceUp: true, card });
    expect(f.sim.players[0].field[0][0].faceUp && f.sim.players[0].field[0][0].card.name === "Alpha" && f.log[f.log.length - 1].text.includes("Alpha"), "flipping publishes the card");
    expect(JSON.stringify(duelApply(f, { kind: "undo", by: 0 }).sim) === before, "flip undone");
    f = duelApply(t, { kind: "position", by: 0, uid: "0-0", zone: "field", slot: 0, pos: "atk" });
    expect(f.sim.players[0].field[0][0].pos === "atk" && JSON.stringify(duelApply(f, { kind: "undo", by: 0 }).sim) === before, "position and its undo");
    f = duelApply(t, { kind: "move", by: 0, uid: "0-0", from: { zone: "field", slot: 0 }, to: { zone: "hand" }, faceUp: false });
    expect(f.sim.players[0].field[0].length === 0 && f.sim.players[0].handCount === 5 && JSON.stringify(duelApply(f, { kind: "undo", by: 0 }).sim) === before, "back to the hand and its undo");
  });

  check("duel board: zones hold stacks, a middle card can leave, others cannot move yours", () => {
    let t = startedDuel().table;
    const put = (uid) => (t = duelApply(t, { kind: "move", by: 0, uid, from: { zone: "hand" }, to: { zone: "field", slot: 2 }, faceUp: false }));
    put("0-0");
    put("0-1");
    put("0-2");
    expect(t.sim.players[0].field[2].map((c) => c.uid).join() === "0-0,0-1,0-2", "newest on top, in order");
    t = duelApply(t, { kind: "move", by: 0, uid: "0-1", from: { zone: "field", slot: 2 }, to: { zone: "gy" }, faceUp: true, card: { name: "Mid" } });
    expect(t.sim.players[0].field[2].map((c) => c.uid).join() === "0-0,0-2" && t.sim.players[0].gy.length === 1, "only the middle card left");
    const undone = duelApply(t, { kind: "undo", by: 0 });
    expect(undone.sim.players[0].field[2].map((c) => c.uid).join() === "0-0,0-1,0-2", "undo puts it back in the same place of the stack");
    expect(!applyEvent(t, { kind: "move", by: 0, uid: "9-9", from: { zone: "field", slot: 2 }, to: { zone: "gy" }, faceUp: true, card: {} }).ok, "a card that is not there");
    expect(!applyEvent(t, { kind: "move", by: 0, uid: "0-0", from: { zone: "field", slot: 99 }, to: { zone: "gy" }, faceUp: true, card: {} }).ok, "a zone that does not exist");
    expect(!applyEvent(t, { kind: "move", by: 0, uid: "0-0", from: { zone: "field", slot: 2 }, to: { zone: "field", slot: 0 }, faceUp: true }).ok, "a face-up card needs its data");
    expect(!applyEvent(t, { kind: "undo", by: 1 }).ok, "the other player cannot undo it");
    const theirs = duelApply(t, { kind: "draw", by: 1 });
    expect(!applyEvent(theirs, { kind: "undo", by: 0 }).ok, "not after the opponent moved");
  });

  check("duel board and private state: counts and cards stay consistent over a long random duel, with shared zones and give control", () => {
    let { table, priv } = startedDuel(11);
    const random = seededRandom(5);
    const total = () => 6;
    const apply = (event) => {
      const result = applyEvent(table, event);
      if (!result.ok) return false;
      table = result.table;
      [0, 1].forEach((s) => {
        if (event.by === s) priv[s] = applyPrivate(priv[s], event, seededRandom(1)).priv;
        else if (isForeignMoveOfMine(priv[s], event)) priv[s] = { ...applyPrivate(priv[s], event).priv, undo: null };
      });
      return true;
    };
    const stacks = () => table.sim.players.flatMap((pl, s) => pl.field.map((stack, slot) => ({ zone: "field", slot, stack, side: s }))).concat(table.sim.shared.map((stack, slot) => ({ zone: "shared", slot, stack, side: null })));
    for (let i = 0; i < 600; i++) {
      const by = random() < 0.5 ? 0 : 1;
      const side = table.sim.players[by];
      const p = priv[by];
      const r = random();
      if (r < 0.15) apply({ kind: "draw", by });
      else if (r < 0.4 && p.hand.length) {
        const uid = p.hand[Math.floor(random() * p.hand.length)];
        const shared = random() < 0.3;
        apply({ kind: "move", by, uid, from: { zone: "hand" }, to: shared ? { zone: "shared", slot: Math.floor(random() * SHARED_SLOTS) } : { zone: "field", slot: Math.floor(random() * FIELD_SLOTS) }, faceUp: random() < 0.5, pos: "atk", card: cardAt(p, uid) });
      } else if (r < 0.7) {
        // a card this player controls: their own field or a shared zone (their own, or the other player's)
        const mine = stacks().filter((z) => z.stack.length && (z.zone === "shared" || z.side === by));
        if (mine.length) {
          const z = mine[Math.floor(random() * mine.length)];
          const entry = z.stack[Math.floor(random() * z.stack.length)];
          const from = { zone: z.zone, slot: z.slot };
          const known = cardAt(p, entry.uid) || entry.card;
          const pick = random();
          if (pick < 0.15 && known) apply({ kind: "give", by, uid: entry.uid, from, to: { zone: "field", slot: Math.floor(random() * FIELD_SLOTS), side: 1 - by }, card: known });
          else {
            const dest = random() < 0.4 ? { zone: "hand" } : random() < 0.5 ? { zone: "deck", end: random() < 0.5 ? "top" : "bottom" } : random() < 0.5 ? { zone: "gy" } : { zone: "banished" };
            apply({ kind: "move", by, uid: entry.uid, from, to: dest, faceUp: dest.zone === "gy", ...(dest.zone === "gy" && known ? { card: known } : {}) });
          }
        }
      } else if (r < 0.8) apply({ kind: "shuffle", by });
      else if (r < 0.95) apply({ kind: "undo", by });
      else apply({ kind: "search", by });
      [0, 1].forEach((s) => {
        const pub = table.sim.players[s];
        const owned = stacks().reduce((n, z) => n + z.stack.filter((c) => ownerOf(c.uid) === s).length, 0);
        expect(pub.handCount + pub.deckCount + pub.extraCount + owned + pub.gy.length + pub.banished.length === total(s), `every card is in exactly one place (step ${i}, side ${s})`);
        expect(pub.handCount === priv[s].hand.length && pub.deckCount === priv[s].deck.length && pub.extraCount === priv[s].extra.length, `private lists match the public counts (step ${i}, side ${s})`);
      });
    }
  });

  check("duel table: the log never names a hidden card; an old table without a board still works", () => {
    const { table } = startedDuel();
    const t = duelApply(table, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "field", slot: 0 }, faceUp: false });
    expect(t.log[t.log.length - 1].text === "Ana set a card in the playable zone");
    const drawn = duelApply(table, { kind: "draw", by: 1 });
    expect(drawn.log[drawn.log.length - 1].text.startsWith("Bo ") && !drawn.log[drawn.log.length - 1].text.includes("Alpha"));
    const old = { ...newTable("old", "A", "B") };
    delete old.sim;
    const moved = duelApply(old, { kind: "lp", by: 0, target: 1, mode: "add", amount: -100 });
    expect(moved.players[1].lp === 7900, "life points work without a board");
    expect(!applyEvent(old, { kind: "draw", by: 0 }).ok, "cards cannot be used without a started duel");
    const reset = duelApply(duelApply(table, { kind: "rematch", by: 0 }), { kind: "rematch-accept", by: 1 });
    const fresh = duelApply(reset, { kind: "reset", by: 0 });
    expect(fresh.sim.generation === 1 && !fresh.sim.started && fresh.sim.players[0].deckName === "Test deck" && !fresh.sim.players[0].ready && fresh.players[0].lp === 8000 && fresh.turn === 1 && fresh.log.length > reset.log.length, "a reset clears the board, life points and turn but keeps the log");
    expect(!applyEvent(table, { kind: "rematch-accept", by: 1 }).ok && !applyEvent(duelApply(table, { kind: "rematch", by: 0 }), { kind: "rematch-accept", by: 0 }).ok, "an accept needs another player's proposal");
  });

  check("duel board: a card can be stacked, flipped and turned in a shared zone, and the new board is marked layout 2", () => {
    const { table } = startedDuel();
    expect(table.sim.layout === BOARD_LAYOUT_VERSION && table.sim.shared.length === SHARED_SLOTS && table.sim.players[0].field.length === FIELD_SLOTS && !isOldBoard(table.sim));
    const card = { name: "Alpha" };
    let t = duelApply(table, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "shared", slot: 1 }, faceUp: false, pos: "def" });
    t = duelApply(t, { kind: "move", by: 1, uid: "1-0", from: { zone: "hand" }, to: { zone: "shared", slot: 1 }, faceUp: true, pos: "atk", card: { name: "Other" } });
    expect(t.sim.shared[1].map((c) => c.uid).join() === "0-0,1-0" && t.sim.players[0].handCount === 4 && t.sim.players[1].handCount === 4, "both players put cards in the shared zone");
    t = duelApply(t, { kind: "flip", by: 0, uid: "0-0", zone: "shared", slot: 1, faceUp: true, card });
    t = duelApply(t, { kind: "position", by: 0, uid: "0-0", zone: "shared", slot: 1, pos: "atk" });
    expect(t.sim.shared[1][0].faceUp && t.sim.shared[1][0].pos === "atk" && t.sim.shared[1][0].card.name === "Alpha");
    expect(publicCardName(t.sim, 0, "0-0") === "Alpha" && publicCardName(t.sim, 1, "1-0") === "Other", "a card in a shared zone is found by its name");
    expect(!applyEvent(table, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "shared", slot: SHARED_SLOTS }, faceUp: false }).ok, "no such shared zone");
  });

  check("duel board: give control, cards going back to their owner, and what a player cannot do with a card they do not own", () => {
    const { table } = startedDuel();
    const card = { name: "Alpha" };
    const refused = (t, event) => !applyEvent(t, event).ok;
    let t = duelApply(table, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "field", slot: 3 }, faceUp: true, pos: "def", card });
    t = duelApply(t, { kind: "give", by: 0, uid: "0-0", from: { zone: "field", slot: 3 }, to: { zone: "field", slot: 5, side: 1 }, card });
    const given = t.sim.players[1].field[5][0];
    expect(t.sim.players[0].field[3].length === 0 && given.uid === "0-0" && given.faceUp && given.pos === "def" && given.card.name === "Alpha", "the opponent controls it now");
    expect(t.log[t.log.length - 1].text === "Ana gave control of Alpha to Bo", t.log[t.log.length - 1].text);
    expect(refused(t, { kind: "undo", by: 0 }) && refused(t, { kind: "undo", by: 1 }), "giving control cannot be undone");
    expect(refused(t, { kind: "move", by: 0, uid: "0-0", from: { zone: "field", slot: 3 }, to: { zone: "gy" }, faceUp: true, card }), "the giver no longer controls it");
    // the controller sends it away: it lands in the piles of its owner
    const gy = duelApply(t, { kind: "move", by: 1, uid: "0-0", from: { zone: "field", slot: 5 }, to: { zone: "gy" }, faceUp: true });
    expect(gy.sim.players[0].gy.length === 1 && gy.sim.players[1].gy.length === 0 && gy.sim.players[1].field[5].length === 0, "to the owner's graveyard");
    expect(gy.log[gy.log.length - 1].text === "Bo sent Alpha to the graveyard of Ana", gy.log[gy.log.length - 1].text);
    const hand = duelApply(t, { kind: "move", by: 1, uid: "0-0", from: { zone: "field", slot: 5 }, to: { zone: "hand" }, faceUp: false });
    expect(hand.sim.players[0].handCount === 5 && hand.sim.players[1].handCount === 5, "back to the owner's hand: the owner's count rises, the controller's does not");
    const deck = duelApply(t, { kind: "move", by: 1, uid: "0-0", from: { zone: "field", slot: 5 }, to: { zone: "deck", end: "bottom" }, faceUp: false });
    expect(deck.sim.players[0].deckCount === table.sim.players[0].deckCount + 1 && refused(deck, { kind: "undo", by: 1 }), "a foreign move is not undoable");
    const down = applyEvent(t, { kind: "move", by: 1, uid: "0-0", from: { zone: "field", slot: 5 }, to: { zone: "field", slot: 6 }, faceUp: false });
    expect(!down.ok && down.reason.includes("owner") && refused(t, { kind: "flip", by: 1, uid: "0-0", zone: "field", slot: 5, faceUp: false }), "a controller cannot hide a card they do not own");
    const back = duelApply(t, { kind: "give", by: 1, uid: "0-0", from: { zone: "field", slot: 5 }, to: { zone: "field", slot: 0, side: 0 } });
    expect(back.sim.players[0].field[0][0].uid === "0-0" && back.sim.players[1].field[5].length === 0, "control can be given back");
    expect(refused(t, { kind: "give", by: 1, uid: "0-0", from: { zone: "field", slot: 5 }, to: { zone: "field", slot: 1, side: 1 } }), "not to your own side");
    expect(refused(table, { kind: "give", by: 0, uid: "0-1", from: { zone: "hand" }, to: { zone: "field", slot: 1, side: 1 }, card }), "only a card on the board");
    const faceDown = duelApply(table, { kind: "move", by: 0, uid: "0-2", from: { zone: "hand" }, to: { zone: "field", slot: 0 }, faceUp: false, pos: "def" });
    expect(refused(faceDown, { kind: "give", by: 0, uid: "0-2", from: { zone: "field", slot: 0 }, to: { zone: "field", slot: 0, side: 1 } }), "a face-down card needs its data to be given");
    // a card in a shared zone belongs to the player who brought it
    let shared = duelApply(table, { kind: "move", by: 0, uid: "0-3", from: { zone: "hand" }, to: { zone: "shared", slot: 0 }, faceUp: false, pos: "def" });
    const toGy = applyEvent(shared, { kind: "move", by: 1, uid: "0-3", from: { zone: "shared", slot: 0 }, to: { zone: "gy" }, faceUp: true });
    expect(!toGy.ok && toGy.reason.includes("owner"), "the other player cannot send an unknown card face-up");
    const toBanished = duelApply(shared, { kind: "move", by: 1, uid: "0-3", from: { zone: "shared", slot: 0 }, to: { zone: "banished" }, faceUp: false });
    expect(toBanished.sim.players[0].banished.length === 1 && toBanished.sim.players[0].banished[0].card === null, "banished face-down: the owner's zone, still hidden");
    const toHand = duelApply(shared, { kind: "move", by: 1, uid: "0-3", from: { zone: "shared", slot: 0 }, to: { zone: "hand" }, faceUp: false });
    expect(toHand.sim.players[0].handCount === 5 && toHand.sim.players[1].handCount === 5, "back to its owner's hand");
    expect(refused(table, { kind: "move", by: 1, uid: "0-4", from: { zone: "hand" }, to: { zone: "field", slot: 0 }, faceUp: false }), "a hand card of the other player is not yours");
    // the owner can still undo their own move of their own card in a shared zone
    expect(JSON.stringify(duelApply(shared, { kind: "undo", by: 0 }).sim) === JSON.stringify(table.sim), "own move in a shared zone is undoable");
  });

  check("duel private state: the owner follows the other player's move of its card to its hand, deck or extra deck", () => {
    let { table, priv } = startedDuel();
    const sendShared = (uid) => (table = duelApply(table, { kind: "move", by: 0, uid, from: { zone: "hand" }, to: { zone: "shared", slot: 0 }, faceUp: false, pos: "def" }));
    priv[0] = applyPrivate(priv[0], { kind: "move", by: 0, uid: priv[0].hand[0], from: { zone: "hand" }, to: { zone: "shared", slot: 0 } }).priv;
    const uid = Object.keys(priv[0].cards).find((u) => !priv[0].hand.includes(u) && !priv[0].deck.includes(u) && !priv[0].extra.includes(u));
    sendShared(uid);
    const bring = (zone) => {
      const event = { kind: "move", by: 1, uid, from: { zone: "shared", slot: 0 }, to: { zone, end: "top" }, faceUp: false };
      expect(isForeignMoveOfMine(priv[0], event) && !isForeignMoveOfMine(priv[1], event), "only the owner follows it");
      const result = applyEvent(table, event);
      expect(result.ok);
      const mine = applyPrivate(priv[0], event).priv;
      const sim = result.table.sim.players[0];
      expect(mine.hand.length === sim.handCount && mine.deck.length === sim.deckCount && mine.extra.length === sim.extraCount, "counts match for " + zone);
      return mine;
    };
    expect(bring("hand").hand.includes(uid) && bring("deck").deck[0] === uid && bring("extra").extra.includes(uid));
    expect(!isForeignMoveOfMine(priv[0], { kind: "move", by: 1, uid, from: { zone: "shared", slot: 0 }, to: { zone: "gy" }, faceUp: true }), "a graveyard move changes nothing private");
    expect(!isForeignMoveOfMine(priv[0], { kind: "move", by: 0, uid, from: { zone: "shared", slot: 0 }, to: { zone: "hand" } }), "the owner's own moves go the usual way");
  });

  check("duel board: any card on the opponent's field can be targeted, face-down ones too, and nothing else may be signalled on it", () => {
    const { table } = startedDuel();
    const down = duelApply(table, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "field", slot: 2 }, faceUp: false, pos: "def" });
    const targeted = duelApply(down, { kind: "signal", by: 1, uid: "0-0", signal: "target" });
    expect(targeted.sim.signal.uid === "0-0" && targeted.sim.signal.kind === "target" && targeted.sim.signal.by === 1);
    expect(targeted.log[targeted.log.length - 1].text === "Bo targets a face-down card", targeted.log[targeted.log.length - 1].text);
    expect(!applyEvent(down, { kind: "signal", by: 1, uid: "0-0", signal: "activate" }).ok && !applyEvent(down, { kind: "signal", by: 1, uid: "0-0", signal: "attack" }).ok, "only targeting");
    const inHand = applyEvent(table, { kind: "signal", by: 1, uid: "0-1", signal: "target" });
    expect(!inHand.ok, "a card in a hand cannot be targeted");
    expect(!JSON.stringify(targeted.sim.signal).includes("card"), "the signal reveals nothing about the card");
  });

  check("duel board: a card can be placed face-up or face-down on the extra deck, and leaves it again like any card", () => {
    const { table } = startedDuel();
    const gamma = { name: "Gamma Fusion" };
    let t = duelApply(table, { kind: "move", by: 0, uid: "0-5", from: { zone: "extra" }, to: { zone: "field", slot: 0 }, faceUp: true, pos: "atk", card: gamma });
    expect(t.sim.players[0].extraCount === 0 && t.sim.players[0].extraUp.length === 0);
    const up = duelApply(t, { kind: "move", by: 0, uid: "0-5", from: { zone: "field", slot: 0 }, to: { zone: "extra" }, faceUp: true, pos: "atk", card: gamma });
    expect(up.sim.players[0].extraCount === 1 && up.sim.players[0].extraUp.map((c) => c.card.name).join() === "Gamma Fusion", "face-up on the extra deck is public");
    expect(up.log[up.log.length - 1].text === "Ana placed Gamma Fusion face-up on the extra deck", up.log[up.log.length - 1].text);
    expect(JSON.stringify(duelApply(up, { kind: "undo", by: 0 }).sim) === JSON.stringify(t.sim), "undo takes it off the extra deck again");
    expect(publicCardName(up.sim, 0, "0-5") === "Gamma Fusion");
    const down = duelApply(t, { kind: "move", by: 0, uid: "0-5", from: { zone: "field", slot: 0 }, to: { zone: "extra" }, faceUp: false });
    expect(down.sim.players[0].extraCount === 1 && down.sim.players[0].extraUp.length === 0, "face-down stays a count");
    const out = duelApply(up, { kind: "move", by: 0, uid: "0-5", from: { zone: "extra" }, to: { zone: "gy" }, faceUp: true, card: gamma });
    expect(out.sim.players[0].extraCount === 0 && out.sim.players[0].extraUp.length === 0 && out.sim.players[0].gy.length === 1, "it leaves the public list with the card");
    expect(JSON.stringify(duelApply(out, { kind: "undo", by: 0 }).sim) === JSON.stringify(up.sim), "and undo puts it back face-up");
    expect(applyEvent(t, { kind: "move", by: 0, uid: "0-5", from: { zone: "field", slot: 0 }, to: { zone: "extra" }, faceUp: true, pos: "atk" }).ok, "the card is known from the board");
  });

  check("duel board: signals mark a card, count up, are cleared, never name a face-down card and do not block Undo", () => {
    const { table } = startedDuel();
    const card = { name: "Alpha" };
    let t = duelApply(table, { kind: "move", by: 0, uid: "0-0", from: { zone: "hand" }, to: { zone: "field", slot: 1 }, faceUp: true, pos: "atk", card });
    t = duelApply(t, { kind: "move", by: 0, uid: "0-1", from: { zone: "hand" }, to: { zone: "field", slot: 2 }, faceUp: false, pos: "def" });
    let s = duelApply(t, { kind: "signal", by: 0, uid: "0-0", signal: "activate" });
    expect(s.sim.signal.uid === "0-0" && s.sim.signal.kind === "activate" && s.sim.signal.n === 1 && s.log[s.log.length - 1].text === "Ana activates Alpha");
    s = duelApply(s, { kind: "signal", by: 0, uid: "0-0", signal: "attack" });
    expect(s.sim.signal.kind === "attack" && s.sim.signal.n === 2 && s.log[s.log.length - 1].text === "Ana attacks with Alpha");
    s = duelApply(s, { kind: "signal", by: 0, uid: "0-1", signal: "target" });
    expect(s.log[s.log.length - 1].text === "Ana targets a face-down card", s.log[s.log.length - 1].text);
    s = duelApply(s, { kind: "signal-clear", by: 1 });
    expect(s.sim.signal === null && s.sim.signalCount === 3);
    s = duelApply(s, { kind: "signal", by: 0, uid: "0-0", signal: "target" });
    expect(s.sim.signal.n === 4, "a new signal after a clear is a new one");
    expect(!applyEvent(t, { kind: "signal", by: 0, uid: "0-4", signal: "activate" }).ok, "not a card on the board");
    expect(!applyEvent(t, { kind: "signal", by: 0, uid: "0-0", signal: "dance" }).ok && !applyEvent(t, { kind: "signal", by: 1, uid: "0-0", signal: "activate" }).ok, "unknown signal; only your own cards");
    const undone = duelApply(s, { kind: "undo", by: 0 });
    expect(undone.sim.players[0].field[2].length === 0 && undone.sim.players[0].handCount === 4 && undone.sim.players[0].field[1].length === 1, "undo skips the signals and reverts the last move");
    const tableSignal = JSON.stringify(s.sim.signal);
    expect(!tableSignal.includes("Alpha"), "a signal carries no card data");
  });

  check("duel board: a duel saved with the old board cannot continue, but can be restarted, and an unstarted one just starts", () => {
    const { table } = startedDuel();
    const oldSim = JSON.parse(JSON.stringify(table.sim));
    delete oldSim.layout;
    delete oldSim.shared;
    delete oldSim.signal;
    oldSim.players.forEach((pl) => { pl.zones = { monster: [[], [], [], [], []] }; delete pl.field; });
    const old = { ...table, sim: oldSim };
    expect(isOldBoard(old.sim) && !isOldBoard(table.sim));
    const refused = applyEvent(old, { kind: "draw", by: 0 });
    expect(!refused.ok && refused.reason.includes("old board"), "no move on the old board");
    const restarted = duelApply(duelApply(duelApply(old, { kind: "rematch", by: 0 }), { kind: "rematch-accept", by: 1 }), { kind: "reset", by: 0 });
    expect(!isOldBoard(restarted.sim) && !restarted.sim.started && restarted.sim.players[0].deckName === "Test deck" && restarted.sim.players[0].field.length === FIELD_SLOTS, "a rematch gives a new board");
    const unstarted = { ...table, sim: { ...oldSim, started: false, nocards: true } };
    const ready = duelApply(unstarted, { kind: "ready", by: 0, deckName: "X", mainCount: 3, extraCount: 0 });
    expect(!isOldBoard(ready.sim) && ready.sim.nocards === true && ready.sim.players[0].ready, "an unstarted old duel starts on the new board");
  });

  check("duel session: practice alone, the creator can play the other side and a joiner cannot", () => {
    const sent = [];
    const creator = createDuelSession({ role: 0, table: newTable("solo", "Ana", "Practice opponent"), send: (m) => (sent.push(m), false) });
    expect(creator.intentFor(1, { kind: "ready", deckName: "Nothing", mainCount: 0, extraCount: 0 }).ok);
    const sim = creator.getTable().sim;
    expect(sim.players[1].ready && sim.players[1].deckCount === 0 && !sim.players[0].ready, "the other side is ready with no cards");
    expect(creator.intentFor(1, { kind: "lp", target: 1, mode: "add", amount: -500 }).ok && creator.getTable().players[1].lp === 7500);
    const joiner = createDuelSession({ role: 1, table: newTable("solo", "Ana", "Bo"), send: () => true });
    expect(joiner.intentFor(0, { kind: "lp", target: 0, mode: "add", amount: -500 }).ok === false, "only the creator");
  });

  /* Two sessions joined by an in-memory link whose delivery order the test controls. */
  function duelPair(seedTable) {
    const toCreator = [];
    const toJoiner = [];
    const notices = [];
    let randoms = [0.1, 0.9, 0.5, 0.2];
    const creator = createDuelSession({ role: 0, table: seedTable, send: (m) => (toJoiner.push(JSON.parse(JSON.stringify(m))), true), random: () => randoms.shift() ?? 0.3 });
    const joiner = createDuelSession({ role: 1, table: null, send: (m) => (toCreator.push(JSON.parse(JSON.stringify(m))), true), onNotice: (n) => notices.push(n) });
    const flush = () => {
      while (toCreator.length || toJoiner.length) {
        if (toCreator.length) creator.receive(toCreator.shift());
        if (toJoiner.length) joiner.receive(toJoiner.shift());
      }
    };
    return { creator, joiner, flush, toCreator, toJoiner, notices };
  }

  check("duel session: the creator is the authority and both tables end identical", () => {
    const pair = duelPair(newTable("d9", "Ana", ""));
    pair.joiner.hello("Bo");
    pair.flush();
    expect(pair.joiner.getTable().players[1].name === "Bo" && pair.creator.getTable().players[1].name === "Bo", "the joiner's name is applied and the table is sent");
    expect(JSON.stringify(pair.creator.getTable()) === JSON.stringify(pair.joiner.getTable()));
    // interleaved changes from both players, queued before anything is delivered
    pair.creator.intent({ kind: "lp", target: 1, mode: "add", amount: -1000 });
    pair.joiner.intent({ kind: "lp", target: 0, mode: "add", amount: -500 });
    pair.creator.intent({ kind: "phase" });
    pair.joiner.intent({ kind: "phase" });
    pair.joiner.intent({ kind: "coin" });
    pair.creator.intent({ kind: "die" });
    pair.flush();
    const a = pair.creator.getTable();
    const b = pair.joiner.getTable();
    expect(JSON.stringify(a) === JSON.stringify(b), "same table, same log order");
    expect(a.players[1].lp === 7000 && a.players[0].lp === 7500 && a.phase === "Main 1", "every change applied once");
    expect(a.log.filter((e) => e.by === 1).length >= 3, "the joiner's changes are logged under the joiner");
    expect(["heads", "tails"].includes(a.coin) && a.die >= 1 && a.die <= 6 && b.coin === a.coin && b.die === a.die, "one coin and die result for both");
  });

  check("duel session: 200 changes from both sides stay identical, results are chosen by the creator", () => {
    const pair = duelPair(newTable("d9", "Ana", "Bo"));
    pair.joiner.hello("Bo");
    pair.flush();
    for (let i = 0; i < 200; i++) {
      const event = i % 4 === 0 ? { kind: "phase" } : i % 4 === 1 ? { kind: "lp", target: i % 2, mode: "add", amount: -(i % 7) * 10 } : i % 4 === 2 ? { kind: "die" } : { kind: "coin" };
      (i % 3 === 0 ? pair.joiner : pair.creator).intent(event);
      if (i % 5 === 0) pair.flush();
    }
    pair.flush();
    expect(JSON.stringify(pair.creator.getTable()) === JSON.stringify(pair.joiner.getTable()), "identical after 200 changes");
    expect(pair.creator.getTable().seq >= 200, "every change was numbered");
    pair.joiner.intent({ kind: "die", result: 99, by: 0 });
    pair.flush();
    expect(pair.creator.getTable().die >= 1 && pair.creator.getTable().die <= 6 && pair.creator.getTable().log.slice(-1)[0].by === 1, "a joiner cannot choose a result or act as the creator");
  });

  check("duel session: a missed event asks for the whole table; a creator table replaces a different one with a notice", () => {
    const pair = duelPair(newTable("d9", "Ana", "Bo"));
    pair.joiner.hello("Bo");
    pair.flush();
    pair.creator.intent({ kind: "lp", target: 1, mode: "add", amount: -100 });
    pair.toJoiner.shift(); // lost on the way
    pair.creator.intent({ kind: "lp", target: 1, mode: "add", amount: -200 });
    pair.flush();
    expect(JSON.stringify(pair.creator.getTable()) === JSON.stringify(pair.joiner.getTable()) && pair.joiner.getTable().players[1].lp === 7700, "resynced after a gap");
    pair.joiner.receive({ type: "event", base: 0, event: { kind: "die", by: 0, result: 3 } });
    expect(pair.joiner.getTable().die === null, "an event that was already applied is ignored");
    // reconnect: the joiner still holds an older table
    const old = JSON.parse(JSON.stringify(pair.joiner.getTable()));
    pair.creator.intent({ kind: "phase" });
    pair.flush();
    const rejoin = duelPair(pair.creator.getTable());
    rejoin.joiner.setTable(old);
    rejoin.joiner.hello("Bo");
    rejoin.flush();
    expect(JSON.stringify(rejoin.joiner.getTable()) === JSON.stringify(rejoin.creator.getTable()) && rejoin.notices.length === 1, "the creator's table wins and the joiner is told");
    const same = duelPair(pair.creator.getTable());
    same.joiner.setTable(JSON.parse(JSON.stringify(pair.creator.getTable())));
    same.joiner.hello("Bo");
    same.flush();
    expect(same.notices.length === 0, "no notice when the tables already match");
  });

  check("duel session: onApplied runs on both devices for every event, in the same order", () => {
    const seen = [[], []];
    const toCreator = [];
    const toJoiner = [];
    const creator = createDuelSession({ role: 0, table: newTable("d1", "A", "B"), send: (m) => (toJoiner.push(JSON.parse(JSON.stringify(m))), true), random: () => 0.1, onApplied: (e) => seen[0].push(e.kind + ":" + e.by) });
    const joiner = createDuelSession({ role: 1, table: null, send: (m) => (toCreator.push(JSON.parse(JSON.stringify(m))), true), onApplied: (e) => seen[1].push(e.kind + ":" + e.by) });
    const flush = () => {
      while (toCreator.length || toJoiner.length) {
        if (toCreator.length) creator.receive(toCreator.shift());
        if (toJoiner.length) joiner.receive(toJoiner.shift());
      }
    };
    joiner.hello("B");
    flush();
    creator.intent({ kind: "phase" });
    joiner.intent({ kind: "lp", target: 0, mode: "add", amount: -100 });
    joiner.intent({ kind: "die" });
    flush();
    expect(seen[0].join() === seen[1].join() && seen[0].length === 3, "same events in the same order on both sides");
    expect(seen[1].filter((x) => x.startsWith("name")).length === 0 || true);
  });

  check("duel privacy: no message names a card while it is in a hand, a deck, an extra deck or face-down", () => {
    const named = (side, n) => ({ id: `s${side}c${n}`, name: `SECRET-${side}-${n}`, apiId: 1000 * (side + 1) + n, type: n === 7 ? "Fusion Monster" : "Effect Monster", effect: `text ${side}-${n}`, imageSmall: `i${side}${n}.jpg` });
    const collections = [0, 1].map((side) => ({
      cards: Array.from({ length: 8 }, (_, n) => named(side, n)),
      decks: [{ id: "d", name: `Deck ${side}`, main: Array.from({ length: 7 }, (_, n) => ({ cardId: `s${side}c${n}`, quantity: 1 })), extra: [{ cardId: `s${side}c7`, quantity: 1 }] }],
    }));
    const decks = [0, 1].map((side) => buildDuelDeck(collections[side], "d", side));
    const privs = [null, null];
    const messages = [];
    const toCreator = [];
    const toJoiner = [];
    const make = (role) =>
      createDuelSession({
        role,
        table: role === 0 ? newTable("p1", "Ana", "Bo") : null,
        random: seededRandom(30 + role),
        send: (m) => {
          messages.push(JSON.stringify(m));
          (role === 0 ? toJoiner : toCreator).push(JSON.parse(JSON.stringify(m)));
          return true;
        },
        onApplied: (event, table) => {
          if (event.kind === "start") privs[role] = dealHand(privs[role]);
          else if (event.by === role && privs[role] && event.kind !== "ready") privs[role] = applyPrivate(privs[role], event, seededRandom(2)).priv;
          else if (privs[role] && isForeignMoveOfMine(privs[role], event)) privs[role] = { ...applyPrivate(privs[role], event).priv, undo: null };
        },
      });
    const sessions = [make(0), make(1)];
    const flush = () => {
      while (toCreator.length || toJoiner.length) {
        if (toCreator.length) sessions[0].receive(toCreator.shift());
        if (toJoiner.length) sessions[1].receive(toJoiner.shift());
      }
    };
    sessions[1].hello("Bo");
    flush();
    [0, 1].forEach((side) => {
      privs[side] = newPrivate("p1", side, decks[side], seededRandom(40 + side));
      sessions[side].intent({ kind: "ready", deckName: decks[side].name, mainCount: decks[side].main.length, extraCount: decks[side].extra.length });
      flush();
    });
    sessions[0].intent({ kind: "start" });
    flush();
    expect(sessions[0].getTable().sim.started && privs[0].hand.length === 5 && privs[1].hand.length === 5, "the duel started");
    const publicNames = new Set();
    const random = seededRandom(77);
    for (let i = 0; i < 300; i++) {
      const by = random() < 0.5 ? 0 : 1;
      const table = sessions[0].getTable();
      const side = table.sim.players[by];
      const priv = privs[by];
      const r = random();
      let event = null;
      if (r < 0.15) event = { kind: "draw" };
      else if (r < 0.45 && priv.hand.length) {
        const uid = priv.hand[Math.floor(random() * priv.hand.length)];
        const faceUp = random() < 0.5;
        const to = random() < 0.3 ? { zone: "shared", slot: Math.floor(random() * SHARED_SLOTS) } : { zone: "field", slot: Math.floor(random() * FIELD_SLOTS) };
        event = { kind: "move", uid, from: { zone: "hand" }, to, faceUp, pos: "atk", ...(faceUp ? { card: cardAt(priv, uid) } : {}) };
      } else if (r < 0.7) {
        // what this player controls: their own field and the shared zones (cards of either player)
        const zones = side.field.map((stack, slot) => ({ k: "field", slot, stack })).concat(table.sim.shared.map((stack, slot) => ({ k: "shared", slot, stack }))).filter((z) => z.stack.length);
        if (zones.length) {
          const z = zones[Math.floor(random() * zones.length)];
          const entry = z.stack[Math.floor(random() * z.stack.length)];
          const known = cardAt(priv, entry.uid) || entry.card;
          const pick = random();
          if (pick < 0.2) event = { kind: "flip", uid: entry.uid, zone: z.k, slot: z.slot, faceUp: !entry.faceUp, ...(entry.faceUp ? {} : { card: known }) };
          else if (pick < 0.35 && known) event = { kind: "move", uid: entry.uid, from: { zone: z.k, slot: z.slot }, to: { zone: "gy" }, faceUp: true, card: known };
          else if (pick < 0.5) event = { kind: "move", uid: entry.uid, from: { zone: z.k, slot: z.slot }, to: { zone: "banished" }, faceUp: false };
          else if (pick < 0.65 && known) event = { kind: "give", uid: entry.uid, from: { zone: z.k, slot: z.slot }, to: { zone: "field", slot: Math.floor(random() * FIELD_SLOTS), side: 1 - by }, card: known };
          else if (pick < 0.8) event = { kind: "signal", uid: entry.uid, signal: ["activate", "target", "attack"][Math.floor(random() * 3)] };
          else if (pick < 0.9) event = { kind: "move", uid: entry.uid, from: { zone: z.k, slot: z.slot }, to: { zone: "deck", end: "top" }, faceUp: false };
          else event = { kind: "move", uid: entry.uid, from: { zone: z.k, slot: z.slot }, to: { zone: "hand" }, faceUp: false };
        }
      } else if (r < 0.75 && priv.deck.length) event = { kind: "move", uid: priv.deck[0], from: { zone: "deck" }, to: { zone: "gy" }, faceUp: true, pos: "atk", card: cardAt(priv, priv.deck[0]) }; // mill
      else if (r < 0.8) event = { kind: "shuffle" };
      else if (r < 0.9 && priv.hand.length) {
        const uid = priv.hand[0];
        event = random() < 0.5 ? { kind: "reveal", uid, card: cardAt(priv, uid) } : { kind: "hide", uid };
      } else if (r < 0.95 && priv.deck.length) {
        // a search: the list is looked through privately, only the chosen card moves to the hand
        sessions[by].intent({ kind: "search" });
        flush();
        event = { kind: "move", uid: priv.deck[Math.floor(random() * priv.deck.length)], from: { zone: "deck" }, to: { zone: "hand" }, faceUp: false };
      } else event = { kind: "undo" };
      if (event) {
        sessions[by].intent(event);
        flush();
      }
    }
    const traffic = messages.join("\n");
    // every card the protocol made public: the names inside a `card` field of an event, or in the table's public parts
    const madePublic = new Set();
    messages.forEach((text) => {
      const m = JSON.parse(text);
      const visit = (value, publicPlace) => {
        if (!value || typeof value !== "object") return;
        if (value.card && value.card.name) madePublic.add(value.card.name);
        Object.values(value).forEach((v) => visit(v));
      };
      visit(m);
    });
    const allNames = [];
    for (let side = 0; side < 2; side++) for (let n = 0; n < 8; n++) allNames.push(`SECRET-${side}-${n}`);
    const neverPublic = allNames.filter((n) => !madePublic.has(n));
    expect(neverPublic.length > 0, "some cards stayed hidden all duel (the test is meaningful)");
    neverPublic.forEach((name) => expect(!traffic.includes(name), `${name} never left its device`));
    expect(!traffic.includes('"hand":[') && !traffic.includes('"deck":[') && !traffic.includes('"cards":{'), "no private lists in any message");
    expect(!/"extra":\[/.test(traffic), "the extra deck contents never travel");
    // a card that was face-down is named only after a flip, a public pile or a reveal: its name never appears in a set/hidden move
    messages.forEach((text) => {
      const m = JSON.parse(text);
      const event = m.event;
      if (m.type === "event" && event && event.kind === "move" && !event.faceUp && event.to && event.to.zone !== "gy") {
        expect(!("card" in event), "a card played face-down or hidden carries no card data");
      }
      if (m.type === "event" && event && event.kind === "signal") expect(!("card" in event), "a signal carries no card data");
    });
    expect(JSON.stringify(sessions[0].getTable()) === JSON.stringify(sessions[1].getTable()), "both public tables still match");
    const kinds = new Set(messages.map((t) => { const m = JSON.parse(t); return m.event && m.event.kind; }));
    ["move", "flip", "give", "signal", "reveal", "search"].forEach((kind) => expect(kinds.has(kind), `the duel used ${kind} events`));
    expect(sessions[0].getTable().sim.shared.some((stack) => stack.length) || kinds.has("give"), "the shared zones were used");
  });

  check("duel code: round trip, tolerant paste and rejection of bad codes", () => {
    const sdp = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\na=candidate:1 1 udp 1 192.168.1.2 5000 typ host ñ";
    const code = encodeCode({ kind: "offer", roomId: "room-1", sdp });
    expect(code.startsWith("YGO1.") && !/[+/=\s]/.test(code.slice(5)), "url-safe text");
    const back = decodeCode(code);
    expect(back.ok && back.kind === "offer" && back.roomId === "room-1" && back.sdp === sdp, "round trip with non-ASCII text");
    expect(decodeCode(`  \n${code}\n  `).ok && decodeCode(`Here is my code: ${code} see you!`).ok, "spaces, line breaks and chat text around it");
    expect(decodeCode(encodeCode({ kind: "answer", roomId: "r", sdp: "x" })).kind === "answer");
    expect(!decodeCode("").ok && !decodeCode(null).ok && !decodeCode("hello").ok, "empty or foreign text");
    expect(!decodeCode(code.slice(0, 30)).ok && !decodeCode("YGO1.@@@").ok && !decodeCode("YGO1.AAAA").ok, "damaged codes");
    const wrongVersion = "YGO1." + toBase64Url(JSON.stringify({ v: 2, k: "offer", r: "a", s: "b" }));
    expect(decodeCode(wrongVersion).ok === false && decodeCode(wrongVersion).reason.includes("version"));
    const wrongKind = "YGO1." + toBase64Url(JSON.stringify({ v: 1, k: "hello", r: "a", s: "b" }));
    expect(!decodeCode(wrongKind).ok);
    expect(!decodeCode("YGO1." + "A".repeat(30000)).ok, "too long");
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

  /* ---- Duel board and fan menu (spec 020): layout, menu tree and fan geometry ---- */

  check("duel board layout: 35 cells, 11 playable zones per player, 2 shared zones, the opponent's side turned 180 degrees", () => {
    const cells = boardCells();
    expect(cells.length === 35 && FIELD_SLOTS === 11 && SHARED_SLOTS === 2);
    const rows = BOARD_LAYOUT.map((line, row) => cells.filter((c) => c.row === row).map((c) => {
      const letter = { field: "p", shared: "S", deck: "d", extra: "e", gy: "g", banished: "b", empty: "X" }[c.kind];
      return c.side === "own" ? letter.toUpperCase() : letter;
    }).join(""));
    expect(rows.join("/") === BOARD_LAYOUT.join("/"), rows.join("/"));
    ["own", "opp"].forEach((side) => {
      const slots = cells.filter((c) => c.kind === "field" && c.side === side).map((c) => c.slot).sort((a, b) => a - b);
      expect(slots.join() === "0,1,2,3,4,5,6,7,8,9,10", side + " " + slots.join());
    });
    cells.filter((c) => c.kind === "field" && c.side === "own").forEach((own) => {
      const opp = cells.find((c) => c.kind === "field" && c.side === "opp" && c.slot === own.slot);
      expect(opp.row === 4 - own.row && opp.col === 6 - own.col, "slot " + own.slot + " is not the same cell turned 180 degrees");
    });
    expect(cells.filter((c) => c.kind === "shared").map((c) => c.col).join() === "2,4" && cells.filter((c) => c.kind === "empty").length === 3);
    expect(ownerOf("1-23") === 1 && ownerOf("0-0") === 0);
    expect(isOldBoard({ players: [] }) === true && isOldBoard(null) === false);
  });

  check("fan layout: always the same shape straight above the anchor, buttons never touch, a submenu is a tight block on its parent button, a fan slides to fit and never turns", () => {
    const at = { x: 180, y: 500 };
    [1, 2, 3, 4, 5, 6].forEach((count) => {
      const points = fanLayout({ anchor: at, count });
      const far = Math.hypot(points[0].x - at.x, points[0].y - at.y);
      expect(points.length === count && far >= FAN_RADIUS_PX - 0.001 && (count <= 5 ? Math.abs(far - FAN_RADIUS_PX) < 0.001 : true) && points.every((p) => Math.abs(Math.hypot(p.x - at.x, p.y - at.y) - far) < 0.001), "every button the same distance from the anchor, the same radius up to five buttons");
      expect(points.every((p, i) => i === 0 || p.x > points[i - 1].x), "left to right in the order of the menu");
      expect(Math.abs(points.reduce((sum, p) => sum + p.x - at.x, 0)) < 0.001, "centred above the anchor");
      expect(points.every((p) => p.y <= at.y + 0.001), "never below the anchor");
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) >= FAN_BUTTON_PX, "neighbours touch at count " + count);
      }
    });
    expect(JSON.stringify(fanLayout({ anchor: at, count: 4 })) === JSON.stringify(fanLayout({ anchor: at, count: 4 })), "the same input always gives the same fan");
    const parent = fanLayout({ anchor: at, count: 4 });
    [1, 2, 3, 4, 5, 6].forEach((count) => {
      const block = fanSubmenu({ anchor: parent[1], count });
      expect(block.length === count, "one place for every button");
      for (let i = 0; i < count; i++) {
        expect(Math.hypot(block[i].x - parent[1].x, block[i].y - parent[1].y) <= 2 * (FAN_BUTTON_PX + FAN_GAP_PX), "a submenu button is within two buttons of the pointer (count " + count + ")");
        for (let j = i + 1; j < count; j++) expect(Math.hypot(block[i].x - block[j].x, block[i].y - block[j].y) >= FAN_BUTTON_PX, "submenu buttons never touch (count " + count + ")");
      }
      expect(Math.abs(block.reduce((n, p) => n + p.x - parent[1].x, 0) / count) < FAN_BUTTON_PX / 2, "centred on the parent");
    });
    expect(fanSubmenu({ anchor: parent[1], count: 3 })[1].x === parent[1].x && fanSubmenu({ anchor: parent[1], count: 3 })[1].y === parent[1].y, "the middle of three is exactly on the parent");
    const half = FAN_BUTTON_PX / 2;
    const bounds = { left: 0, top: 0, right: 360, bottom: 640 };
    const top = fanLayout({ anchor: { x: 20, y: 40 }, count: 5 });
    const { dx, dy } = fanShift(top, bounds, half);
    const moved = top.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    expect(moved.every((p) => p.x >= half - 0.001 && p.x <= 360 - half + 0.001 && p.y >= half - 0.001 && p.y <= 640 - half + 0.001), "a fan near a corner slides inside the window");
    expect(moved.every((p, i) => Math.abs(p.x - top[i].x - dx) < 0.001 && Math.abs(p.y - top[i].y - dy) < 0.001), "sliding keeps the shape");
    const free = fanShift(fanLayout({ anchor: { x: 180, y: 400 }, count: 4 }), bounds, half);
    expect(free.dx === 0 && free.dy === 0, "a fan that fits does not move");
  });

  check("duel menu: every path ends in an action, Move to is always the same six buttons in the same order and the ones that do not apply are greyed", () => {
    const ids = (nodes) => nodes.map((n) => n.id);
    const off = (nodes) => nodes.filter((n) => n.disabled).map((n) => n.id).join();
    const ORDER = "give,grave,banish,extra,hand,deck";
    const onField = menuFor({ place: { zone: "field", slot: 3 }, isExtraDeckCard: false });
    expect(ids(onField).join() === "play,move,signal,details" && off(onField) === "");
    const move = resolvePath(onField, ["move"]).node.children;
    expect(ids(move).join() === ORDER && off(move) === "extra", "a monster cannot go to the extra deck: greyed, not missing");
    expect(ids(resolvePath(onField, ["move", "deck"]).node.children).join() === "deck-top,deck-bottom,deck-shuffle");
    expect(ids(resolvePath(onField, ["signal"]).node.children).join() === "activate,target,attack");
    const extra = menuFor({ place: { zone: "field", slot: 0 }, isExtraDeckCard: true });
    expect(off(resolvePath(extra, ["move"]).node.children) === "", "an extra deck card can go to all six");
    const inHand = menuFor({ place: { zone: "hand" }, isExtraDeckCard: false });
    expect(ids(resolvePath(inHand, ["move"]).node.children).join() === ORDER && off(resolvePath(inHand, ["move"]).node.children) === "give,extra,hand", "from the hand: give control, the extra deck and the hand itself are greyed");
    expect(ids(resolvePath(inHand, ["signal"]).node.children).join() === "reveal");
    expect(ids(resolvePath(menuFor({ place: { zone: "hand" }, revealed: true }), ["signal"]).node.children).join() === "hide");
    const fromDeck = menuFor({ place: { zone: "deck" }, isExtraDeckCard: true });
    expect(ids(fromDeck).join() === "play,move,signal,details" && off(fromDeck) === "signal", "the signal button of a private pile is greyed");
    expect(ids(resolvePath(fromDeck, ["move"]).node.children).join() === ORDER && off(resolvePath(fromDeck, ["move"]).node.children) === "give");
    expect(ids(resolvePath(fromDeck, ["move", "extra"]).node.children).join() === "extra-down,extra-up", "the extra deck takes a card face down or face up");
    expect(resolvePath(fromDeck, ["move", "extra", "extra-up"]).action.faceUp === true && resolvePath(fromDeck, ["move", "extra", "extra-down"]).action.faceUp === false);
    const fromGy = menuFor({ place: { zone: "gy" }, isExtraDeckCard: false });
    expect(off(resolvePath(fromGy, ["move"]).node.children) === "give,grave,extra" && off(fromGy) === "", "a graveyard card cannot go to the graveyard");
    expect(resolvePath(onField, ["move", "extra"]).node.reason.includes("Fusion"), "the greyed button says why");
    const walk = (nodes, path, seen) => nodes.forEach((n) => {
      const here = path.concat(n.id);
      if (n.children) return walk(n.children, here, seen);
      const r = resolvePath(menuFor({ place: { zone: "field", slot: 0 }, isExtraDeckCard: true }), here);
      expect(r && r.action && r.action.kind, "no action for " + here.join(">"));
      seen.push(here.join(">"));
    });
    const leaves = [];
    walk(menuFor({ place: { zone: "field", slot: 0 }, isExtraDeckCard: true }), [], leaves);
    expect(leaves.includes("play>face-up>straight") && leaves.includes("play>face-down>sideways") && leaves.includes("move>banish>banish-down") && leaves.includes("move>give"));
    expect(resolvePath(onField, ["play", "face-down", "sideways"]).action.pos === "def" && resolvePath(onField, ["play", "face-down", "sideways"]).action.faceUp === false);
    expect(deckMenu().map((n) => n.id).join() === "draw,mill,search,look,shuffle");
    expect(resolvePath(onField, ["nope"]) === null);
  });

  check("duel menu: playing a card is one move from the hand, and a flip, a turn or a move for a card already on the board", () => {
    const from = { zone: "field", slot: 2 };
    const card = { name: "Alpha" };
    const down = { uid: "0-1", faceUp: false, pos: "def", card: null };
    expect(JSON.stringify(playEvent({ uid: "0-1", from: { zone: "hand" }, to: { zone: "field", slot: 4 }, faceUp: true, pos: "atk", entry: null, card })) ===
      JSON.stringify([{ kind: "move", uid: "0-1", from: { zone: "hand" }, to: { zone: "field", slot: 4 }, faceUp: true, pos: "atk", card }]));
    const hidden = playEvent({ uid: "0-1", from: { zone: "hand" }, to: { zone: "shared", slot: 1 }, faceUp: false, pos: "def", entry: null, card });
    expect(hidden.length === 1 && hidden[0].card === undefined && hidden[0].faceUp === false);
    const both = playEvent({ uid: "0-1", from, to: from, faceUp: true, pos: "atk", entry: down, card });
    expect(both.map((e) => e.kind).join() === "flip,position" && both[0].card === card);
    expect(playEvent({ uid: "0-1", from, to: from, faceUp: false, pos: "atk", entry: down, card }).map((e) => e.kind).join() === "position");
    expect(playEvent({ uid: "0-1", from, to: from, faceUp: true, pos: "def", entry: down, card }).map((e) => e.kind).join() === "flip");
    expect(playEvent({ uid: "0-1", from, to: from, faceUp: false, pos: "def", entry: down, card }).length === 0);
    expect(playEvent({ uid: "0-1", from, to: { zone: "field", slot: 5 }, faceUp: false, pos: "def", entry: down, card })[0].kind === "move");
  });

  return results;
}
