# Story 052: Brush and easier clean-up

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: "when painting, maybe show the polish brush? If too hard, don't bother. When polish gets all over, it's
hard to remove." Overseer follow-ups: spill should read as a soft smudge, not beads (048); keep the hand as big as
the screen allows (051).

## Acceptance Criteria

- [x] A polish brush under the finger while painting: its tip at the touch point, the handle leaning away from the
  finger, the bristles in the chosen colour. Moved with a CSS transform (no layout); off with reduced motion.
- [x] Bigger clean-up tip (`cleanupRadius` 4.5 → 6.5; the shop's clean-up pen still multiplies it).
- [x] 🧽 Clean opens the clean-up mode: **Rub** (the tip) and **✨ Clean edges**: one tap on a nail wipes its skin
  spill, after a short wait (`tidy.seconds` 1.2 in `config/nail-art.json`: the station is busy meanwhile), so it is
  never free perfection. Clean edges also counts as acting on an edge fix (048).
- [x] **↶ Undo / Hoàn tác** in the bottom row: the last stroke or tap (colour, shape, length, Remove all, Clean
  edges), up to 20 steps; greyed when there is nothing to undo.
- [x] Spill is drawn as a soft smudge: overlapping blobs in two passes in polish-mixed-with-skin colours (opaque, so
  overlaps never darken), no outlines.
- [x] The hand switch (two-hand and pedicure clients) floats over the hand, top left, so the bottom row (Clean, Undo,
  Help, Done) keeps its room and gaps at 320 px.
- [x] The hand keeps room only for the longest length she ordered (or a longer one picked), not the longest on offer.
- [x] Found on the way: since 051 her planned "a little shorter" line was skipped on short nails and she fell silent;
  she now says another of her unused lines instead (this made the full-screen e2e flaky).

## Notes

Paint targets: a stroke that starts on the skin next to a nail paints that nail (the spill margin), and it stays on
its nail while the finger is on the skin around it. The owner's phone test will say whether the nails need to be
bigger still.

OWNER: is the 1.2 s for Clean edges right? (`tidy.seconds`)

## Test Evidence

**Status**: [x] Created

- e2e (en + vi): the brush shows while the finger is down and goes when it lifts; Undo takes back a shape tap;
  Clean → Clean edges → a nail: busy, then "Edges clean!"; the two-hand switch still works.
- Screens at 320 px: `production/qa/evidence/story-052/` (brush and smudge, clean mode with Undo, the floating hand
  switch).
