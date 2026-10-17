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
    boosters: [], // per opened booster: its cards ordered for the reveal (common first, rarest last)
    revealed: [], // per booster: true once the face-down reveal is finished
  };
}

let session = freshSession();
