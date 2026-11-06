# Story 005: Nail art station

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 3`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] During the service phase the player works on the client's hand in a nail art station drawn with PixiJS.
- [ ] Tools: nail shape, base color, polish application, gradients, gems and stickers, all usable by touch.
- [ ] The chat stays usable while the station is open, so the player talks and works at the same time.
- [ ] The client states what they want during consultation; when the player finishes, the result is compared to that request.
- [ ] The match affects the client's mood and the stars, and the client comments on the nails in the review.
- [ ] The station runs smoothly (target 60 fps) on a mid-range phone.

---

## Implementation Notes

- Represent the design as data (shape, colors, layers) so it can be compared to the request and saved.
- Art is cute stylish 2D per the brief; placeholder art is fine until an art pass.

---

## Out of Scope

- Hair services (out of v1 scope).
- Sharing designs (leaderboards and sharing are out of v1 scope).

---

## Files

- `src/game/nail-art/station.ts`
- `src/game/nail-art/design.ts`
- `src/game/nail-art/match.ts`
- `src/tests/nail-art-match.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Visual/Feel
**Required evidence**: a retained screenshot in `production/qa/evidence/` + sign-off in `production/qa/evidence/nail-art-station-evidence.md`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-002-scoring-and-results.md`
- Unlocks: None
