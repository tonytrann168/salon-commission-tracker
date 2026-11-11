# Story 015 evidence — First-time onboarding

Chromium (Playwright), 320×568. en at **Beginner** (simple wording), vi in full Vietnamese mode. Fresh player with a chosen companion (Mai); AI mocked.

| File | Step |
|------|------|
| `*-320-01-reply` | 1/5 The chat: read, type, Send (or 🎤). The card sits above the reply area; the ring highlights it |
| `*-320-02-help` | 2/5 Help me say it and tap-to-translate |
| `*-320-03-mood` | 3/5 The mood bar |
| `*-320-04-nails` | 4/5 The nail station: colour, paint, 🧽 clean up, ✓ Done (the toolbar stays visible above the card) |
| `*-320-05-results` | 5/5 The results (shown after the first-client badge card is dismissed) |

Checked in the same run (script log, "problems: none"):
- For every step in en and vi: the card never overlaps the control it points at, stays on screen, and the page never scrolls sideways.
- The player replied while the tour was showing (it never blocks play); only the 3 player lines reached the AI (the tour makes no calls).
- While a celebration card is up the tour hides, then returns.
- Saved `{"done":true,"seen":[all five]}`; a second appointment shows no tour.

Tests: `src/tests/onboarding.test.ts` (order, once only, skip, replay, damaged save, every step worded for normal and Beginner in both languages).
