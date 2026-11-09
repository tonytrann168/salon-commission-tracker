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
- [ ] *(Added 2026-11-09, educational-first redesign.)* **Pronunciation practice:** the player can practise any line — a better line from the recap, a phrasebook phrase, or their own last line — by saying it aloud; the game shows which words it heard as said clearly and which it did not, and lets them try again.
- [ ] Client voices follow the player's English level (slower, clearer speech at Beginner; natural speed at Fluent).

---

## Implementation Notes

- Mic access needs a user gesture on phones; ask for permission the first time the mic button is pressed.
- Voice provider is chosen in this story; measure real cost per appointment and record it in the story when done.
- Pronunciation: plain speech-to-text can only say which words it recognised, not how well each sound was made. Owner decision (2026-11-09): build the free word-level check first; add a paid pronunciation-assessment service only if playtests ask for it. Record the cost per appointment.

---

## Out of Scope

- Vietnamese voices: the Vietnamese help in story 010 is shown as text; Vietnamese speech is later.

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

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-010-english-in-the-chair.md`, `production/epics/salon-besties/story-011-learning-loop.md` (pronunciation practice uses the recap and phrasebook)
- Unlocks: None
