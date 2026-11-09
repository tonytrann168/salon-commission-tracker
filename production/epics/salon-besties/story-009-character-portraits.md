# Story 009: Character portraits & mood expressions

> **Epic**: Salon Besties (MVP)
> **Status**: In Progress
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-09

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 1` and `Brief MVP feature 4` (client and bestie), plus the brief's Art & audio direction ("very expressive faces — moods readable at a glance"). Added at the owner's request.

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] The client's portrait is shown on the appointment screen, readable at phone size, without crowding or shifting the chat.
- [ ] The bestie has a placeholder portrait in the same style, shown on the title screen and in a corner of the salon, ready for story 003 to use.
- [ ] Each character has at least five expressions — furious, annoyed, neutral, pleased, delighted — plus a "walking out" pose; the mood ranges that select each expression live in a config file.
- [ ] The expression updates as soon as the mood crosses into a new range, with a short, snappy transition.
- [ ] Mood is readable from face shape (brows, mouth, eyes), not from color alone.
- [ ] Placeholder art first: simple, cute 2D faces drawn in code (PixiJS Graphics), no image files required.
- [ ] Art is swappable: each character points to a portrait definition, so final art (images or Rive faces) can replace the placeholders without changing game code.
- [ ] Portraits keep the appointment screen at the 60 fps target on a mid-range phone.

---

## Implementation Notes

- Expression = f(mood band); bands in `src/game/config/expressions.json`. The walk-out pose is driven by the appointment's `walked_out` outcome, not by a band.
- A portrait definition maps each expression to a renderer; the placeholder renderer draws with PixiJS Graphics. Keep the mapping data-driven so story 006's client data files can name a portrait.
- Style per the brief: cute, stylish 2D, pastel salon palette.

---

## Out of Scope

- Final illustrated or animated (Rive) art — later art pass.
- Story 003: bestie behaviour (hints, debrief, memory); this story only supplies the bestie's portrait.
- Story 006: a portrait for every roster client; this story covers the default client and the bestie.

---

## Files

- `src/game/config/expressions.json`
- `src/game/portraits/portrait.ts`
- `src/game/portraits/placeholder-faces.ts`
- `src/game/portraits/definitions.ts`
- `src/game/ui/portrait-zone.ts`
- `src/game/ui/chat-panel.ts`
- `src/game/ui/chat-panel.css`
- `src/game/ui/strings.ts`
- `src/game/title-screen.ts`
- `src/game/salon-scene.ts`
- `src/game/types.ts`
- `src/game/clients/default-client.ts`
- `src/main.ts`

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Visual/Feel
**Required evidence**: a retained screenshot of every expression in `production/qa/evidence/story-009-character-portraits/` + sign-off in `production/qa/evidence/story-009-character-portraits-evidence.md`

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`
- Unlocks: `production/epics/salon-besties/story-003-signature-bestie.md` (bestie portrait available)
