function parseYdkText(text) {
  const lines = (text || "").split(/\r?\n/).map((l) => l.trim());
  const result = { main: [], extra: [] };
  let currentSection = null;
  let sawAnySection = false;

  lines.forEach((line) => {
    if (!line) return;
    if (line.startsWith("#main")) {
      currentSection = "main";
      sawAnySection = true;
      return;
    }
    if (line.startsWith("#extra")) {
      currentSection = "extra";
      sawAnySection = true;
      return;
    }
    if (line.startsWith("!side")) {
      currentSection = null;
      return;
    }
    if (line.startsWith("#")) return;
    if (!currentSection) return;
    if (/^\d+$/.test(line)) {
      result[currentSection].push(line);
    }
  });

  if (!sawAnySection) return null;
  return result;
}
