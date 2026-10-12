let backlogFilter = "";
let searchTimer = null;
let activeSearchController = null;
let expandedCardId = null;

const expandedEngines = new Set();
const expandedDecks = new Set();
const backfillAttemptedCardIds = new Set();

let collection = loadCollection();
