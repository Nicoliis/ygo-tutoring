function extractCardDataFromApiResult(apiCard) {
  const fields = extractCardFields(apiCard);
  return {
    apiId: fields.apiId,
    type: fields.type,
    humanReadableCardType: fields.humanReadableCardType,
    frameType: fields.frameType,
    race: fields.race,
    attribute: fields.attribute,
    archetype: fields.archetype,
    effect: fields.desc,
    pendDesc: fields.pendDesc,
    monsterDesc: fields.monsterDesc,
    imageSmall: fields.imageSmall,
    imageFull: fields.imageFull,
    level: fields.level,
    scale: fields.scale,
    linkval: fields.linkval,
    linkmarkers: fields.linkmarkers,
    atk: fields.atk,
    def: fields.def,
  };
}
