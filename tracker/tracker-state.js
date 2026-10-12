const expandedTrackers = new Set();

let allSetsCache = null;
const setCardPoolCache = new Map();
let selectedSetName = null;
let isFetchingSets = false;
let isFetchingSetPool = false;
let setPickerOpen = false;

const pendingPulls = new Map(); // trackerId -> { setName, packCount, packs }

let collection = loadCollection();
