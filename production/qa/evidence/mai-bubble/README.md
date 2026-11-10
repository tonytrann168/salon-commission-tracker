# Evidence — Mai as an on-demand bubble (owner, 2026-11-10)

Chromium (Playwright, `--use-angle=swiftshader`), en and vi, iPhone 13 (390 px) and 320×568. AI answers mocked.
Mai is drawn by the **placeholder** mascot skin until the owner picks concept A, B or C.

| File | Shows |
|------|-------|
| `*-01-bubble-idle` | Mai's round bubble in the portrait strip (bottom-right); no Hint button, no whisper |
| `*-02-tip-waiting-badge` | After "Hello! What color you like?": the correction waits behind a badge (1); nothing popped up |
| `*-03-panel-tip` | Tap Mai: her panel opens over the top strip with Give me a hint, Help me say it and her tip (You said → Better + reason); the chat stays visible below |
| `*-04-panel-hint` | "Give me a hint" answered inside the panel |
| `*-05-dragged-left` | Mai dragged to the left corner (saved for next time) |
| `*-06-results-notes-card` | Results: "Mai has notes for you", collapsed |
| `*-07-results-notes-open` | The card tapped: her debrief (praise, try next, level) |

Checked in every run (script log): the bubble stays inside the fixed top strip and clear of the chat and the reply
box; after a mistake the panel stays closed and the badge reads 1; opening clears the badge; the newest line stays
visible with the panel open; tapping outside closes the panel; a drag moves Mai to the left without opening the
panel; "Help me say it" from the panel opens the same sheet; Mai's notes start collapsed; the shown tip's better line
was saved to the phrasebook. No page errors. Unit tests: `src/tests/mai-bubble.test.ts`.
