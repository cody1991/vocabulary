export type Card = {
  word: string;
  phonetic: string;
  defEn: string;
  defZh: string;
  sentence: string;
};

export type StudyMode = "all" | "unknown";

export function isCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") {
    return false;
  }
  const card = value as Record<string, unknown>;
  return (
    typeof card.word === "string" &&
    card.word.trim().length > 0 &&
    typeof card.phonetic === "string" &&
    typeof card.defEn === "string" &&
    typeof card.defZh === "string" &&
    typeof card.sentence === "string"
  );
}
