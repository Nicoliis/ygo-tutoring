function extractCardDataFromApiResult(apiCard) {
  const fields = extractCardFields(apiCard);
  return {
    apiId: fields.apiId,
    type: fields.type,
    effect: fields.desc,
    imageSmall: fields.imageSmall,
    imageFull: fields.imageFull,
    level: fields.level,
    atk: fields.atk,
    def: fields.def,
  };
}
