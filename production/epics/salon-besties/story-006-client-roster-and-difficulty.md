# Story 006: Client roster & difficulty

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Feature
> **Type**: Config/Data
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 2`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] About 9 clients are defined as data files: name, look, personality, what they want, mood start and sensitivity, difficulty.
- [ ] Three per difficulty: easy, medium, hard.
- [ ] The hard-client types from the brief are all covered: picky / changes mind, rude / impatient, complaints & redos, price & booking issues.
- [ ] Tone is realistic but clean: clients can be rude or cold, never use slurs, harassment or explicit content.
- [ ] A client picker lets the player choose a difficulty, then a client (or random), or start a shift of several clients back to back.
- [ ] Adding a new client needs only a new data file, no code change.

---

## Implementation Notes

- Persona data feeds the client system prompt from story 001; difficulty sets mood start, mood sensitivity and how much the client pushes back.

---

## Out of Scope

- Story 007: unlocking harder clients through progression, and the daily challenge client.

---

## Files

- `src/game/clients/*.json`
- `src/game/clients/roster.ts`
- `src/game/ui/client-picker.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Config/Data
**Required evidence**: smoke check pass (`production/qa/smoke-*.md`) plus a retained screenshot of the client picker in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`
- Unlocks: `production/epics/salon-besties/story-007-progression-and-daily-hooks.md`
