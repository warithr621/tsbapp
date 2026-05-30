# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
brew services start mongodb-community   # start MongoDB (required before running the app)
npm install                             # install dependencies
npm run build:css                       # compile Tailwind CSS (must run after CSS changes)
npm run watch:css                       # watch and recompile CSS during development
npm run dev                             # start server with hot reload (nodemon)
npm start                               # start server without hot reload
```

No test suite exists. Manual testing is done by running the app and using the UI.

## Environment

Copy `.env` and set:
- `MONGODB_URI` — defaults to `mongodb://localhost:27017/tsbapp`
- `APP_PASSWORD` — login password
- `RESET_KEY` — password for wiping all questions
- `SESSION_SECRET` — generate with `openssl rand -hex 32`

## Architecture

**Stack:** Express + Mongoose + MongoDB backend, vanilla HTML/JS frontend, Tailwind CSS.

**Entry point:** `server.js` — connects to MongoDB, mounts three route files under `/api`, serves `public/` as static files, and serves `generated/` for compiled `.tex` and `.pdf` files.

**Routes:**
- `routes/questions.js` — CRUD for questions. PUT does a swap if the target slot (subject + round + role + number) is already occupied by another question, so positions stay consistent.
- `routes/latex.js` — two endpoints:
  - `POST /api/generate-latex` — accepts `{ round, counts, subjectOrder, writers }`. `writers` is an optional map of subject → comma-separated writer names. Writes `.tex` files to `generated/`, then spawns two `pdflatex -interaction=nonstopmode` child processes in parallel (main packet + replacements). Uses `shell: true` for cross-platform PATH resolution. A module-level `compilationStatus` Map tracks `{ round, replacements }` each with `status: 'pending' | 'success' | 'error' | 'n/a'`. A `generationId` guard prevents stale pdflatex processes from overwriting a newer generation's status. Returns `{ success, hasReplacements }` immediately, before PDFs finish compiling.
  - `GET /api/pdf-status/:round` — returns the current `compilationStatus` entry for a round. On error, includes an `errors` array parsed from the pdflatex `.log` file: each entry has `{ error, question }` where `question` is the nearest `% Q: Subject Role N` comment found by scanning backward from the error line in the `.tex` file.
- `routes/csv.js` — parses uploaded CSV data and bulk-inserts questions. Also has a preview endpoint that parses only the first row.

**Data model (`models/question.js`):**
Each question belongs to a `(subject, round, questionRole, questionNumber)` slot. `questionNumber` 1–5 are regular questions; 6 is the replacement. `questionRole` is `Tossup` or `Bonus`. Valid subjects are Physics, Chemistry, Biology, Earth & Space, Math, Energy (General Science exists in the enum but is not used).

**Lib:**
- `lib/latex.js` — renders questions to LaTeX using a custom `\question` macro. `generateLatexContent(questions, round, subjectOrder, counts, writers={})` interleaves subjects in the caller-supplied `subjectOrder`, cycling through question numbers (1st of each subject, then 2nd, etc.); empty slots emit a `\textbf{[MISSING]}` placeholder via `missingTex`. Both generation functions accept an optional `writers` map (subject → string) injected into the front-page author block. The author block is rendered in canonical subject order (Biology, Chemistry, Physics, Earth & Space, Math, Energy) filtered to active subjects only; missing entries fall back to `[Add Writers]`. A `% Q: Subject Role N` comment is emitted before each question block to enable pdflatex error-log mapping. Handles LaTeX special character escaping while preserving `$...$` math mode and existing `\commands`. Converts Unicode chars to LaTeX equivalents via `lib/unicode.js`. Square brackets `[text]` outside math mode become `\pron{text}`.
- `lib/csv.js` — parses the subject-specific CSV format where columns are named `T1 Question`, `B3 Question`, etc., and the last two columns are replacement tossup/bonus. Question cells are 2-line (SA), 5-line (SA with 3 ranked choices, `1)`/`2)`/`3)` prefixes), 6-line with `1)` prefix (SA with 4 ranked choices), or 6-line with `W)` prefix (MC with W/X/Y/Z).

