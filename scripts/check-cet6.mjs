import { readFileSync } from "node:fs";

const cards = JSON.parse(readFileSync("public/cet6.json", "utf8"));
if (!Array.isArray(cards)) {
  throw new Error("cet6.json must be an array");
}
if (cards.length < 3500) {
  throw new Error(`expected a CET-6 list, got ${cards.length} cards`);
}

const fields = ["word", "phonetic", "defEn", "defZh", "sentence"];
const words = new Set();
for (const card of cards) {
  for (const field of fields) {
    if (typeof card[field] !== "string") {
      throw new Error(`card missing string field ${field}`);
    }
  }
  if (!card.word.trim()) {
    throw new Error("empty word");
  }
  const key = card.word.toLowerCase();
  if (words.has(key)) {
    throw new Error(`duplicate word ${card.word}`);
  }
  words.add(key);
}

const abandonment = cards.find((card) => card.word === "abandonment");
if (!abandonment?.defEn.toLowerCase().includes("giving something up")) {
  throw new Error("abandonment is missing its ECDICT English definition");
}

const abide = cards.find((card) => card.word === "abide");
if (!abide?.defEn.toLowerCase().includes("dwell")) {
  throw new Error("abide is missing its ECDICT English definition");
}

const alas = cards.find((card) => card.word === "alas");
if (!alas?.defEn.toLowerCase().includes("by bad luck")) {
  throw new Error("alas is missing its ECDICT English definition");
}

const empty = cards.filter((card) => !card.defEn);
if (empty.length > 15) {
  throw new Error(`too many cards without an English definition (${empty.length})`);
}

console.log(
  `ok ${cards.length} words, ${empty.length} without an English definition`,
);
