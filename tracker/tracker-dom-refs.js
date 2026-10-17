const STORAGE_KEY = profileKey("ygoCollection");

const createTrackerForm = document.getElementById("createTrackerForm");
const trackerNameInput = document.getElementById("trackerNameInput");
const trackersListEl = document.getElementById("trackersList");

const setPickerToggle = document.getElementById("setPickerToggle");
const setPickerBody = document.getElementById("setPickerBody");
const setSearchInput = document.getElementById("setSearchInput");
const setResultsListEl = document.getElementById("setResultsList");
const selectedSetBadgeEl = document.getElementById("selectedSetBadge");

const SETS_URL = CARD_API_BASE + "cardsets.php";
const SET_CARDS_URL = CARD_API_BASE + "cardinfo.php";
const CARDS_PER_PACK = 9;
const MAX_SET_RESULTS = 200;
