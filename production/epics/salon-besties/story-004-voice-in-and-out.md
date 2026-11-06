# Story 004: Voice in and out

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 1` (voice half; split from story 001 to follow the brief's Build order)

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] The player can hold (or tap) a mic button to speak to the client; their speech is turned into text and shown in the chat.
- [ ] Client replies are spoken aloud in a voice that fits the client, and still shown as text.
- [ ] The client starts speaking within about 2 seconds of the player finishing (streamed speech).
- [ ] The player can switch between voice and typing at any point in an appointment.
- [ ] If the mic is blocked or the voice service fails, the game falls back to typing with a clear message.
- [ ] Voice keys stay on the server; the browser never sees them.

---

## Implementation Notes

- Mic access needs a user gesture on phones; ask for permission the first time the mic button is pressed.
- Voice provider is chosen in this story; measure real cost per appointment and record it in the story when done.

---

## Out of Scope

- Story 008: Vietnamese voices.

---

## Files

- `src/api/speech-to-text.ts`
- `src/api/text-to-speech.ts`
- `src/game/voice.ts`
- `src/game/ui/mic-button.ts`
- `src/tests/voice.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/voice.test.ts` (waived as advisory at `qa.level: minimal`) plus a playtest note on a real phone in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`
- Unlocks: None
