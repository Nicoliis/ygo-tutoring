function getBoosterSize(setName) {
  return Object.prototype.hasOwnProperty.call(BOOSTER_SIZE_OVERRIDES, setName)
    ? BOOSTER_SIZE_OVERRIDES[setName]
    : DEFAULT_BOOSTER_SIZE;
}
