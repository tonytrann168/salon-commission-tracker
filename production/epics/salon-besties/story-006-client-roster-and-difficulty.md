# Story 006: Client roster & difficulty

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Config/Data
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

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

- [x] About 9 clients are defined as data files: name, look, personality, what they want, mood start and sensitivity, difficulty.
- [x] Three per difficulty: easy, medium, hard.
- [x] The hard-client types from the brief are all covered: picky / changes mind, rude / impatient, complaints & redos, price & booking issues.
- [x] Tone is realistic but clean: clients can be rude or cold, never use slurs, harassment or explicit content.
- [x] A client picker lets the player choose a difficulty, then a client (or random), or start a shift of several clients back to back.
- [x] Adding a new client needs only a new data file, no code change.

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

**Status**: [x] `production/qa/evidence/story-006-client-roster/` (picker, shift, results; en and vi). smoke:api not run here (no key).

---

## Completion Notes (2026-11-10)

- **Clients** (`game/clients/*.json`, loaded with `import.meta.glob`, so a new client is just a new file): Easy: Grace, Mia, Rosa. Medium: Dana (the default), Priya (picky, changes her mind), Kim (price and booking). Hard: Victoria (rude, impatient), Brenda (complaints and redos), Tom (price and booking + rude). Each has a look, wants, personality, starting mood, mood sensitivity, opening line, nail request, and an en/vi picker line. Files are checked at load ("clients/x.json: problem").
- **Difficulty**: `config/difficulty.json` gives the push-back line put in the client's prompt. Mood sensitivity multiplies mood changes (Victoria: drops ×1.4, rises ×0.8).
- **Tone**: the shared client prompt (every client) says "cold, picky or impatient when it fits, but never slurs, harassment or explicit content, even if the player does". The hard personas are written rude-but-clean.
- **Server**: `client-turn` and `grade-appointment` take an optional `clientId` (Dana when missing; unknown → 400).
- **Picker**: difficulty tabs (remembered), client cards, Random, Start a shift (3 clients, no repeats). Results show "Next client (n/3)" then "Shift done!".
- **Faces**: placeholder portraits come from each client's look colours; `look.hairStyle: "short"` gives a short-hair face with no bow (Tom). Tom also gets a male voice preference.
- **Owner to check**: the names and personalities, shift size 3, and the sensitivity numbers.

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`
- Unlocks: `production/epics/salon-besties/story-007-progression-and-daily-hooks.md`
