# Story 003: Signature bestie

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (awaiting owner review)
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

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

- [x] One signature bestie character (name, personality, look) greets the player and is present in the salon.
- [x] During an appointment the player can tap for a whispered hint; the client does not see it, and hints can be turned off.
- [x] After every appointment the bestie gives a short debrief built on the scorecard: one thing done well, one thing to try next time.
- [x] The bestie remembers past sessions on this device (weak skills, wins, details the player shared) and refers back to them in later debriefs.
- [x] The bestie has its own level that rises as the player plays.
- [x] Sometimes (not every session) the bestie asks the player how they'd handle a situation, and responds to the player's answer.
- [x] All bestie AI calls go through a server function; memory is saved locally and survives closing the app.

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
- also: `src/game/config/bestie.json`, `src/game/ui/bestie-panel.css`, wiring in `main.ts`, `chat-panel.ts`, `results-screen.ts`, `title-screen.ts`, `settings-screen.ts`, `settings.ts`, i18n tables, `scripts/smoke-api.mjs`

## Completion Notes (2026-11-10)

- **Mai** (placeholder name, config): a warm senior tech who learned English on the job. Name, persona, level XP, XP per outcome and the question rule are all in `config/bestie.json`. Look: the existing purple-haired placeholder face (story 009).
- **Greeting**: on the title screen, first hello or "welcome back, client number N" from saved memory. Fixed text from the string tables, no AI call.
- **Hint**: a Hint button under the portraits. Tapping it whispers one next step plus one example English line. It isn't in the transcript and never reaches the client call. It can be turned off in Settings (on by default).
- **Debrief**: on the results screen after grading. One thing done well and one to try next time, built on the scorecard and the conversation, referring back to memory. If it fails, a friendly message with Try again; the results stay.
- **Memory**: `salon.bestie.v1` in local storage holds a summary of at most 800 characters (rewritten by each debrief/answer, no transcripts), the session count, XP and when she last asked a question.
- **Bestie level**: XP 10 per completed appointment, 5 per walk-out, 5 per answered question. Levels at 0/30/80/150/250/400 XP, with a small celebration note.
- **Question**: never on the first appointment, never two in a row, otherwise a 40% chance. Her reply refreshes memory, so details the player shares are remembered.
- **Language**: Mai coaches in Vietnamese in full Vietnamese mode (example lines stay English), otherwise in simple English matched to the level.
- **Server**: `api/bestie.ts`, one endpoint with `kind: hint | debrief | answer`, Haiku 5.5 with a forced tool (same pattern as translate), strict input and output checks. `smoke:api` has 3 new checks (7 total).
- **Owner questions**: (1) the name "Mai" and her persona; (2) whether hints should default on; (3) the session count only advances when the debrief succeeds, so with no API key she always gives the first-time greeting.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/bestie.test.ts` (waived as advisory at `qa.level: minimal`) plus retained screenshots of a hint and a debrief in `production/qa/evidence/`.

**Status**: [x] `src/tests/bestie.test.ts` (15 tests) + `production/qa/evidence/story-003-signature-bestie/` (24 screenshots + README)

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-002-scoring-and-results.md`
- Unlocks: `production/epics/salon-besties/story-011-learning-loop.md`
