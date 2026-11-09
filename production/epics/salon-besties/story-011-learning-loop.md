# Story 011: Learning loop

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 4` (signature bestie & learning loop). Added 2026-11-09 in the educational-first redesign.

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] **Whispered corrections (optional):** right after a player line with a mistake, the bestie whispers "You said… → Better: …"; the client never sees it. A setting turns whispers on or off, and there is at most one whisper per player line and a cap per appointment (in config), so it never feels like nagging.
- [ ] **Debrief English review:** after each appointment, the bestie's debrief lists the player's lines worth improving — what they said, a better version, and a one-line reason — with the reason in Vietnamese when Vietnamese mode is on.
- [ ] **Vietnamese recap:** after each appointment, a short recap in Vietnamese of how it went and three better English lines to try next time.
- [ ] **Phrasebook:** salon phrases the player used well, or was shown in corrections and the recap, are saved with their Vietnamese meaning and a topic (greeting, consultation, price, booking, problems). The player can browse it any time; no duplicates; saved on the device.
- [ ] **Level auto-adjust:** after a set number of appointments (config, e.g. 3), the game moves the player's level up or down based on their recent English scores, tells them why in Vietnamese and English, and lets them switch back in settings.
- [ ] Corrections are kind and specific: they praise what worked before correcting, never mock, and never comment on the player's accent or background.
- [ ] Mistakes affect learning, not the appointment: at Beginner and Some, corrections are the only place grammar is addressed (story 010's mood rules stay in force).
- [ ] All AI calls go through server functions; phrasebook and progress are saved locally and survive closing the app.

---

## Implementation Notes

- One grading pass after each appointment (story 002's) can also return the corrections and recap lines, to keep AI calls and cost down; whispers need a small per-line check during the appointment.
- Whispers ride on the bestie's whisper channel from story 003.
- Auto-adjust thresholds and window size live in `src/game/config/english-levels.json` (story 010).

---

## Out of Scope

- Story 004: saying phrasebook lines aloud (pronunciation practice).
- Spaced-repetition review or quizzes on the phrasebook (later).
- Story 008: menus and buttons in Vietnamese.

---

## Files

- `src/api/corrections.ts`
- `src/game/learning/corrections.ts`
- `src/game/learning/phrasebook.ts`
- `src/game/learning/level-adjust.ts`
- `src/game/ui/recap-screen.ts`
- `src/game/ui/phrasebook-screen.ts`
- `src/game/config/english-levels.json`
- `src/tests/learning-loop.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/learning-loop.test.ts` (waived as advisory at `qa.level: minimal`) plus retained screenshots of a whisper, the debrief review, the Vietnamese recap, the phrasebook and a level change in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-002-scoring-and-results.md`, `production/epics/salon-besties/story-010-english-in-the-chair.md`, `production/epics/salon-besties/story-003-signature-bestie.md`
- Unlocks: `production/epics/salon-besties/story-004-voice-in-and-out.md`
