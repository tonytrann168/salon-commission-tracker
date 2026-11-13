# Story 031: Privacy & terms

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Foundation
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Overseer (release-candidate push): a simple privacy page and terms page, en + vi, plain language, exact legal meaning.

## Acceptance Criteria

- [x] `privacy.html` and `terms.html` served by the game (offline too, via the service worker), each with English and
  Vietnamese, at phone width.
- [x] Privacy says what is stored and where: on the phone (progress, settings, phrasebook, companion); with an optional
  account, the email, a password (kept hashed by the sign-in service) and the game progress; optional feedback
  (rating, text, game details, the chat only when the tester chooses to send it). What the AI receives: the chat
  lines, English level, the companion's name and kind, the optional first name, appointment results; never the email
  or the account. Voice uses the phone's or browser's own speech service. No payments, no ads, nothing sold.
  Deletion (Delete my account; clearing the app's data; feedback by email) and contact (OWNER-EMAIL placeholder).
- [x] Terms: free to use, a practice game (not professional or language certification), fair use, the AI can be
  wrong, changes, contact.
- [x] Linked from the sign-up / sign-in sheet, Settings, and the invite screen.
- [x] vi: companion voice only where natural; legal meaning exact. Unit test: both pages exist, have en and vi, and
  carry the required topics; the links are present.

## Test Evidence

**Status**: [x] `tests/legal.test.ts` (3 tests: required topics in en and vi on both pages); e2e: Settings → Privacy
opens `/privacy.html#<lang>` at phone width (en + vi). Screens: `production/qa/evidence/story-031-privacy-terms/`.

## Completion Notes (2026-11-13)

- `public/privacy.html`, `public/terms.html` (static, precached by the service worker, so they open offline).
- The vi pages use "bạn" and "chúng tôi": a legal page is the game speaking, not the companion; the companion voice
  stays in the game screens. The 025b "no bạn" rule covers the in-game string table only.
- **OWNER:** replace OWNER-EMAIL in both pages; have the pages reviewed (a lawyer if you can) before a public launch.
- **OWNER:** the pages name Vercel, Supabase and Anthropic as processors; update if you change providers.
