# Story 010: English in the chair

> **Epic**: Salon Besties (MVP)
> **Status**: In Progress
> **Layer**: Core
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-09

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 2` (English level and client adaptation) and `Brief MVP feature 3` (Vietnamese help in the conversation). Added 2026-11-09 in the educational-first redesign.

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] Before the first appointment the player picks an English level — Beginner, Some, Comfortable or Fluent — each explained in one short line in Vietnamese and English. The choice is saved on the device and can be changed later in settings.
- [ ] Clients speak at the player's level: Beginner gets short, slow, simple sentences with common salon words and one question at a time; Fluent gets natural speed, slang and idioms; Some and Comfortable sit between. The rules for each level live in a config file.
- [ ] At Beginner and Some, the client's mood never changes because of grammar, vocabulary or spelling — only because of how the player treats her (listening, respect, honesty about time and price, rudeness). Polite but broken English never lowers her mood or causes a walk-out.
- [ ] At Comfortable and Fluent, the client reacts realistically when the player's English is unclear: she may ask again, and her mood may dip.
- [ ] **Tap to translate:** tapping any client line shows its Vietnamese translation under it; tapping again hides it. A line already translated shows instantly on the next tap, with no new AI call.
- [ ] **Help me say it:** the player types in Vietnamese and sees the English. To send, they must re-type the English themselves; Send stays off until their typing matches, allowing for capital letters, punctuation and small typos (tolerance in config). The sent line counts as the player's own. Using Help me say it never lowers the client's mood.
- [ ] *(Added 2026-11-09 at the owner's request.)* At **Beginner**, Help me say it offers **word tiles** instead of re-typing: the English words appear shuffled, and the player taps them in the right order to build and send the line. At Some and above, the player re-types.
- [ ] **Full Vietnamese mode:** a setting that shows every client line with its Vietnamese translation side by side, automatically. The same setting is the language the bestie (story 003) and the recap (story 011) will use.
- [ ] Vietnamese with all its diacritics can be typed on a phone's Vietnamese keyboard in Help me say it, and displays correctly in translations.
- [ ] All translation goes through a server function; the API key never reaches the browser. A failed translation shows a friendly retry and never breaks the appointment.

---

## Implementation Notes

- This changes story 001's client prompt (`src/api/client-turn.ts`): the player's level goes in with each turn, with that level's speaking rules and mood rules. Story 001 is still open (waiting on a real-API check), so re-check its criteria when it is closed.
- Translations: the default client's own lines are fixed text and can be translated once and cached; live replies are translated on demand and cached per line for the appointment.
- Word tiles: split the English line into word tiles in game code; shuffle with a seeded order so tests are repeatable; punctuation rides on its word.
- Matching for Help me say it is done in game code (normalised text plus an edit-distance tolerance from config), not by the AI.
- The level is an input story 002's English score already reads (it used a default until now).

---

## Out of Scope

- Story 011: corrections (whispers and the debrief's English review), the Vietnamese recap, the phrasebook and level auto-adjust.
- Story 008: menus and buttons in Vietnamese.
- Story 004: speaking and pronunciation; Vietnamese speech.

---

## Files

- `src/api/translate.ts`
- `src/api/client-turn.ts`
- `src/vite.config.ts`
- `src/main.ts`
- `src/game/appointment.ts`
- `src/game/client-turn-transport.ts`
- `src/game/translate-transport.ts`
- `src/game/translation-cache.ts`
- `src/game/safe-storage.ts`
- `src/game/settings.ts`
- `src/game/english-level.ts`
- `src/game/config/english-levels.json`
- `src/game/types.ts`
- `src/game/title-screen.ts`
- `src/game/ui/dom.ts`
- `src/game/ui/level-picker.ts`
- `src/game/ui/level-picker.css`
- `src/game/ui/settings-screen.ts`
- `src/game/ui/help-me-say-it.ts`
- `src/game/ui/help-me-say-it.css`
- `src/game/ui/chat-panel.ts`
- `src/game/ui/chat-panel.css`
- `src/game/ui/strings.ts`
- `src/tests/english-level.test.ts`

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/english-level.test.ts` (waived as advisory at `qa.level: minimal`) plus retained screenshots of the level picker, a translated line, Help me say it, and full Vietnamese mode in `production/qa/evidence/`. A real-API playtest at Beginner with deliberately broken but polite English, showing no mood loss.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-002-scoring-and-results.md`
- Unlocks: `production/epics/salon-besties/story-008-english-and-vietnamese.md`, `production/epics/salon-besties/story-003-signature-bestie.md`, `production/epics/salon-besties/story-011-learning-loop.md`
