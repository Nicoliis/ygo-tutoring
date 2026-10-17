addToBacklogBtn.addEventListener("click", () => {
  if (!mergeCardsIntoBacklog(session.keptCards)) {
    showConfigStatus("Couldn't save to your backlog — browser storage is unavailable or full.", true);
    return;
  }
  resetSession();
});
