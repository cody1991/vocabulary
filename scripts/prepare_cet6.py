#!/usr/bin/env python3
"""Build public/cet6.json from a KyleBing CET-6 sentence JSONL and ECDICT.

English text is copied from ECDICT's definition field. This script does not
write or paraphrase definitions.

Usage:
  python3 scripts/prepare_cet6.py CET6.jsonl ecdict.csv public/cet6.json
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import OrderedDict

POS_LABEL = {
    "n": "n.",
    "v": "v.",
    "a": "adj.",
    "s": "adj.",
    "j": "adj.",
    "r": "adv.",
    "adv": "adv.",
    "prep": "prep.",
    "pron": "pron.",
    "conj": "conj.",
    "c": "conj.",
    "imp": "imp.",
    "art": "art.",
    "num": "num.",
    "u": "interj.",
    "int": "interj.",
}

# Used only when MATCH misses. ECDICT stores the interjection "alas" as an
# adverb sense ("by bad luck") after unrelated noun senses.
SECONDARY = {
    "int": {"r"},
    "interj": {"r"},
}

# Chinese part-of-speech labels in the CET-6 list -> ECDICT sense tags.
MATCH = {
    "n": {"n"},
    "v": {"v"},
    "vt": {"v"},
    "vi": {"v"},
    "adj": {"a", "s", "j"},
    "adv": {"r", "adv"},
    "prep": {"prep"},
    "conj": {"conj", "c"},
    "pron": {"pron"},
    "int": {"int", "u"},
    "interj": {"int", "u"},
    "num": {"num"},
    "art": {"art"},
}

SENSE_RE = re.compile(r"^([A-Za-z]{1,8})\.\s+(.*)$")
LETTER_RE = re.compile(r"^([nvasrj])\s+(.*)$")


def split_senses(definition: str) -> list[tuple[str, str]]:
    text = (definition or "").replace("\\n", "\n")
    senses: list[tuple[str, str]] = []
    for part in text.split("\n"):
        part = " ".join(part.split())
        if not part:
            continue
        dotted = SENSE_RE.match(part)
        if dotted:
            senses.append((dotted.group(1).lower(), dotted.group(2).strip()))
            continue
        letter = LETTER_RE.match(part)
        if letter:
            senses.append((letter.group(1).lower(), letter.group(2).strip()))
            continue
        senses.append(("", part))
    return senses


def zh_types(entries: list[dict]) -> list[str]:
    types: list[str] = []
    for entry in entries:
        for item in entry.get("translations") or []:
            raw = (item.get("type") or "").strip().lower()
            for token in re.split(r"[&/|,]+", raw):
                token = token.strip()
                if token and token not in types:
                    types.append(token)
    return types


def clean_gloss(gloss: str) -> str:
    gloss = " ".join(gloss.split())
    if gloss.endswith('"') and gloss.count('"') == 1:
        gloss = gloss[:-1].rstrip()
    return gloss


def format_def(pos: str, gloss: str) -> str:
    gloss = clean_gloss(gloss)
    label = POS_LABEL.get(pos, f"{pos}." if pos else "")
    if label:
        return f"{label} {gloss}"
    return gloss


def first_matching(senses: list[tuple[str, str]], wanted: set[str]) -> str:
    for pos, gloss in senses:
        if pos in wanted and gloss:
            return format_def(pos, gloss)
    return ""


def choose_def(definition: str, entries: list[dict]) -> str:
    senses = split_senses(definition)
    if not senses:
        return ""
    # Prefer the earliest Chinese part of speech, then the first ECDICT sense.
    types = zh_types(entries)
    for table in (MATCH, SECONDARY):
        for typ in types:
            wanted = table.get(typ)
            if not wanted:
                continue
            chosen = first_matching(senses, wanted)
            if chosen:
                return chosen
    pos, gloss = senses[0]
    return format_def(pos, gloss)


def gloss_zh(entries: list[dict]) -> str:
    parts: list[str] = []
    seen: set[tuple[str, str]] = set()
    for entry in entries:
        for item in entry.get("translations") or []:
            text = " ".join((item.get("translation") or "").split())
            typ = " ".join((item.get("type") or "").split())
            if not text:
                continue
            key = (typ, text)
            if key in seen:
                continue
            seen.add(key)
            parts.append(f"{typ}. {text}" if typ else text)
    return "；".join(parts)


def pick_sentence(entries: list[dict]) -> str:
    candidates: list[str] = []
    for entry in entries:
        for item in entry.get("sentences") or []:
            text = " ".join((item.get("sentence") or "").split())
            if text:
                candidates.append(text)
    if not candidates:
        return ""
    long = [item for item in candidates if len(item.split()) >= 4]
    return long[0] if long else candidates[0]


def pick_phonetic(entries: list[dict], fallback: str) -> str:
    raw = ""
    for entry in entries:
        us = " ".join((entry.get("us") or "").split())
        if us:
            raw = us
            break
    if not raw:
        for entry in entries:
            uk = " ".join((entry.get("uk") or "").split())
            if uk:
                raw = uk
                break
    if not raw:
        raw = " ".join((fallback or "").split())
    if not raw:
        return ""
    if raw[0] in "/[":
        return raw
    return f"/{raw}/"


def main() -> None:
    if len(sys.argv) != 4:
        print(
            "usage: prepare_cet6.py CET6.jsonl ecdict.csv out.json",
            file=sys.stderr,
        )
        sys.exit(2)
    jsonl_path, csv_path, out_path = sys.argv[1:]

    groups: OrderedDict[str, list[dict]] = OrderedDict()
    display: dict[str, str] = {}
    with open(jsonl_path, encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            entry = json.loads(line)
            word = " ".join((entry.get("word") or "").split())
            if not word:
                continue
            key = word.lower()
            if key not in groups:
                groups[key] = []
                display[key] = word
            groups[key].append(entry)

    ecdict: dict[str, dict[str, str]] = {}
    with open(csv_path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            key = (row.get("word") or "").strip().lower()
            if key in groups and key not in ecdict:
                ecdict[key] = row

    cards: list[dict[str, str]] = []
    missing: list[str] = []
    for key, entries in groups.items():
        row = ecdict.get(key) or {}
        def_en = choose_def(row.get("definition") or "", entries)
        card = {
            "word": display[key],
            "phonetic": pick_phonetic(entries, row.get("phonetic") or ""),
            "defEn": def_en,
            "defZh": gloss_zh(entries),
            "sentence": pick_sentence(entries),
        }
        cards.append(card)
        if not def_en:
            missing.append(display[key])

    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(cards, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")

    print(f"cards {len(cards)}")
    print(f"missing en {len(missing)}: {', '.join(missing)}")
    print(f"missing zh {sum(1 for card in cards if not card['defZh'])}")
    print(f"missing sentence {sum(1 for card in cards if not card['sentence'])}")
    print(f"missing phonetic {sum(1 for card in cards if not card['phonetic'])}")


if __name__ == "__main__":
    main()
