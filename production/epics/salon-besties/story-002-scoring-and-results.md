# Story 002: Scoring & results

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 5`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] Every finished appointment (checkout or walk-out) produces a result: 1–5 stars, a tip amount and a short written review in the client's voice.
- [ ] Stars and tip are calculated by game code from the final mood and the scorecard, so the same inputs always give the same result.
- [ ] A scorecard rates five skills — greeting, consultation, upsell, rebooking, problem handling — each 0–100, from the transcript.
- [ ] A walk-out always gives 1 star and no tip; a 5-star result needs high final mood and no skill below a set floor.
- [ ] The result marks the brief's goal (5 stars + good tip + rebooking) and fail (walk-out, 1–2 stars, redo demand) outcomes.
- [ ] A results screen shows stars, tip, review and scorecard, and offers "next client" or "back to menu".
- [ ] The scoring formulas live in one config file so they can be tuned without code changes.

---

## Implementation Notes

- Claude grades the transcript into the five skill scores (structured output); game code turns scores + mood into stars and tip.
- Keep the formula pure and unit-tested; the AI grading call is mocked in tests.

---

## Out of Scope

- Story 003: the bestie's spoken debrief of the scorecard.
- Story 007: spending tips, ranks and badges.

---

## Files

- `src/game/scoring.ts`
- `src/game/config/scoring.json`
- `src/api/grade-appointment.ts`
- `src/game/ui/results-screen.ts`
- `src/tests/scoring.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**: `src/tests/scoring.test.ts` (waived as advisory at `qa.level: minimal`) plus a retained screenshot of the results screen in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`
- Unlocks: `production/epics/salon-besties/story-003-signature-bestie.md`, `production/epics/salon-besties/story-007-progression-and-daily-hooks.md`
