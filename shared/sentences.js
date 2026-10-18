/*
 * Sentences of a card's effect text: pure, no DOM. A sentence ends at a period outside double quotes followed by a
 * space or the end, or at a line break; a period inside quotes (a name like "Mr. Volcano") never ends one.
 */
/* Where the first sentence ends: at a period outside quotes (a name like "Mr. X" does not end it) or a line break. */
function firstSentenceEnd(text) {
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "“" || ch === "”") inQuote = ch === "“" ? true : ch === "”" ? false : !inQuote;
    else if (!inQuote && (ch === "\n" || (ch === "." && (i + 1 === text.length || /\s/.test(text[i + 1]))))) return i + 1;
  }
  return text.length;
}

/* The sentences of `text`, trimmed, in order; none for an empty text. */
function splitSentences(text) {
  const sentences = [];
  let rest = String(text || "");
  while (rest.trim() !== "") {
    const end = firstSentenceEnd(rest);
    const sentence = rest.slice(0, end).trim();
    if (sentence) sentences.push(sentence);
    rest = rest.slice(end);
  }
  return sentences;
}
