# Story 005: Nail art station

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (awaiting owner review + phone playtest for 60 fps)
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 3`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] During the service phase the player works on the client's hand in a nail art station drawn with PixiJS.
- [x] Tools: nail shape, base color, polish application, gradients, gems and stickers, all usable by touch.
- [x] The chat stays usable while the station is open, so the player talks and works at the same time.
- [x] The client states what they want during consultation; when the player finishes, the result is compared to that request.
- [x] The match affects the client's mood and the stars, and the client comments on the nails in the review.
- [x] The station runs smoothly (target 60 fps) on a mid-range phone.

---

## Implementation Notes

- Represent the design as data (shape, colors, layers) so it can be compared to the request and saved.
- Art is cute stylish 2D per the brief; placeholder art is fine until an art pass.

---

## Out of Scope

- Hair services (out of v1 scope).
- Sharing designs (leaderboards and sharing are out of v1 scope).

---

## Files

- `src/game/nail-art/station.ts`
- `src/game/nail-art/design.ts`
- `src/game/nail-art/match.ts`
- `src/tests/nail-art-match.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Visual/Feel
**Required evidence**: a retained screenshot in `production/qa/evidence/` + sign-off in `production/qa/evidence/nail-art-station-evidence.md`

**Status**: [x] `src/tests/nail-art-match.test.ts` (12) + `production/qa/evidence/story-005-nail-art-station/` (en/vi 320). [ ] 60 fps on a real phone: owner playtest.

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-002-scoring-and-results.md`
- Unlocks: None

## Completion Notes (2026-11-10)

- **Data**: `game/nail-art/design.ts`: NailDesign (shape, polish, gradient, painted cells per nail, gems and stickers), five shape outlines, a coverage grid, a round brush, decorations capped per nail. Config: `config/nail-art.json`.
- **Station**: `game/nail-art/station.ts` (PixiJS: a hand with five nails; repaints only the nail being painted) + `game/ui/nail-station-panel.ts` (DOM touch layer over the portrait strip, because the chat UI sits above the canvas; a two-row toolbar). It opens by itself when the service starts and can be toggled (💅 by the mood bar). The client shrinks to a small face so her mood stays readable. The chat below keeps working. Mai's bubble moves above the toolbar.
- **Tools**: 5 shapes (square, round, oval, almond, stiletto), 10 polish colours (en/vi names), Polish (drag to paint; coverage counts), Gradient (tap a colour for the tips), Gems, Stickers (heart, star, flower), Start over, Done.
- **The request**: Dana's `nailRequest` (square, nude or pale pink, no art) matches her `wants`, which she says in consultation. `matchDesign` scores shape, colour (near colours get partial credit), coverage and extras, out of 100.
- **Effects**: Done changes the mood by config band (+10 / +4 / −4 / −10, never down to a walk-out); the match counts like a skill in the stars (`stars.nailWeight`); the client hears the nails in her game note (in progress, then finished with the match) and may react; grading gets the description and the match, and the review must mention the nails (kindly when they're off). If the appointment ends before Done, what was done is scored (no mood change).
- **smoke:api**: 11 checks (two new: the review mentions the nails at match 85 and stays kind at match 30).
- **Frame rate**: see the evidence README. The station's own cost per paint move is ~0.1 ms; 60 fps needs the phone.
- **Placeholder art**: simple vector hand and nails; an art pass later.

### Realistic hand (owner request, 2026-11-10)

- **The hand is data** (`config/nail-art.json` → `hand`): a finger list with each nail's centre, lean and size, and each finger's length and width. The thumb is low on the left at −38° with a wide short nail; the middle nail is longest; the pinky is the smallest and narrowest. A second hand (10 nails) or another hand shape is more entries in the list (tested with 10).
- **Nail size is difficulty**: the brush has one size in hand units (`brushRadius`), so it covers a bigger share of a small nail and slips off it sooner. The same off-centre stroke stays on the middle nail and spills off the pinky (test).
- **Outside the lines**: paint beyond the nail's edge (skin, cuticle, past the tip) within `spill.marginCells` is kept as spill, drawn as polish on the skin. Grazing the edge by one cell is forgiven (`spill.forgiveRing`). Neatness per nail drops to 0 when the spill reaches `spill.zeroNeatnessAt` of the nail's area.
- **Clean up** (🧽, Colour tab): rub to wipe spill (`cleanupRadius`); tap again to go back to polish. A hint points to it when polish lands on the skin.
- **Scoring**: neatness is a fifth part of `matchDesign` (`matchWeights.neatness` 15). The AI client and the review hear "clean edges" or "polish on the skin around N nails".
- **Input fixes**: no text selection on the station (it was cancelling mouse strokes); every merged pointer point is used, and gaps between points are filled in half-brush steps.
- **Layout**: the hand fits inside the same zone (the 320 px chat space is unchanged). The hint now shows for 3 s after each change so it doesn't cover the thumb.

