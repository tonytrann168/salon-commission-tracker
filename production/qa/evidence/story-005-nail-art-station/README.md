# Story 005 evidence — Nail art station

Chromium (Playwright), 320×568, en and vi. AI answers mocked: Dana asks for "short and square, pale pink, nothing
fancy" and the service starts.

| File | Shows |
|------|-------|
| `*-320-01-station-open` | The service starts: the station opens over the portrait strip (Dana shrinks to a small face, so her mood stays readable). One toolbar row: Shape ▢ / Colour 🎨 / Art ✨ tabs (icons on narrow phones), the tab's options (faded edges show they scroll), ✓ Done. Mai sits in the top-right corner of the hand area |
| `*-320-02-painting-and-chat` (replaced, see below) | Square, pale pink, painted by dragging across the nails; a chat line sent and answered while the station is open |
| `*-320-03-done` (replaced, see below) | Done: "Nails done! They match her request: 100%"; mood 49 → 59; tools locked; Mai's bubble above the toolbar |

Checked in the same run (script log, en and vi):
- The chat works while the station is open (a line sent and answered; the station stays open).
- Done: match 100% for square + pale pink + fully painted + no extras; mood +10 (config band).
- The client's next turn carried the nails: "finished: square shape, pale pink, no gems or stickers; 100% painted;
  matches what you asked for: 100/100". The grading request carried `{"description": "...", "match": 100}`, and the
  match counts towards the stars (tests).
- No page errors.

**Frame rate (honest):** this cloud container has no GPU, so WebGL runs in software. It manages only 14–17 fps with
the station open and **no input at all**, so a frame-rate number here says nothing about a phone. What the station
itself costs was measured: 0.10–0.15 ms average and 0.5 ms at the 95th percentile per paint move (492 moves), against
a 16.7 ms frame budget at 60 fps. It redraws only the nail being painted (at most 60 small rects). **Real 60 fps needs
the owner's phone playtest** (paint all five nails quickly and watch for stutter).

**Re-shot after the overseer's 320 px review (2026-11-10):** one toolbar row instead of two, the hand area ~20% smaller,
the hint inside the hand area, the phase pills hidden while the station is open (the mood bar stays), Mai's bubble in
the hand area's top-right corner (the hand layout keeps it clear). Measured at 320×568 with the station open: the chat
area is 213 px (was ~100) and the latest two messages are fully visible in en and vi (with Vietnamese under the client
line); Mai's bubble is inside the kept-clear corner, off the nails.

## Realistic hand re-shoot (owner request, 2026-11-10)

| File | Shows |
|------|-------|
| `*-320-01-station-open` | The new hand: five different fingers (the thumb low on the left, angled, with a wide short nail; the middle finger longest; the pinky clearly the smallest), cuticle folds, knuckle creases, a paler free edge. The client's face is top-left, Mai top-right. The hint shows for 3 s and then fades, so it doesn't sit over the thumb |
| `*-320-02-painting-spill` | All nails painted pale pink, then a slip off the pinky's side: polish dots on the skin and the hint "Polish on the skin! Tap 🧽 to clean it up." (vi: "Sơn dính ra da! Chạm 🧽 để lau sạch.") |
| `*-320-03-cleaned-and-chat` | After Clean up (🧽, first button in the Colour tab) the spill is gone; a chat line is sent and answered with the station open |
| `*-320-04-done` | Done: 100% match, mood +10 |

Checked in the same run (script log, en and vi, "problems: none"):
- Careful strokes along each nail (kept a brush-width inside the edges) give 99% painted and **clean edges**: grazing the edge doesn't count as spill (`spill.forgiveRing` 1 cell).
- The pinky slip was caught (hint shown); after Clean up, grading got "…; 99% painted, clean edges", match 100.
- 320 px chat space unchanged: chat area 213 px, latest two messages fully visible (en and vi), Mai in her corner.
- **Fixed on the way:** a mouse or trackpad stroke was cancelled part-way by the browser (it was starting a text selection), and fast strokes skipped points because the browser merges moves into one per frame. Now pointer-down prevents selection, the panel reads every merged point, and the station fills the gaps between points in half-brush steps.

Frame rate: same as above (software WebGL here, ~15 fps even idle); the 60 fps feel check is still the owner's phone.
