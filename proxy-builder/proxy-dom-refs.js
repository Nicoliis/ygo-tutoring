const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const STORAGE_KEY = "ygoDeck";
const SEARCH_MIN_LEN = 3;
const SEARCH_DEBOUNCE_MS = 400;
const CARDS_PER_SHEET = 9;

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const searchStatus = document.getElementById("searchStatus");
const searchResults = document.getElementById("searchResults");
const deckGridEl = document.getElementById("deckGrid");
const deckCountEl = document.getElementById("deckCount");
const markedCountEl = document.getElementById("markedCount");
const printBtn = document.getElementById("printBtn");
const markAllBtn = document.getElementById("markAllBtn");
const unmarkAllBtn = document.getElementById("unmarkAllBtn");
const clearDeckBtn = document.getElementById("clearDeckBtn");
const printArea = document.getElementById("printArea");
