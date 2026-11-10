# Story 006 evidence — Client roster & difficulty

Chromium (Playwright), 320×568, en and vi. AI answers mocked (the mock moves the phase forward one step per line, so a client is done in three lines).

| File | Shows |
|------|-------|
| `*-320-01-picker-easy` | The client picker, Easy tab: Grace, Mia, Rosa. Each card shows the client's own placeholder portrait face (neutral; drawn once with Pixi and kept as an image, the look colours show until it is ready), a one-line description (en/vi), and Random / Start a shift (3) buttons. The chosen tab is remembered |
| `*-320-02-picker-hard` | Hard tab: Victoria, Brenda, Tom, each with their type |
| `*-320-03-shift-client-1` | A hard shift starts with Tom (price and booking, rude): his own opening line and his own face. Tom uses the new `look.hairStyle: "short"` (no long side hair and no bow) |
| `*-320-04-results-next-in-shift` | Results after client 1: the button says "Next client (2/3)" |

Checked in the same run (script log, en and vi, "problems: none"):
- Hard shift order: tom → victoria → brenda; buttons "Next client (2/3)", "Next client (3/3)", then "Shift done!" back to the picker.
- Each request to `/api/client-turn` and `/api/grade-appointment` carried that client's `clientId`.
- Opening lines come from each client's file; Vietnamese help works for every opening line (translation cache holds the whole roster).

Unit tests (`tests/roster.test.ts`): 9 files valid, 3 per difficulty, every hard type covered, a bad file refused with its name and problem (including a bad `hairStyle`), repeatable shifts with no repeats, Victoria's mood sensitivity (−10 → −14, +10 → +8), and the server using the chosen client (unknown id → 400).

Not run here: `npm run smoke:api` (no key in this container). It now has 12 checks; the new one is Victoria's client turn (she must push back, stay clean).
