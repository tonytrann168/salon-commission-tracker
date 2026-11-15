# Story 045: Client speech speed

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: some players need the client to talk slower; others want her faster.

## Acceptance Criteria

- [x] Settings → **Client's speech speed / Tốc độ nói của khách**: Slow / Normal (default) / Fast, three big buttons,
  remembered.
- [x] It applies to the Azure voice (the SSML prosody rate, sent as `speed` and checked by the server), the browser
  voice (the utterance rate), the phrase-practice "listen" button, and how fast her text appears in the chat.
  Factors in `config/voice.json` (`speechSpeed`: 0.8 / 1 / 1.2), on top of the level's pace and her mood.
- [x] Overseer follow-ups on 044: an 18th `smoke:api` check (with a numbered menu, asked what she wants, she names a
  number that is on the menu; real AI only, the overseer runs it). Prices never change mood, stars or tips; a
  price-sensitive client (client data: Brenda, Tom) may say once, kindly, that a total over $45 is "a bit pricey"
  (`pricey.over` in `config/menu.json`), with no mood change.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/voices.test.ts` (Azure rate slower / faster, a bad speed refused, the browser rate, the setting),
  `tests/menu.test.ts` (the pricey remark only for a price-sensitive client over the line). Watched failing first.
- e2e (en + vi): her words take longer to appear on Slow than on Fast; the Settings choice is remembered.
- Screens at 320 px: `production/qa/evidence/story-045/`.
