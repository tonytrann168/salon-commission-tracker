# Story 005 evidence — Nail art station

Chromium (Playwright), 320×568, en and vi. AI answers mocked: Dana asks for "short and square, pale pink, nothing
fancy" and the service starts.

| File | Shows |
|------|-------|
| `*-320-01-station-open` | The service starts: the station opens over the portrait strip (Dana shrinks to a small face, so her mood stays readable), toolbar: 5 shapes, Start over, Done; Polish, Gradient, Gem, Sticker, 10 colours |
| `*-320-02-painting-and-chat` | Square, pale pink, painted by dragging across the nails; a chat line sent and answered while the station is open |
| `*-320-03-done` | Done: "Nails done! They match her request: 100%"; mood 49 → 59; tools locked; Mai's bubble above the toolbar |

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