**Round numbering:** Round codes (`rr1`–`rr5`, `de1`–`de7`, `f1`–`f2`) map to integer round numbers 1–14 stored in MongoDB. The canonical mapping lives in `lib/rounds.js` (server-side, required by `routes/latex.js` and `lib/csv.js`) and `public/js/rounds.js` (client-side global, loaded before page scripts in `upload.html` and `question-table.html`). Do not add new hardcoded copies — derive from these files.

**Shared client-side utilities:** `public/js/rounds.js` exports `ROUNDS`, `ROUND_MAP`, `ROUND_MAP_REVERSE`, and `SUBJECTS` as globals. `public/js/utils.js` exports `escapeHtml` as a global. Any HTML page that uses these must load the respective script before its own JS file. `view.html` loads both `rounds.js` and `utils.js` before `view.js`.

**`SUBJECTS` canonical order:** Defined once in `lib/rounds.js` (server) and `public/js/rounds.js` (client): `['Biology', 'Chemistry', 'Physics', 'Earth & Space', 'Math', 'Energy']`. `lib/latex.js` imports it from `lib/rounds.js`; `public/js/view.js` uses it as the global from `public/js/rounds.js`. Do not redefine it elsewhere.

**rounds.js export difference:** The server-side `lib/rounds.js` exports `ROUND_NAMES` (id → display name); the client-side `public/js/rounds.js` does not. Keep these in sync manually when the round list changes.

**Pages:** `index.html` (home/nav), `upload.html` (single-question entry form, uses KaTeX for preview; has client-side blank-field validation in `sendQuestion()`), `csv-upload.html` (bulk CSV import, separate flow from `upload.html`), `question-table.html` (view/edit all questions, uses KaTeX), `view.html` (packet generation — see below), `subject-select.html` (subject picker UI).

**Packet generation flow (`view.html` / `public/js/view.js`):**
1. User picks per-subject counts (0–5) and clicks Shuffle → Fisher-Yates shuffle with adjacency fix (see below); per-subject writer inputs appear in canonical subject order filtered to active subjects.
2. User optionally fills writer names (comma-separated), then clicks Generate.
3. `view.js` POSTs `{ round, counts, subjectOrder, writers }` to `/api/generate-latex`. The `.tex` download buttons appear immediately on response.
4. `pdflatex` runs server-side in parallel for the main packet and replacements file. The UI shows a spinner per column while compiling.
5. `view.js` polls `/api/pdf-status/:round` every 2 seconds. When `status` transitions from `pending` to `success` or `error`, the spinner is replaced with a PDF download button or an error message listing which question(s) caused the failure.
6. The output section is a 2×2 grid: Round Packet column (`.tex` + `.pdf`) and Replacements column (`.tex` + `.pdf`). If no replacement questions exist for the round, the Replacements column shows "No replacements for this round".

**Packet shuffle adjacency fix (`public/js/view.js`):** After Fisher-Yates shuffle, if any subject whose count equals `maxCount` (when `maxCount > minCount`) lands last in the order, it is swapped with a random non-extra subject at a non-last position. This prevents the same subject from appearing consecutively across the boundary between the last full cycle and the partial cycle.

**Canonical subject order:** Both `lib/latex.js` (server) and `public/js/view.js` (client) use `['Biology', 'Chemistry', 'Physics', 'Earth & Space', 'Math', 'Energy']`. This order governs the count-button grid, the writer input grid, and the LaTeX front-page author block. Do not reorder.

**CSS:** Source is `src/input.css`; output is `public/css/styles.css`. Always rebuild after editing the source or adding new Tailwind classes.

**Generated files:** `generated/` holds `.tex` source files, the compiled `.pdf` files, and pdflatex artifacts (`.log`, `.aux`). The logo is copied to `generated/logo.png` so each `.tex` is self-contained. `pdflatex` is run with `cwd: generated/` so all outputs land there. `pdflatex` must be installed and on PATH (see README for macOS/Windows setup).
