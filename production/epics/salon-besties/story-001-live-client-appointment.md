# Story 001: Live client appointment (text)

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Core
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 1` (text half; voice is story 004)

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] The player can start an appointment with one client from the title screen.
- [ ] The client is played by Claude through a server function; no API key ever reaches the browser.
- [ ] The appointment runs through phases: consultation → service → checkout, and the player can see which phase they are in.
- [ ] The player types messages on a phone keyboard and the client replies in character within a few seconds (streamed, with a typing indicator).
- [ ] A live mood meter (0–100) is shown and changes after each exchange, based on what the player said.
- [ ] If the mood hits 0, the client walks out and the appointment ends as a fail (brief fail state).
- [ ] When checkout completes, the appointment ends and hands its transcript and mood history to the results step (story 002).
- [ ] A failed or slow AI call shows a friendly retry message instead of breaking the appointment.

---

## Implementation Notes

- Server: a Vercel serverless function under `src/api/` calls Claude; the client persona and phase rules go in the system prompt, cached.
- The model returns a structured reply (client line + mood delta + phase) so the game logic, not free text, drives the mood meter.
- Chat and meter are DOM/CSS over the PixiJS salon scene; the salon art can be placeholder.
- One hard-coded medium-difficulty client is enough here; the roster is story 006.

---

## Out of Scope

- Story 002: stars, tip, review and scorecard.
- Story 003: bestie hints and debrief.
- Story 004: voice.
- Story 005: the nail art work itself (service phase is conversation only here).
- Story 006: more clients and difficulty picking.

---

## Files

- `src/api/client-turn.ts`
- `src/game/appointment.ts`
- `src/game/mood.ts`
- `src/game/ui/chat-panel.ts`
- `src/tests/appointment.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/appointment.test.ts` (tests waived as advisory at `qa.level: minimal`) plus a retained screenshot of the appointment screen in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/salon-besties/story-002-scoring-and-results.md`, `production/epics/salon-besties/story-003-signature-bestie.md`, `production/epics/salon-besties/story-004-voice-in-and-out.md`
