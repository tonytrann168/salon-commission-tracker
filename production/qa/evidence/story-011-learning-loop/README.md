# Story 011 evidence — Learning loop

Captured 2026-11-10, dev build, Chromium (Playwright, `--use-angle=swiftshader`), iPhone 13 (390 px) and 320×568, reduced motion on.
`en-*` = full Vietnamese mode off, `vi-*` = on. Every AI answer was given by the browser test, so the wording is the test's, not the
model's. Real-API wording: `npm run smoke:api` (now 9 checks, 2 for corrections).

| File | Shows |
|------|-------|
| `*-01-title-phrasebook-button` | Title menu: Settings and Phrasebook share a row (fits 320×568) |
| `*-02-settings-corrections` | Settings: the new Bestie corrections switch (with the per-client cap) |
| `*-03-whisper-correction` | Right after "Hello! What color you like?": praise first, "You said… → Better: …", one reason; the chat stays visible |
| `*-04-english-review` | Results: the player's lines worth improving, each with a better line, its Vietnamese and a reason (in Vietnamese in `vi`) |
| `*-05-vietnamese-recap` | Recap in Vietnamese and three lines to try next time, each with its Vietnamese |
| `*-06-level-up` | "N new phrases saved", then the automatic level-up: 🎉, the reason in Vietnamese and English, and "switch back in Settings" |
| `*-07-phrasebook` | The phrasebook, grouped by topic, English with Vietnamese |
| `*-08-level-down-suggestion` | A low average at Comfortable: a kind suggestion to move down, with Accept / Decline |
| `*-09-level-down-declined` | Declined: the level stays |

Checked in the same run (script log):
- Every player line except one-word lines was checked; the whisper language followed full Vietnamese mode.
- With the correction whisper open, the better line and the reason were fully visible and the whisper never covered the chat (en/vi, 390 and 320).
- Level-up run (Some, history 84, 88, then 87): level saved as Comfortable and the history reset. Decline run (Comfortable, 40, 30, then 36): level stayed Comfortable and the history reset, so it doesn't ask again right away.
- Phrasebook after one appointment: 6 entries with topics and sources. "What color would you like?" came from both the whisper and the review but was saved once.
- No page errors; nothing wider than its box or off-screen.
- Fixed in this run: a correction was taller than the whisper area at 320 px (now compact); in full Vietnamese mode a late-arriving translation pushed the newest line below the fold (the chat now stays scrolled to the end).

Still needs the real API: that corrections are kind, level-fair and not too frequent in real play, and that the recap reads naturally.

**Mock translations (re-shot 2026-11-10):** the browser test now gives every client line its own Vietnamese, and the script checks that each bubble shows its own translation (it found no mismatches). An earlier capture showed one fixed mock string under every line; that was the test mock, not the game.
