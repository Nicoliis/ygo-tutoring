const STORAGE_KEY = profileKey("ygoCollection");

const boosterInput = document.getElementById("boosterInput");
const boosterResultsList = document.getElementById("boosterResultsList");
const amountInput = document.getElementById("amountInput");
const cardpoolInput = document.getElementById("cardpoolInput");
const groupingSelect = document.getElementById("groupingSelect");
const keptTotalPreviewEl = document.getElementById("keptTotalPreview");
const startDraftBtn = document.getElementById("startDraftBtn");
const cancelDraftBtn = document.getElementById("cancelDraftBtn");
const configStatusEl = document.getElementById("configStatus");

const draftSection = document.getElementById("draftSection");
const chosenStripEl = document.getElementById("chosenStrip");
const pickGroupAreaEl = document.getElementById("pickGroupArea");
const finishedAreaEl = document.getElementById("finishedArea");
const revealAreaEl = document.getElementById("revealArea");
const draftPackAreaEl = document.getElementById("draftPackArea");
const draftPackActionEl = document.getElementById("draftPackAction");
const draftPulledStripEl = document.getElementById("draftPulledStrip");
const finishedCountEl = document.getElementById("finishedCount");
const addToBacklogBtn = document.getElementById("addToBacklogBtn");
