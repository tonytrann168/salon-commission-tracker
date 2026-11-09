# Story 002 evidence — Scoring & results

Captured 2026-11-09, dev build, Chromium (Playwright), iPhone 13 viewport, reduced motion on.
Client replies and grading were answered by the browser test (no API key yet), except `03`, which used the real server with no key. Nothing faked ships in the game.

| File | Shows |
|------|-------|
| `00-results-loading.png` | "Dana is writing her review…" while grading runs |
| `01-results-completed.png` | Top of results after a completed appointment: 5 stars, $13 tip, goal reached, review, skills |
| `01b-results-completed-scrolled.png` | Same, scrolled: English score (80) with its three parts, "Marked for your level.", Next client / Back to menu |
| `02-results-walkout.png` | Walk-out: 1 star, $0 tip, "She walked out. You can try again!" |
| `03-results-no-key.png` | Real server, no key: friendly message, Try again, Back to menu — no numbers shown |
| `05-next-client-fresh-appointment.png` | After "Next client": fresh appointment, mood 45, input enabled |
| `06-portraits-on-results-screen.png` | Portrait zone on the results screen (Dana and the bestie render) |

**Capture artifact, not a game bug:** in `01`, `01b` and `02` the portrait strip is black (or white in full-page captures). In three repeated runs, a clip of just the portrait zone taken immediately before and after each full-viewport capture showed the portraits correctly (`06`); only the full-viewport capture of the WebGL canvas next to the long scrolling results list comes out black in headless Chromium. Worth a glance on a real phone during the playtest.
