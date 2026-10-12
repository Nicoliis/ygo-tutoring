function freshSession() {
  return {
    status: "configuring", // configuring | in-progress | finished
    setName: null,
    boosterSize: DEFAULT_BOOSTER_SIZE,
    amount: null,
    cardpool: null,
    grouping: "rarity",
    pickQueue: [],
    keptCards: [],
  };
}

let session = freshSession();
