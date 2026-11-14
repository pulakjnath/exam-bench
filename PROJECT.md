# Exam Bench: project handoff

A study-routine planner for a 3rd-semester ECE student preparing for end-sem exams. It turns subjects, topics, hours per weekday and exam dates into a minute-by-minute daily plan: study blocks, breaks (with what to do in them), spaced reviews, timed practice, weekly mini-tests, a buffer day, plus assignments and lab records scheduled as tasks. An optional AI import reads photos or PDFs of notes, syllabi and past papers using a Gemini API key.

Status: working single-file web app, vanilla JS, no framework, no build tooling beyond `cat`. Written for the Claude Artifact runtime but runs standalone in any browser (falls back to localStorage).

## Layout
```
dist/index.html   built, runnable file (open directly in a browser)
src/p1.html       <head>, CSS, theme tokens (light/dark), <div id="app">
src/p3s.html      extra CSS (toast, AI panel, file list)
src/p2.js         planner engine (const E), pure functions, no DOM
src/p3a.js        helpers, guide text, sample data, state, persistence
src/p4.js         AI import module (Gemini / Claude preview)
src/p3b.js        views, render(), event handlers, boot
build.sh          concatenates src into dist/. Order matters: p2, p3a, p4, p3b
tests/            Playwright and node scripts (see below)
```
File names are historical (the app was written in pieces). Renaming to engine.js / state.js / ai.js / ui.js is a good first cleanup. All files share one global scope (one `<script>`), so converting to ES modules is a natural next step.

## Features
- Tabs: Today, Plan, Tasks, Setup, Guide (hash routes #today #plan #tasks #setup #guide).
- Setup: dates, study window start, lights out, break length, weekly buffer day, hours for each weekday; subjects with type (theory or lab), strength (weak/okay/strong), marks weight, own exam date, past-papers flag, topic list (one per line).
- Plan phases: cover (first topics), practice, exam (final days), buffer, rest. Session types: cover, interleaved set, timed section or half paper, error-log redo, spaced review (+1/+3/+7/+14 days), viva, weekly mini-test, catch-up, eve-of-exam revision, lab blocks.
- Tasks (assignments, lab records): total minutes, chunk size, due date, mode Separate (own time slot), Shared (takes from study time) or Hybrid; scheduled backward from the due date.
- Daily sessions always sum exactly to the available window (tested, 0 mismatches).
- Re-plan from today: ticked cover rows become `coveredBase`, finished task chunks become `taskDone`, start date moves to today.
- Guide tab: how to do each task type; each task row links to its guide entry ("How to do it").
- AI import (Setup tab, "Import syllabus with AI"):
  - Enable button asks for a Gemini API key (stored only in localStorage `exam-bench-ai-v1`).
  - Modes: Notes/syllabus/textbook (finds topics AND any questions) or Past papers (questions only, sets pastPapers).
  - Questions carry `{text, topic, diff 1-3, min, marks}` and are stored in `subject.questions`.
  - Review screen with ticks, duplicate detection (token Jaccard + substring), undo last import.
  - Engine uses the question bank: interleaved sets fill each subject's time share with real questions; timed blocks list questions easiest-first with per-question minutes; covered topics are preferred.
  - Inputs: Choose files, Take photo (camera capture), paste screenshot. Images downscaled to 1600px JPEG; PDFs sent as-is; limit 10 files, 15 MB each, about 18 MB total.
  - Also has a "Try with Claude, no key" provider that works only inside Claude artifacts (photos only, via `claude.use('sample')`).

## State shape (localStorage key `exam-bench-v1`)
```
{v, sample, updatedAt,
 settings:{startDate,examDate,startTime,lightsOut,hours[7 Mon..Sun],bufferDay(0-6 or -1),breakMin},
 subjects:[{id,name,kind,rating,weight,pastPapers,examDate,topics[],questions[]}],
 tasks:[{id,title,type,subjectId,totalMin,chunkMin,due,mode,slot}],
 coveredBase:{"subjId|topic":date}, taskDone:{taskId:minutes}, done:{rowId:true}}
```
`normalize()` in p3a.js fills defaults for older saves.

## Engine (src/p2.js)
`E.buildPlan(S)` returns days with rows (`kind`, `dur`, `sub[]` lines, `how` guide key, `cov` topics). Key rules: cover phase ends at floor(days*0.7); labs count half a unit; lab blocks take 2 or 3 experiments; day-1 buffer day becomes a study day when nothing is covered yet; compress warning only if units > remaining blocks * 1.2; `takeQ()` / `qline()` pull questions from the bank.

## Persistence
`initCaps()` (p3a.js) uses `window.claude.use('user'|'db'|'downloads')` when present (Claude artifact runtime: per-user DB doc at `data/users/<id>/state`, file download). Outside Claude those are absent and the app uses localStorage only; the Download button is hidden. Replace with your own backend or IndexedDB when moving to Android.

## Running and testing
Open `dist/index.html` in a browser. To rebuild: `./build.sh`.
Tests need Node and Playwright (`npm i playwright`, then `npx playwright install chromium`). The scripts open `test.html`; after `./build.sh` use `dist/index.html` (edit the path at the top of each script):
- t.js: engine sanity (day totals equal window minutes)
- shot.js: screenshots and overflow checks at phone width
- flow.js: UI interaction flow
- ai.js / aiq2.js / fc.js: AI import with a mocked Gemini endpoint, notes and papers modes, file chooser

## AI import notes and caveats
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key`, JSON schema response (`responseMimeType: application/json`, `responseSchema`). Default model `gemini-2.5-flash`, user-editable under Advanced. Not verified with a real key (it could not reach Google from the Claude preview), only against a mock. Verify the model name, free-tier limits and request shape against current Google docs.
- A key in client-side JS is visible to the user. For a shipped app, put a small server in front that holds the key, with per-user limits.
- Imported photos and PDFs go to Google; on the free tier they may be used to improve Google products. Show this to users (the UI does).
- Question time estimates are the model's guesses.

## Planned next steps
1. Android app: wrap in a WebView (Capacitor or TWA) or rewrite natively. Keep the engine (p2.js) as shared pure JS.
2. Move the Gemini call behind your own server; add auth and rate limits.
3. On-device option: a small vision model (Gemma 3n via LiteRT-LM) plus ML Kit OCR and document scanner for offline import; Gemini as fallback.
4. PDF text extraction before sending (saves tokens, handles large PDFs).
5. Fuzzy topic matching beyond Jaccard; merge near-duplicate topics.
6. Mark questions done and feed errors into the error-log sessions; use real timings to recalibrate estimates.
7. Notifications and reminders on Android for session starts and breaks.
8. Split into modules, add unit tests for the engine, add a CI build.

## Design notes
Theme: resistor-colour bands per subject (`--c0..--c9`), phase colours, fonts Big Shoulders Display, JetBrains Mono, Public Sans (Google Fonts). Light and dark via prefers-color-scheme. Layout works at phone width with no horizontal scroll. Text is plain and direct; buttons that destroy data use tap-twice confirmation.

## Origin
Built in a Claude conversation. Published as a Claude artifact (private). The exam-routine-planner skill (the original question-and-answer planner that this app automates) was proposed separately.
