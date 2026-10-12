// Booster Draft pick-group formation: sort, bucket, de-duplicate, shuffle.

function sortValueFor(card, grouping) {
  return grouping === "price" ? card.price : card.weight;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Swaps a duplicate name in a chunk for a distinct card from a later chunk, when one exists.
function dedupeChunks(chunks) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const seen = new Set();
    for (let j = 0; j < chunk.length; j++) {
      if (seen.has(chunk[j].name)) {
        let swapped = false;
        for (let k = i + 1; k < chunks.length && !swapped; k++) {
          const other = chunks[k];
          for (let m = 0; m < other.length; m++) {
            if (!seen.has(other[m].name) && !chunk.some((c) => c.name === other[m].name)) {
              const tmp = chunk[j];
              chunk[j] = other[m];
              other[m] = tmp;
              swapped = true;
              break;
            }
          }
        }
      }
      seen.add(chunk[j].name);
    }
  }
  return chunks;
}

function buildPickGroupsForBooster(cards, cardpool, grouping) {
  const sorted = cards.slice().sort((a, b) => sortValueFor(a, grouping) - sortValueFor(b, grouping));
  const chunks = [];
  for (let i = 0; i < sorted.length; i += cardpool) {
    chunks.push(sorted.slice(i, i + cardpool));
  }
  dedupeChunks(chunks);
  return shuffleArray(chunks);
}
