function handlePick(card) {
  session.keptCards.push(card);
  session.pickQueue.shift();
  if (session.pickQueue.length === 0) {
    session.status = "finished";
  }
  renderAll();
}
