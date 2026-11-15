# Story 050: Celebrate the finished set

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: the finished nails deserve a moment. Overseer follow-up on 052, done first here: half-painted polish
showed as a staircase of square cells, and the photo would show it.

## Acceptance Criteria

- [x] Smooth polish (overseer, first): the coverage grid is finer (12 × 20, was 6 × 10; spill margins scaled to
  match) and painted cells on the edge of the painted area are drawn as round dabs (inside cells stay cheap squares),
  clipped by the nail. Coverage and neatness logic unchanged. Spill smudge dabs widened to match.
  Re-measured (software WebGL, CPU 4×): first stroke run 0–7 long tasks (was 1–15 after 048), later runs 0;
  painting ~9.4 fps (was 6.5–8.6). 052's brush evidence re-shot.
- [x] At the final Done the hand is photographed (cropped to the fingers, a 360 px JPEG on the salon pink).
- [x] The results open with a big polaroid of her nails ("Ana's nails · Nov 15", hand-written style) before the
  stars, money and tip (the payment card starts 1.5 s later; `photoMs` in `config/payment.json`).
- [x] A celebration that fits the result: confetti for five stars, sparkles for four, a few hearts for three, and for a
  tough one no fuss, just "Every set is practice. The next one will shine." Off with reduced motion.
- [x] Badges and rank-ups now wait until the payment card is done (they used to cover it).
- [x] **My work / Tác phẩm của em** on the profile: the last 20 photos (newest first, `config/gallery.json`), each with
  its stars; tap for a big view with **Save to phone** (the phone's share sheet where it has one, so iPhones get "Save
  Image"; otherwise a download).

OWNER: photos stay on the phone only (not in backup codes or the account, they are too big). Say if they should go to
the account later (that needs storage in Supabase).

## Test Evidence

**Status**: [x] Created

- Unit: `tests/gallery.test.ts` (newest first, at most 20, a full phone drops the oldest, damaged data, config).
- e2e (en + vi): the polaroid with a JPEG photo above the payment card, a celebration class, My work with one photo,
  the big view, Save to phone downloads `salon-besties-….jpg`; the rank-up celebration still shows.
- Screens at 320 px: `production/qa/evidence/story-050/`; brush re-shot in `production/qa/evidence/story-052/`.
