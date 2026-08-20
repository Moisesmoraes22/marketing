function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function lintScriptContent(content: unknown, wordsToAvoid: string[]): string[] {
  const cleanedWords = wordsToAvoid.map((w) => w.trim()).filter(Boolean);
  if (cleanedWords.length === 0) return [];

  const strings: string[] = [];
  collectStrings(content, strings);
  const fullText = strings.join(" \n ").toLowerCase();

  const flagged = cleanedWords.filter((word) => {
    const pattern = new RegExp(`\\b${escapeRegExp(word.toLowerCase())}\\b`, "i");
    return pattern.test(fullText);
  });

  return [...new Set(flagged)];
}
