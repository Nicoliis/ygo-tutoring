function renderFinished() {
  if (session.status !== "finished") {
    finishedAreaEl.hidden = true;
    return;
  }
  pickGroupAreaEl.hidden = true;
  finishedAreaEl.hidden = false;
  finishedCountEl.textContent = String(session.keptCards.length);
}
