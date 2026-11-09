# Story 003: Signature bestie

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 4`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] One signature bestie character (name, personality, look) greets the player and is present in the salon.
- [ ] During an appointment the player can tap for a whispered hint; the client does not see it, and hints can be turned off.
- [ ] After every appointment the bestie gives a short debrief built on the scorecard: one thing done well, one thing to try next time.
- [ ] The bestie remembers past sessions on this device (weak skills, wins, details the player shared) and refers back to them in later debriefs.
- [ ] The bestie has its own level that rises as the player plays.
- [ ] Sometimes (not every session) the bestie asks the player how they'd handle a situation, and responds to the player's answer.
- [ ] All bestie AI calls go through a server function; memory is saved locally and survives closing the app.

---

## Implementation Notes

- Memory: a compact summary stored in local storage, sent with each bestie call; refresh the summary after each debrief instead of storing whole transcripts.
- Bestie customization (paid or not) is out of scope for v1 per the brief.

---

## Out of Scope

- Story 004: the bestie speaking aloud.
- Story 011: English corrections (whispers after a mistake, the debrief's English review), the Vietnamese recap, the phrasebook and level auto-adjust — this story builds the bestie those ride on.
- Bestie coaching in Vietnamese follows the full Vietnamese mode from story 010.

---

## Files

- `src/api/bestie.ts`
- `src/game/bestie.ts`
- `src/game/bestie-memory.ts`
- `src/game/ui/bestie-panel.ts`
- `src/tests/bestie.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/bestie.test.ts` (waived as advisory at `qa.level: minimal`) plus retained screenshots of a hint and a debrief in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-002-scoring-and-results.md`
- Unlocks: `production/epics/salon-besties/story-011-learning-loop.md`
