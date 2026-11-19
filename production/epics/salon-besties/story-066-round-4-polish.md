# Story 066: Round-4 polish

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-19

## Context

Three fixes the overseer queued after the round-4 review.

## Acceptance Criteria

- [x] **📋 then 📷** in the mood row for picture clients. Both show in consultation and checkout (the menu hides
  during the service, as for every client); nothing overlaps at 320 px.
  - Note: 📋 was already present for picture clients in consultation. The overseer's vi-03 shot was the finished
    results, where the menu is hidden for everyone. The order is now 📋 then 📷, as asked.
- [x] **The same framing for "Her picture vs your work"**:
  - Your work is drawn by the same off-screen renderer as her picture (same hand pose and size), with her picture's
    crop.
  - Root cause: the crop wrapped everything drawn, so polish spilled on the skin widened it and shrank the hand
    (31 px taller in the test).
- [x] **No "+0 coins"**: the results card shows the coins tile only when the visit earned coins; otherwise three
  tiles fill the row.

## Tests

All in `game-flows.spec.ts`, en + vi, each watched failing on the old code first:

- "her picture":
  - 📋 is right before 📷, nothing overlaps, and everything fits within 320 px
  - with a painted, spilled set, both pictures are the same size (±2 px); the old code gave 31 px apart
- "results count up": a visit with no coins earned has no coins tile and three tiles.

## Evidence

`production/qa/evidence/story-066/`, en + vi at 320×568, 2× DPR:

1. 📋 and 📷 in the mood row
2. the rewards card with three tiles
3. her picture vs your work at the same framing
