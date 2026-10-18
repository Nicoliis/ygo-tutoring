// Relative pull weights of a rarity tier: the higher the weight, the more often it is drawn.
const WEIGHT_TOP_RARITY = 1; // secret, ultimate, ghost, ultra
const WEIGHT_SUPER_RARITY = 1.5;
const WEIGHT_RARE_RARITY = 3;
const WEIGHT_COMMON_RARITY = 10;
const CARD_API_BASE = "https://db.ygoprodeck.com/api/v7/";

function isMonsterCard(apiCard) {
  return typeof apiCard.type === "string" && apiCard.type.includes("Monster");
}

function getWeightForRarity(rarity) {
  const r = (rarity || "").toLowerCase();
  if (r.includes("secret") || r.includes("ultimate") || r.includes("ghost") || r.includes("ultra")) {
    return WEIGHT_TOP_RARITY;
  }
  if (r.includes("super")) return WEIGHT_SUPER_RARITY;
  if (r.includes("rare")) return WEIGHT_RARE_RARITY;
  return WEIGHT_COMMON_RARITY;
}

function extractCardFields(apiCard) {
  const images = apiCard.card_images && apiCard.card_images[0];
  const isMonster = isMonsterCard(apiCard);
  return {
    apiId: apiCard.id,
    type: apiCard.type || null,
    humanReadableCardType: apiCard.humanReadableCardType || null,
    frameType: apiCard.frameType || null,
    race: apiCard.race || null,
    attribute: isMonster ? apiCard.attribute || null : null,
    archetype: apiCard.archetype || null,
    imageSmall: images ? images.image_url_small : null,
    imageFull: images ? images.image_url : null,
    level: isMonster && typeof apiCard.level === "number" && apiCard.frameType !== "link" ? apiCard.level : null,
    scale: isMonster && typeof apiCard.scale === "number" ? apiCard.scale : null,
    linkval: isMonster && typeof apiCard.linkval === "number" ? apiCard.linkval : null,
    linkmarkers: isMonster && Array.isArray(apiCard.linkmarkers) ? apiCard.linkmarkers : null,
    atk: isMonster && typeof apiCard.atk === "number" ? apiCard.atk : null,
    def: isMonster && typeof apiCard.def === "number" ? apiCard.def : null,
    desc: apiCard.desc || null,
    pendDesc: typeof apiCard.pend_desc === "string" ? apiCard.pend_desc : null,
    monsterDesc: typeof apiCard.monster_desc === "string" ? apiCard.monster_desc : null,
  };
}
