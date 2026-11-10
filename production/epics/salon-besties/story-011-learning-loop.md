# Story 011: Learning loop

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (awaiting owner review)
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

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

- [x] **Whispered corrections (optional):** right after a player line with a mistake, the bestie whispers "You said… → Better: …"; the client never sees it. A setting turns whispers on or off, and there is at most one whisper per player line and a cap per appointment (in config), so it never feels like nagging.
- [x] **Debrief English review:** after each appointment, the bestie's debrief lists the player's lines worth improving — what they said, a better version, and a one-line reason — with the reason in Vietnamese when Vietnamese mode is on.
- [x] **Vietnamese recap:** after each appointment, a short recap in Vietnamese of how it went and three better English lines to try next time.
- [x] **Phrasebook:** salon phrases the player used well, or was shown in corrections and the recap, are saved with their Vietnamese meaning and a topic (greeting, consultation, price, booking, problems). The player can browse it any time; no duplicates; saved on the device.
- [x] **Level auto-adjust:** after a set number of appointments (config, e.g. 3), recent English scores decide. **Up** is automatic, with a small celebration and a line in Vietnamese and English saying why; the player can switch back in settings. **Down** is never automatic: the game suggests it, kindly, and the player accepts or declines.
- [x] Corrections are kind and specific: they praise what worked before correcting, never mock, and never comment on the player's accent or background.
- [x] Mistakes affect learning, not the appointment: at Beginner and Some, corrections are the only place grammar is addressed (story 010's mood rules stay in force).
- [x] All AI calls go through server functions; phrasebook and progress are saved locally and survive closing the app.

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
- also: `src/game/learning/corrections.ts`, `src/game/config/learning.json`, `src/game/ui/recap-screen.css`, wiring in `main.ts`, `chat-panel.ts`, `bestie-panel.ts`, `results-screen.ts`, `title-screen.ts`, `settings-screen.ts`, `settings.ts`, i18n tables, `scripts/smoke-api.mjs`

## Completion Notes (2026-11-10)

- **Whispers**: after each player line (not Help me say it lines, not one-word lines), `api/corrections.ts` (`kind: line`, Haiku 5.5) decides whether a correction is worth it at the player's level (Beginner: only meaning or politeness). A correction rides on Mai's whisper channel from story 003: praise first, "You said… → Better: …", one reason. At most one per line and 3 per appointment (`config/learning.json`); the check runs in the background and never blocks the chat. Settings switch, on by default.
- **Review + recap**: one extra call after the appointment (`kind: review`) returns the lines worth improving (reason in Vietnamese in Vietnamese mode), a recap always in Vietnamese, 3 lines to try and the phrases used well. *Deviation from the implementation note:* this is a separate call, not folded into story 002's grading, so the grading call that already passes the real-API checks stays untouched.
- **Phrasebook**: `salon.phrasebook.v1`. Entries come from shown whisper corrections, review better lines, lines to try and phrases used well, each with Vietnamese and a topic (greeting / consultation / price / booking / problems). Deduplicated ignoring case and punctuation, capped at 300 (oldest drop off). Opened from the title menu.
- **Level auto-adjust**: `autoAdjust` in `english-levels.json` (window 3, up at an average of 80 or more, suggest down below 45). Up is automatic, with 🎉, the reason in Vietnamese and English, and "switch back in Settings". Down is only a suggestion with Accept / Decline; either answer starts a fresh window. Never up from Fluent, never down from Beginner.
- **Mood rules unchanged**: corrections never touch the client call or the mood.
- **Owner questions**: (1) should whispers default on? (2) are the thresholds (3 clients, 80 / 45) and the cap of 3 whispers per client right? (3) a line check costs one small AI call per player line.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/learning-loop.test.ts` (waived as advisory at `qa.level: minimal`) plus retained screenshots of a whisper, the debrief review, the Vietnamese recap, the phrasebook and a level change in `production/qa/evidence/`.

**Status**: [x] `src/tests/learning-loop.test.ts` (22 tests) + `production/qa/evidence/story-011-learning-loop/` (32 screenshots + README)

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-002-scoring-and-results.md`, `production/epics/salon-besties/story-010-english-in-the-chair.md`, `production/epics/salon-besties/story-003-signature-bestie.md`
- Unlocks: `production/epics/salon-besties/story-004-voice-in-and-out.md`

## Owner Decisions (2026-11-10, relayed by the overseer)

- Whispered corrections stay **on by default**.
- Keep the auto-adjust thresholds: **3 clients, up at 80 or more, suggest down below 45** (`english-levels.json`).
- Keep the cap of **3 whispers per client** (`learning.json`).
- Cost: one Haiku line check per player line, a few hundredths of a cent each (overseer's estimate). Accepted.
- Vietnamese wording approved. Status stays open until the owner's phone playtest.

## Owner Decision: Mai on demand (2026-11-10, relayed by the overseer)

"I want Mai as an available assistant, not a person who fixes the problem every time. Mai should be a 'bubble' available when needed."
- Built: a round Mai bubble (`src/game/ui/mai-bubble.ts`) in the fixed portrait strip, draggable to either corner (saved). It never covers the newest line or the reply box. The old corner portrait is hidden in the chat.
- Nothing pops up by itself. Live corrections are still checked in the background with the same cap (3 per appointment) but are **queued** (`src/game/mai-tips.ts`); the bubble shows a badge. Tapping Mai opens a small panel over the top strip: "Give me a hint", "Help me say it" and her waiting tips (You said → Better + reason). It closes by tap-outside, Escape or Close. A tip's better line goes into the phrasebook when it is seen.
- The separate Hint button and the auto-opening whisper are removed. The Settings switches stay (hints off = no hint button in the panel; corrections off = no badge).
- Results: Mai's debrief and her question sit behind one collapsed card, "Mai has notes for you". The English review, recap and phrasebook are unchanged.
- Mood rules unchanged; nothing from Mai reaches the client call.
- Her look is a swappable mascot skin (`src/game/mascot/`, `config/mascot.json`, accessory slots as data); placeholder until the owner picks a concept.
- Evidence: `production/qa/evidence/mai-bubble/`. Tests: `src/tests/mai-bubble.test.ts`.
