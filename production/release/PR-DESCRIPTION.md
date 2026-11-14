# DRAFT — Salon Besties 1.0.0-rc.1: merge `claude/code-game-studios-myzjer` into `main`

> Draft only. The PR is **not opened** and nothing is merged: the owner decides. Copy this text into the PR when ready.

## Summary

This branch adds **Salon Besties**, a phone-first English-practice game for Vietnamese nail technicians, under `src/`,
next to PolishPay (the static site at the repo root), plus the studio's design and production docs. It reaches the
first release candidate, **1.0.0-rc.1**.

- **Game** (`src/`): Vite 8 + TypeScript 7 + PixiJS 8. AI clients with mood, phases, nail art station (hands, both
  hands, pedicure with soak & scrub), scoring and reviews, an English-learning loop (corrections, phrasebook, 50 starter
  phrases), a bilingual companion (older/younger Vietnamese kinship pronouns), progression and shop (free, pretend
  money), daily challenges and scenarios (9), comfort settings, PWA (offline title, safe updates), backup codes + QR,
  optional accounts (Supabase, email + password with codes), a Tết pack, privacy & terms pages, error screen and
  privacy-safe error reports.
- **Server functions** (`src/server/`): every AI call goes through them; the API key never reaches the browser. The
  hosted preview has invite codes, rate limits and daily caps.
- **Docs**: `design/`, `production/` (stories 001–034, QA evidence, acceptance sweep, tester guide), `.claude/`.

## What changes for PolishPay

Nothing in PolishPay's files: `index.html`, `app.html`, `legal.html` and `vercel.json` at the root are untouched.
New at the root: `.vercelignore` (keeps `src/`, `design/`, `docs/`, `production/` and `.claude/` out of PolishPay's
deploy), `.gitignore`, `project.yaml`, `assets/audio/LICENSES.md`. **Check PolishPay's next deploy after merging.**

## How it was tested

- `cd src && npm test`: 34 files, 367 unit tests.
- `cd src && npm run e2e`: 30 end-to-end tests (Playwright, en + vi at 320 px; mocked AI and Supabase): first run, a
  manicure to results, a both-hands client, a pedicure, shop, rank-up, colour redo, phrasebook, backup → restore,
  accounts with the conflict choice, offline title, a new build while open, privacy pages, the error screen, What's new.
- `cd src && npm run smoke:api`: 16 checks against the real AI API (run by the overseer locally, 16/16).
- Acceptance sweep: `production/qa/acceptance-sweep.md`.

## Not covered yet (owner)

- Real Supabase project, SMTP and Vercel environment variables (see the release checklist in the last commit).
- Phone playtest: 60 fps painting, voice, sound, home-screen install (`production/qa/acceptance-sweep.md`).
- Final art from the designer (companion figures, áo dài).
- A Vietnamese speaker's review of the vi text.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
