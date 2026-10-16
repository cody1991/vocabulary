export const UNKNOWN_STORAGE_KEY = "vocab.unknown";
export const KNOWN_STORAGE_KEY = "vocab.known";

function loadWordList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
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

function saveWordList(key: string, words: string[]): void {
  localStorage.setItem(key, JSON.stringify(words));
}

export function loadUnknown(): string[] {
  return loadWordList(UNKNOWN_STORAGE_KEY);
}

export function saveUnknown(words: string[]): void {
  saveWordList(UNKNOWN_STORAGE_KEY, words);
}

export function loadKnown(): string[] {
  return loadWordList(KNOWN_STORAGE_KEY);
}

export function saveKnown(words: string[]): void {
  saveWordList(KNOWN_STORAGE_KEY, words);
}
