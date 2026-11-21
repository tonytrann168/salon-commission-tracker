# Story 073 — Erasing polish off the skin is easy

Type: Feel fix (owner signs off) · Owner screen recording, Sat 11:45: "still have difficulty erasing the polish".

## What the video showed
- 9 s of Rub around the middle finger, but the blobs above the middle and ring nails never shrank. Rub only wiped the nail the stroke began on, with a small reach.
- A spill by the thumb sat partly off-screen at the left edge, so it couldn't be reached.
- The pad, drawn under the fingertip, hid exactly what was being rubbed.
- "Clean edges" was never found (it needed two steps).

## Fixes
1. **A generous rub** (config/nail-art.json `rub`; `rubRadius`, `rubSpill` in game/nail-art/design.ts). Rub wipes skin spill on every nail within its reach of the touch. The reach is 2× cleanupRadius, and never under 28 px on screen at any zoom. Only spill (skin) cells go; the paint on a nail is never touched. The station still fills the gaps between pointer samples, so one pass clears a blob.
2. **The pad draws 40 px above the finger** (`padLiftPx`). A dashed ring shows the real clean point and reach, so the player sees the spill vanish.
3. **Spills stay reachable.** Polish only lands on the skin inside the visible station (4 px in from its edges), so a spill by the thumb at the screen's left edge can no longer happen.
4. **Feedback.** While polish comes off there's a soft swish (the 070 small-button sound, slightly higher, at most every 160 ms). When a nail's skin is clean, a tiny green ✓ pops on it.
5. **Clean edges is "Clean edges (1 tap)".**
   - With one dirty nail on this hand or foot it goes straight there; it still takes `tidy.seconds` (1.2 s).
   - With several, the dirty nails pulse; tap one.
   - The hints say "Tap a nail with polish on the skin" and "the ring shows where".
6. The station exposes `data-spill` (the cells of polish on the skin) for tests.

Also in this commit, from the 071b review:
- The combo e2e now paints the hands hot pink and checks the hands photo has the pink on it (more than 200 pink pixels). The hands snapshot is taken synchronously at the hands' Done, before the station becomes the foot. Taking it after the swap was watched failing (the combo photos don't appear at all). The bare 54% nails in the 071b evidence were only because that evidence run never painted.
- Owner: My work keeps **both** photos of a combo (hands, then feet). The e2e checks the gallery gets 2.

## Acceptance
- [x] Unit (tests/rub.test.ts):
  - a stroke passing near a spill blob clears it within 3 strokes and never changes the paint; watched failing with the old reach (scale 1, no minimum: 43 cells left)
  - the reach is at least 28 px at any zoom
  - one rub point clears two nails
  - nail-art.json `rub` validated
- [x] e2e at 320 px (en + vi, hand and foot): paint everything (polish right to the left edge), one rub pass of strokes 20 px apart gives `data-spill` 0, and the ring is at least 56 px across. Watched failing with the old reach (ring about 27 px).
- [x] e2e: Clean edges with several dirty nails shows the pulses.
- [x] Evidence (en + vi, 320×568 @2×): production/qa/evidence/story-073/ — `*-1-spill.png`, `*-2-rubbing-pad-and-ring.png`, `*-3-clean.png`.

## OWNER
- OWNER: the rub's size: 2× the old reach, at least 28 px (`rub.scale`, `rub.minPx`). Bigger or smaller?
- OWNER: Clean edges' 1-tap wait stays 1.2 s (`tidy.seconds`)?
- OWNER: the pad lift is 40 px (`rub.padLiftPx`).
