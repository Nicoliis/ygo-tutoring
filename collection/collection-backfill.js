const BACKFILL_CHUNK_SIZE = 50; // cards looked up per card-info request
function maybeBackfillCardDetails(card) {
  const hasEffect = Boolean(card.effect || card.desc || card.pendDesc || card.monsterDesc);
  if (hasEffect || card.detailsTried || backfillAttemptedCardIds.has(card.id)) return;
  backfillAttemptedCardIds.add(card.id);
  const url = `${API_URL}?name=${encodeURIComponent(card.name)}`;
  fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const match = data && Array.isArray(data.data) ? data.data[0] : null;
      if (!match) return;
      const extracted = extractCardDataFromApiResult(match);
      let changed = false;
      Object.keys(extracted).forEach((key) => {
        if ((card[key] === undefined || card[key] === null) && extracted[key] !== null) {
          card[key] = extracted[key];
          changed = true;
        }
      });
      if (changed) {
        saveCollection();
        renderAll();
      }
    })
    .catch(() => {});
}

/*
 * Completes cards that lack their details (race, attribute, level, effect...): requests the card data in batches by id
 * (50 per request; one request by name for a card with no id), fills only what the card is missing and marks every
 * card it tried with detailsTried so it is requested at most once, ever. Network failures leave cards unmarked so a
 * later visit can retry. Resolves when done; makes no request when there is nothing to complete.
 */
let completionInFlight = null;

/* A card is incomplete when it lacks its race or any effect text, and it was never tried before. */
function cardNeedsDetails(card) {
  const noEffect = typeof cardEffectText === "function" ? !cardEffectText(card) : false;
  return (!card.race || noEffect) && !card.detailsTried;
}

function completeMissingCardDetails(cards) {
  const todo = cards.filter(cardNeedsDetails);
  if (todo.length === 0) return Promise.resolve();
  if (completionInFlight) return completionInFlight;

  const mergeInto = (card, apiCard) => {
    const extracted = extractCardDataFromApiResult(apiCard);
    Object.keys(extracted).forEach((key) => {
      if ((card[key] === undefined || card[key] === null) && extracted[key] !== null && extracted[key] !== undefined) {
        card[key] = extracted[key];
      }
    });
  };
  const fetchJson = (url) => fetch(url).then((res) => (res.ok ? res.json() : { data: [] }));

  const withId = todo.filter((card) => card.apiId);
  const withoutId = todo.filter((card) => !card.apiId);
  const requests = [];

  for (let i = 0; i < withId.length; i += BACKFILL_CHUNK_SIZE) {
    const chunk = withId.slice(i, i + BACKFILL_CHUNK_SIZE);
    const url = `${API_URL}?id=${chunk.map((c) => c.apiId).join(",")}`;
    requests.push(
      fetchJson(url).then((data) => {
        const found = new Map((Array.isArray(data.data) ? data.data : []).map((apiCard) => [apiCard.id, apiCard]));
        chunk.forEach((card) => {
          const apiCard = found.get(card.apiId);
          if (apiCard) mergeInto(card, apiCard);
          card.detailsTried = true;
        });
      })
    );
  }
  withoutId.forEach((card) => {
    requests.push(
      fetchJson(`${API_URL}?name=${encodeURIComponent(card.name)}`).then((data) => {
        const apiCard = Array.isArray(data.data) ? data.data[0] : null;
        if (apiCard) mergeInto(card, apiCard);
        card.detailsTried = true;
      })
    );
  });

  completionInFlight = Promise.all(requests.map((p) => p.catch(() => {})))
    .then(() => {
      saveCollection();
      renderAll();
    })
    .finally(() => {
      completionInFlight = null;
    });
  return completionInFlight;
}
