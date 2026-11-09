# Story 002: Scoring & results

> **Epic**: Salon Besties (MVP)
> **Status**: Complete
> **Layer**: Core
> **Type**: Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-09

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
- [ ] *(Added 2026-11-09, educational-first redesign.)* The scorecard adds an **English score** with three parts — clarity, politeness, grammar/vocabulary — each 0–100, graded from the player's own lines only (never the client's), and graded against what is expected at the player's English level.
- [ ] The English score's weight in stars and tip depends on the player's level (Beginner / Some / Comfortable / Fluent), set in the scoring config: at Beginner and Some, grammar/vocabulary can never cost a star (it counts only toward the English score itself); at Comfortable and Fluent it counts toward stars like the other skills.
- [ ] The results screen shows the English score with its three parts, in plain words a Beginner can follow.

---

## Implementation Notes

- Claude grades the transcript into the five skill scores (structured output); game code turns scores + mood into stars and tip.
- Keep the formula pure and unit-tested; the AI grading call is mocked in tests.
- The player's English level is an input to grading and weighting. Story 010 adds the level picker; until then, use a default level from config (Some) so this story is buildable and testable on its own.
- English grading uses the same grading call as the five skills (one structured output), with the level and its expectations in the prompt.

---

## Out of Scope

- Story 003: the bestie's spoken debrief of the scorecard.
- Story 007: spending tips, ranks and badges.
- Story 010: the English level picker and client adaptation.
- Story 011: line-by-line corrections, the Vietnamese recap, the phrasebook and level auto-adjust.

---

## Files

- `src/api/grade-appointment.ts`
- `src/game/grade-appointment-transport.ts`
- `src/game/scoring.ts`
- `src/game/config/scoring.json`
- `src/game/ui/results-screen.ts`
- `src/game/ui/results-screen.css`
- `src/game/ui/chat-panel.ts`
- `src/game/ui/chat-panel.css`
- `src/game/ui/strings.ts`
- `src/game/types.ts`
- `src/main.ts`
- `src/vite.config.ts`
- `src/tests/scoring.test.ts`

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
- Unlocks: `production/epics/salon-besties/story-010-english-in-the-chair.md`, `production/epics/salon-besties/story-003-signature-bestie.md`, `production/epics/salon-besties/story-007-progression-and-daily-hooks.md`

---

## Completion Notes
**Completed**: 2026-11-09
**Criteria**: 10/10 passing or deferred (DEFERRED — requires playtest: AC-3 five skills graded from a real transcript; AC-8 English graded only from the player's lines at their level — both need a real API grading call)
**Deviations**: Depends on story 001, still In Progress (owner chose to build on it); grading starts from the chat panel's `onEnded` after the final line reveals, and the results screen replaces story 001's end box; dev middleware refactored into one route table, no `.catch` on unexpected handler errors; test file at `src/tests/` rather than `tests/unit/`. Out of scope: `src/api/` is not deployed yet (dev middleware only).
**Test Evidence**: `src/tests/scoring.test.ts` (waived at qa.level minimal); screenshots in `production/qa/evidence/story-002-scoring-and-results/`
**Reviewed by**: self, no independent review

## Calls beyond the design
- Grading model `claude-sonnet-5-5`; client replies stay on `claude-haiku-5-5` (`src/api/grade-appointment.ts`) · kept 2026-11-09
- Stars = 0.5 × mood + 0.5 × weighted skills; star lines 30/48/64/78; 5 stars needs mood ≥ 70 and every counted score ≥ 40; tip $2–$20 from 3 stars up; good tip ≥ $12 (`src/game/config/scoring.json`) · kept 2026-11-09
- English weights (clarity/politeness/grammar): Beginner 0.5/0.5/0, Some 0.75/0.75/0, Comfortable and Fluent 1/1/1 (`src/game/config/scoring.json`) · kept 2026-11-09
- A redo demand only marks a fail; goal and fail can both be true (`src/game/scoring.ts`) · kept 2026-11-09
- Screen wording and labels — "Dana is writing her review…", the five skill and three English labels, goal/fail lines (`src/game/ui/strings.ts`) · kept 2026-11-09
- *(Fixed 2026-11-09 after the owner's real-API check.)* The grading model rejects forced `tool_choice`, so grading now uses `tool_choice: auto` with a strict tool and a prompt line to call it, retries once when no valid tool call comes back, then shows the friendly error; `max_tokens` raised to 4000 for the model's thinking (`src/api/grade-appointment.ts`)
