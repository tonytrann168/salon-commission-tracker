# Story 029: End-to-end suite

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Overseer (2026-11-13, release-candidate push): full flows in a real browser, en + vi at 320 px, fast, no keys.

## Acceptance Criteria

- [x] `npm run e2e`: Playwright (`@playwright/test` 1.64.1, the engine reference's pin), headless, against `vite preview`
  of an e2e build (`scripts/e2e-build.mjs` → `dist-e2e/`, production build + dummy Supabase settings so account
  screens show). Every `/api` call and every Supabase call (Auth + `saves` + `delete_my_account`) is answered by the
  tests (`tests/integration/fixtures.ts`); no keys, no network.
- [x] Flows, each in en and vi (20 tests): first run (meet → level → first appointment with the tour); a manicure to
  results (saved); a both-hands hard client (hand switch); a pedicure with soak/scrub (mood up, tools back); shop
  purchase → the polish in the station; rank-up celebration; backup → restore in a separate browser (damaged code
  refused first); sign up → wrong code → confirm code → sync → another phone: wrong password and unknown email give
  the same message → sign in → "which progress" → keep the account's → reloaded with it; offline title after one
  visit (service worker on); a new build while open → one reload with a note, never a loop.
- [x] Fast: ~35 s for the tests, ~1 min with the build; 40/40 with `--repeat-each 2` (no flakes seen).
- [x] Vitest ignores `tests/integration/` (vite.config `test.exclude`).

## Test Evidence

**Status**: [x] `src/tests/integration/*.spec.ts`; run log in the commit message.

## Completion Notes (2026-11-13)

- Process slip: this story file was written after the suite (rule: story file first). Noted in the commit.
- Off this container: run `npx playwright install chromium` once; in this container the preinstalled Chromium is
  used (`PW_CHROMIUM` overrides the path).
