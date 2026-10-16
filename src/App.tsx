import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { shuffle } from "./shuffle.ts";
import {
  loadKnown,
  loadUnknown,
  saveKnown,
  saveUnknown,
} from "./storage.ts";
import { isCard, type Card, type StudyMode } from "./types.ts";

function youdaoUrl(word: string): string {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
}

export default function App() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<StudyMode>("all");
  const [unknown, setUnknown] = useState<string[]>(loadUnknown);
  const [known, setKnown] = useState<string[]>(loadKnown);
  const [order, setOrder] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [showZh, setShowZh] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}cet6.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load the word list (${response.status}).`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("The word list is not an array.");
        }
        const parsed = data.filter(isCard);
        if (parsed.length === 0) {
          throw new Error("The word list is empty.");
        }
        setCards(parsed);
        const knownSet = new Set(loadKnown());
        setOrder(shuffle(parsed.filter((card) => !knownSet.has(card.word))));
        setIndex(0);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Could not load the word list.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const unknownSet = useMemo(() => new Set(unknown), [unknown]);
  const knownSet = useMemo(() => new Set(known), [known]);
  const savedCount = useMemo(
    () => (cards ? cards.filter((card) => unknownSet.has(card.word)).length : 0),
    [cards, unknownSet],
  );
  const knownCount = useMemo(
    () => (cards ? cards.filter((card) => knownSet.has(card.word)).length : 0),
    [cards, knownSet],
  );

  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    stopSpeech();
    setAudioError(false);
  }

  function speakText(text: string) {
    if (!text.trim()) {
      return;
    }
    audioRef.current?.pause();
    stopSpeech();
    setAudioError(false);
    if (!("speechSynthesis" in window)) {
      setAudioError(true);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onerror = () => setAudioError(true);
    window.speechSynthesis.speak(utterance);
  }

  function deckFor(nextMode: StudyMode, nextCards: Card[], nextUnknown: Set<string>, nextKnown: Set<string>) {
    if (nextMode === "unknown") {
      return nextCards.filter((card) => nextUnknown.has(card.word));
    }
    return nextCards.filter((card) => !nextKnown.has(card.word));
  }

  function switchMode(nextMode: StudyMode) {
    if (!cards || nextMode === mode) {
      return;
    }
    stopAudio();
    setMode(nextMode);
    setOrder(shuffle(deckFor(nextMode, cards, unknownSet, knownSet)));
    setIndex(0);
    setShowZh(false);
  }

  function showNext() {
    if (order.length === 0) {
      return;
    }
    stopAudio();
    setIndex((current) => (current + 1) % order.length);
    setShowZh(false);
  }

  function removeCurrentFromOrder(word: string) {
    const at = order.findIndex((card) => card.word === word);
    const trimmed = order.filter((card) => card.word !== word);
    setOrder(trimmed);
    setIndex(trimmed.length === 0 ? 0 : Math.min(at < 0 ? index : at, trimmed.length - 1));
    setShowZh(false);
    stopAudio();
  }

  function toggleUnknown(word: string) {
    const saved = unknownSet.has(word);
    const nextUnknown = saved ? unknown.filter((item) => item !== word) : [...unknown, word];
    setUnknown(nextUnknown);
    saveUnknown(nextUnknown);

    if (!saved && knownSet.has(word)) {
      const nextKnown = known.filter((item) => item !== word);
      setKnown(nextKnown);
      saveKnown(nextKnown);
    }

    if (saved && mode === "unknown") {
      removeCurrentFromOrder(word);
    }
  }

  function markKnown(word: string) {
    if (!knownSet.has(word)) {
      const nextKnown = [...known, word];
      setKnown(nextKnown);
      saveKnown(nextKnown);
    }
    if (unknownSet.has(word)) {
      const nextUnknown = unknown.filter((item) => item !== word);
      setUnknown(nextUnknown);
      saveUnknown(nextUnknown);
    }
    removeCurrentFromOrder(word);
  }

  function play(word: string) {
    stopSpeech();
    audioRef.current?.pause();
    const audio = new Audio(youdaoUrl(word));
    audioRef.current = audio;
    setAudioError(false);
    void audio.play().catch(() => setAudioError(true));
  }

  const safeIndex = order.length === 0 ? 0 : Math.min(index, order.length - 1);
  const card = order[safeIndex];

  return (
    <main className="app">
      <header>
        <h1>CET-6</h1>
        <p className="lede">
          One word at a time. Known words leave the full deck; unknown words stay for review.
        </p>
        <p className="count meta">Known on this device: {knownCount}</p>
        <div className="modes" role="group" aria-label="Which words to study">
          <button type="button" aria-pressed={mode === "all"} onClick={() => switchMode("all")}>
            All words
          </button>
          <button
            type="button"
            aria-pressed={mode === "unknown"}
            onClick={() => switchMode("unknown")}
          >
            Unknown only ({savedCount})
          </button>
        </div>
      </header>

      {loadError ? <p className="note">{loadError}</p> : null}
      {!loadError && !cards ? <p className="note">Loading words…</p> : null}

      {cards && mode === "unknown" && order.length === 0 ? (
        <section className="card empty">
          <h2>No unknown words</h2>
          <p>Save a word from the full list. It stays in this browser.</p>
          <button type="button" className="primary" onClick={() => switchMode("all")}>
            All words
          </button>
        </section>
      ) : null}

      {cards && mode === "all" && order.length === 0 ? (
        <section className="card empty">
          <h2>All caught up</h2>
          <p>Every word is marked known on this device. Clear site data to reset, or review unknowns.</p>
          <button type="button" className="primary" onClick={() => switchMode("unknown")}>
            Unknown only
          </button>
        </section>
      ) : null}

      {card ? (
        <>
          <article className="card" aria-labelledby="current-word">
            <p className="count">
              {safeIndex + 1} / {order.length}
            </p>
            <h2 id="current-word" className="word">
              {card.word}
            </h2>
            <div className="sound">
              {card.phonetic ? (
                <p className="phonetic">{card.phonetic}</p>
              ) : (
                <p className="note">No phonetic in the word list.</p>
              )}
              <button type="button" className="play" onClick={() => play(card.word)}>
                Play audio
              </button>
            </div>
            {audioError ? (
              <p className="note" role="status">
                Could not play audio.
              </p>
            ) : null}

            <div className="section-head">
              <h3 className="label">English</h3>
              {card.defEn ? (
                <button type="button" className="play play-sm" onClick={() => speakText(card.defEn)}>
                  Play
                </button>
              ) : null}
            </div>
            {card.defEn ? (
              <p className="def">{card.defEn}</p>
            ) : (
              <p className="note">No English definition in the dictionary. Showing Chinese instead.</p>
            )}

            {card.defEn ? (
              <>
                <button
                  type="button"
                  className="reveal"
                  aria-expanded={showZh}
                  onClick={() => setShowZh((current) => !current)}
                >
                  {showZh ? "Hide Chinese" : "Show Chinese"}
                </button>
                {showZh ? (
                  <p className="def zh" lang="zh">
                    {card.defZh || "No Chinese gloss."}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="def zh" lang="zh">
                {card.defZh || "No Chinese gloss."}
              </p>
            )}

            <div className="section-head">
              <h3 className="label">Example</h3>
              {card.sentence ? (
                <button type="button" className="play play-sm" onClick={() => speakText(card.sentence)}>
                  Play
                </button>
              ) : null}
            </div>
            {card.sentence ? (
              <p className="sentence">{card.sentence}</p>
            ) : (
              <p className="note">No example sentence in the word list.</p>
            )}
          </article>

          <div className="actions actions-3">
            <button type="button" className="primary" onClick={showNext}>
              Next
            </button>
            <button
              type="button"
              aria-pressed={unknownSet.has(card.word)}
              onClick={() => toggleUnknown(card.word)}
            >
              {unknownSet.has(card.word) ? "Remove from unknown" : "Save to unknown"}
            </button>
            <button type="button" onClick={() => markKnown(card.word)}>
              I know this
            </button>
          </div>
        </>
      ) : null}

      <footer>
        <a href={`${import.meta.env.BASE_URL}NOTICES.txt`}>Data sources and licenses</a>
      </footer>
    </main>
  );
}
