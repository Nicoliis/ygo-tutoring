const STORAGE_KEY = profileKey("ygoCollection");
const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const SEARCH_MIN_LEN = 3;
const SEARCH_DEBOUNCE_MS = 400;

const backlogListEl = document.getElementById("backlogList");
const backlogSearchInput = document.getElementById("backlogSearchInput");

const cardSearchInput = document.getElementById("cardSearchInput");
const cardSearchStatus = document.getElementById("cardSearchStatus");
const cardSearchResultsEl = document.getElementById("cardSearchResults");

const engineForm = document.getElementById("engineForm");
const engineFormToggle = document.getElementById("engineFormToggle");
const engineNameInput = document.getElementById("engineNameInput");
const engineListEl = document.getElementById("engineList");

const deckCreateForm = document.getElementById("deckCreateForm");
const newDeckNameInput = document.getElementById("newDeckNameInput");
const deckListEl = document.getElementById("deckList");
