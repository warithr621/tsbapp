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

**Entry point:** `server.js` — connects to MongoDB, mounts three route files under `/api`, serves `public/` as static files, and serves `generated/` for compiled `.tex` files.

**Routes:**
- `routes/questions.js` — CRUD for questions. PUT does a swap if the target slot (subject + round + role + number) is already occupied by another question, so positions stay consistent.
- `routes/latex.js` — accepts a round code (e.g. `rr1`, `de3`, `f1`), queries questions for that round, writes `.tex` files to `generated/`. Generates a replacements file if any `questionNumber === 6` entries exist.
- `routes/csv.js` — parses uploaded CSV data and bulk-inserts questions. Also has a preview endpoint that parses only the first row.

**Data model (`models/question.js`):**
Each question belongs to a `(subject, round, questionRole, questionNumber)` slot. `questionNumber` 1–5 are regular questions; 6 is the replacement. `questionRole` is `Tossup` or `Bonus`. Valid subjects are Physics, Chemistry, Biology, Earth & Space, Math, Energy (General Science exists in the enum but is not used).

**Lib:**
- `lib/latex.js` — renders questions to LaTeX using a custom `\question` macro. Handles LaTeX special character escaping while preserving `$...$` math mode and existing `\commands`. Converts Unicode chars to LaTeX equivalents via `lib/unicode.js`. Square brackets `[text]` outside math mode become `\pron{text}`.
- `lib/csv.js` — parses the subject-specific CSV format where columns are named `T1 Question`, `B3 Question`, etc., and the last two columns are replacement tossup/bonus. Question cells are 2-line (SA), 5-line (SA with ranked choices), or 6-line (MC with W/X/Y/Z).

**Round numbering:** Round codes (`rr1`–`rr5`, `de1`–`de7`, `f1`–`f2`) map to integer round numbers 1–14 stored in MongoDB. The canonical mapping lives in `lib/rounds.js` (server-side, required by `routes/latex.js` and `lib/csv.js`) and `public/js/rounds.js` (client-side global, loaded before page scripts in `upload.html` and `question-table.html`). Do not add new hardcoded copies — derive from these files.

**Shared client-side utilities:** `public/js/rounds.js` exports `ROUNDS`, `ROUND_MAP`, `ROUND_MAP_REVERSE` as globals. `public/js/utils.js` exports `escapeHtml`. Any HTML page that uses these must load the respective script before its own JS file.

**rounds.js export difference:** The server-side `lib/rounds.js` exports `ROUND_NAMES` (id → display name); the client-side `public/js/rounds.js` does not. Keep these in sync manually when the round list changes.

**Pages:** `index.html` (home/nav), `upload.html` (single-question entry form, uses KaTeX for preview), `csv-upload.html` (bulk CSV import, separate flow from `upload.html`), `question-table.html` (view/edit all questions, uses KaTeX), `view.html` (read-only question viewer), `subject-select.html` (subject picker UI).

**CSS:** Source is `src/input.css`; output is `public/css/styles.css`. Always rebuild after editing the source or adding new Tailwind classes.

**Generated files:** `.tex` files land in `generated/`. The logo is copied there so each `.tex` is self-contained for local `pdflatex` compilation.
