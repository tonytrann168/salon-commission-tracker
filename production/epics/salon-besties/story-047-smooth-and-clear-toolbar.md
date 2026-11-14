# Story 047: Smooth painting + a clear bottom toolbar

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Foundation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-14

## Context

Owner round 2: "the interface still feels laggy; the select buttons at the bottom stick together." Audience: a
45–60-year-old nail tech, not a gamer.

## Acceptance Criteria

- [x] Measured on the production build with Chrome CPU throttling 4× (a mid-range phone), a scripted paint stroke on
  the service screen: frame times and long tasks before and after, reported in the commit. Aim: painting at ~60 fps.
- [x] While painting: no layout work per pointer move, no redraw of the whole hand per stroke, no needless DOM updates,
  no animated box-shadow / backdrop-filter running.
- [x] Bottom toolbar: at least 8 px between buttons, groups clearly apart, each button a short word under its icon
  (Shape, Colour, Art, Clean, Done; Length comes with story 051), Done set apart from the tools. 16 px+ words where
  they fit; buttons at least 44 px.
- [x] e2e: spacing ≥ 8 px and every toolbar button has a visible word (en + vi). Evidence at 320 px.
- [x] Overseer follow-up: the reply box grows with the line (a textarea, up to about 4 lines, then it scrolls; 16 px
  text; Enter still sends). The 046 e2e now speaks a long line and checks it is fully visible during the countdown
  (scrollHeight ≤ clientHeight and scrollWidth ≤ clientWidth); watched failing on the old one-line box first.

## What changed

- Stage: resolution capped at 2× and antialias off on 2× screens (the hand is already smooth at that density).
- Station: the touch rectangle is read once per stroke, not per pointer move; the design change note to the rest of
  the game is throttled (250 ms, flushed when the finger lifts); spill is compared only when it changed; CSS
  animations pause while a finger is painting (`html.painting`).
- Toolbar: every button is an icon with its word under it (Shape / Colour / Art / Clean / ✓ Done; vi Dáng / Màu /
  Trang trí / Lau / Xong; ✋ Hand / Foot for two-hand and pedicure clients), 8 px apart, at least 52 px tall; Done is
  green and set apart on the right.

## Measurements (this container: software WebGL, Chrome CPU throttled 4×, production build, scripted strokes)

| | Before | After |
|---|---|---|
| Long tasks, first stroke run | 24 (2959 ms) | 2 (102 ms) |
| Long tasks, later runs | 1 (55 ms) | 0 |
| Painting fps | 6.7–8 | 9.2–9.6 |
| Our JavaScript per pointer move | 0.94–1.84 ms | 1.23–2.27 ms (same range) |

The container has no GPU (SwiftShader): even unthrottled it reaches only ~11–12 fps, and the CPU profile shows the
main thread ~86% idle, so frames here are GPU-bound. The absolute fps is not what a phone will see; the long tasks
and per-move work are the comparable numbers.

OWNER: please feel painting on your phone. If it is still not smooth, tell me the phone model.
OWNER: toolbar words are 13 px, not 16 px: five buttons with 16 px words do not fit side by side at 320 px. The words
are bold and always shown. Say if you would rather have two rows with bigger words.

## Test Evidence

**Status**: [x] Created

- e2e (en + vi): `the service is full screen…` checks the toolbar (words, ≥ 8 px gaps, inside the screen, ≥ 44 px);
  `speaking: the words wait…` checks a long spoken line is fully visible during the countdown.
- Screens at 320 px: `production/qa/evidence/story-047/` (long line during the countdown and while editing; toolbar).
