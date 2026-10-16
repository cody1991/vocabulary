# CET-6 vocabulary flashcards

Plain flashcards for the CET-6 word list. One word at a time: the word, a phonetic, a US pronunciation, an English definition, a Chinese gloss you can reveal, and one example sentence.

Unknown words are stored only in this browser under the `localStorage` key `vocab.unknown` (a JSON array of word strings). There is no account and no server.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173/vocabulary/](http://localhost:5173/vocabulary/).

```bash
npm run build
npm run preview
```

The preview server uses the same `/vocabulary/` base path.

The deck is shuffled when the page loads and again when you switch between **All words** and **Unknown only**.

## GitHub Pages

The site is meant to be published at:

https://cody1991.github.io/vocabulary/

`.github/workflows/deploy.yml` builds the app and deploys `dist/` with GitHub Actions (`actions/upload-pages-artifact` and `actions/deploy-pages`) on every push to `master`.

The first time, turn Pages on yourself. The workflow cannot do that for a new repository:

1. Open this repository’s **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `master`, or run the **Deploy GitHub Pages** workflow from the Actions tab.

Until that source is GitHub Actions, the deploy job has nowhere to publish.

## Data

`public/cet6.json` is built ahead of time. The app does not call a dictionary API for definitions.

| Field | Source |
| --- | --- |
| `word`, `phonetic`, `defZh`, `sentence` | [KyleBing/english-vocabulary](https://github.com/KyleBing/english-vocabulary) CET-6 sentence JSONL (`full_line_jsonl/sentence/正序/六级.jsonl`). BSD 3-Clause. Copyright (c) 2022-2026 KyleBing. |
| `defEn` | [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT) `definition` field, copied as published. MIT. Copyright (c) 2025 Linwei. |

Duplicate headwords in the CET-6 list are merged. The English line is the first ECDICT sense whose part of speech matches the Chinese gloss. A few headwords have no English definition in ECDICT; those cards show the Chinese gloss and say so.

Regenerate the file from the two upstream downloads (they are not committed):

```bash
python3 scripts/prepare_cet6.py path/to/六级.jsonl path/to/ecdict.csv public/cet6.json
```

Full license texts are in [`public/NOTICES.txt`](public/NOTICES.txt), and that file is published with the site.

Press **Play audio** to request a US pronunciation from Youdao:

`https://dict.youdao.com/dictvoice?audio=WORD&type=2`

That audio is not stored in this repository.
