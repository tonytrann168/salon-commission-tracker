# Story 023: Comfort & accessibility

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Foundation
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Acceptance Criteria

- [x] Settings → Comfort: **text size** in three steps (smaller, normal, larger) for the chat and the menus; **Reduce motion** (on when the phone asks for it; can be turned on here too); **Vibration** on Done and celebrations where the phone supports it; **High contrast** (darker text, stronger outlines).
- [x] Reduced motion is respected everywhere: CSS animations and transitions, the text reveal, the talking portraits, confetti.
- [x] Saved on the device and applied at start; works at 320 px in en and vi (larger text keeps the chat usable).
- [x] Unit tests for the saved settings and how they are applied.

## Test Evidence

**Status**: [x] `src/tests/comfort.test.ts` and `production/qa/evidence/story-023-comfort/`.

## Completion Notes (2026-11-13)

- `game/comfort.ts` (`salon.comfort.v1`; attributes on <html>; `prefersReducedMotion()`; `haptic()`), `game/ui/comfort.css`, `game/ui/comfort-section.ts`. Applied at start in `main.ts`.
- Text size scales the chat log, screens and the title menu (CSS `zoom` 0.92 / 1.15); the layout keeps its width.
- **OWNER:** is "Larger" large enough? A fourth step is easy to add. iPhone does not support vibration from a web page.
