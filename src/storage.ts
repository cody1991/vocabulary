export const UNKNOWN_STORAGE_KEY = "vocab.unknown";

export function loadUnknown(): string[] {
  try {
    const raw = localStorage.getItem(UNKNOWN_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const words: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string" || item.length === 0 || seen.has(item)) {
        continue;
      }
      seen.add(item);
      words.push(item);
    }
    return words;
  } catch {
    return [];
  }
}

export function saveUnknown(words: string[]): void {
  localStorage.setItem(UNKNOWN_STORAGE_KEY, JSON.stringify(words));
}
