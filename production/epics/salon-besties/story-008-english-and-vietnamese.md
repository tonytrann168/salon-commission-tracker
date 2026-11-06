# Story 008: English + Vietnamese

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 7`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] A language setting switches all UI text between English and Vietnamese, and is remembered.
- [ ] The bestie's hints and debriefs follow the language setting.
- [ ] Clients speak English by default; a separate setting lets clients speak Vietnamese.
- [ ] Vietnamese text (including all diacritics) displays correctly everywhere and can be typed with a phone's Vietnamese keyboard.
- [ ] Voice works in both languages when voice is on.
- [ ] No hard-coded UI strings remain outside the string tables.

---

## Implementation Notes

- Put all UI strings in `src/game/i18n/en.json` and `vi.json`; pass the language to every AI prompt.

---

## Out of Scope

- Other languages (later).

---

## Files

- `src/game/i18n/en.json`
- `src/game/i18n/vi.json`
- `src/game/i18n/index.ts`
- `src/game/ui/settings-screen.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: UI
**Required evidence**: a retained screenshot of each screen touched, in both languages, in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-003-signature-bestie.md`
- Unlocks: None
