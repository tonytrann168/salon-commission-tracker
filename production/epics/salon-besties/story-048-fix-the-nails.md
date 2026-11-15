# Story 048: Fix the nails when she asks

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Gameplay
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: "when the nails are done and the customer wants a redo or fix, I don't see an option to fix the nails",
and "she asked for a fix, I didn't fix it (no option), and there was no follow-up."

## Acceptance Criteria

- [x] When she asks for a change (the colour-redo scenario after Done, a set service line such as "Can you fix that
  edge?", or the same ask in her own AI words, caught by patterns in data), a clear **🔧 Fix it / Sửa lại** step shows:
  orange, with a word, in Clean up's place in the bottom row, selected, with a one-line instruction.
- [x] The Fix row has the **Remover** (one tap per nail: polish, skin spill and that nail's gems/stickers back to bare),
  **Remove all**, Clean up, and for a colour fix the colours. The right tool is preselected (edge → Clean up,
  colour → Remover). After Done, the station reopens on this step (no more "Redo" Done button).
- [x] Each request is tracked open/fixed (`game/fix-requests.ts`, `config/fix-requests.json`). A fix needs the player
  to act (a clean-up or remover stroke) and then the nails to meet the test (edge: every nail's neatness ≥ 0.9;
  colour: a different colour, ≥ 85% painted).
- [x] Fixed: she thanks the player (a line from data), mood +4, her question is answered (no ignored-question dip),
  the Fix step goes away, and problem handling is at least 80.
- [x] Still open at Done: her reaction line (data), mood −8, a note on the results ("She asked you to fix the edge, and
  it wasn't fixed"), the companion's debrief says so with what to do next time, the grader is told (the review
  mentions it), and problem handling is capped at 40.
- [x] Overseer follow-up on 047: antialiasing back on (the art is the product); long tasks re-measured.

## Notes

- "Can you make them a little shorter, please?" stays an ordinary line until story 051 adds Length; 051 makes it a
  length fix.

OWNER: mood +4 when fixed and −8 when left open, problem handling floor 80 / cap 40: all in `config/fix-requests.json`.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/fix-requests.test.ts` (config, patterns, Remover, open/fixed, problem handling, the grader's prompt).
- e2e (en + vi): colour redo fixed (Remove all, new colour, painted → her thanks, Fix step gone); a fix asked
  mid-service (her reply → Fix it with Clean ready → one stroke → thanks); a fix left open (her reaction, the results
  note and the companion's line). Watched failing on the old code (no Fix step existed).
- Screens at 320 px: `production/qa/evidence/story-048/`; the 047 toolbar re-shot with antialiasing:
  `production/qa/evidence/story-047/*-320-03-toolbar.png`.
