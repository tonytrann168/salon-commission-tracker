# Story 010 evidence — English in the chair

Captured 2026-11-09, dev build, Chromium (Playwright), iPhone 13 viewport, reduced motion on.
Client replies and translations were answered by the browser test (no API key yet), except `07b`, which used the real server with no key. Nothing faked ships in the game.

| File | Shows |
|------|-------|
| `01-level-picker-first-run.png` | First Start with no saved level: four level cards, Vietnamese first, English under |
| `02-tap-to-translate.png` | Beginner appointment; tapping Dana's opening line shows its Vietnamese under it |
| `03a-help-beginner-tiles.png` | Help me say it at Beginner: Vietnamese typed, English shown as shuffled word tiles |
| `03b-help-beginner-tiles-built.png` | Tiles tapped in order; Send turns on |
| `03c-after-helped-send.png` | The built line sent as the player's own; mood not lowered |
| `04-settings-some-full-vietnamese.png` | Settings: level changed to Some, full Vietnamese mode on |
| `05-full-vietnamese-mode.png` | Some + full Vietnamese mode: every client line shows its translation automatically |
| `06a-help-some-retype-partial.png` | Help me say it at Some: re-type; Send stays off while typing is incomplete |
| `06b-help-some-retype-match.png` | Lowercase, one typo, no full stop — still matches; Send on |
| `07a-translate-failed-retry.png` | Translation failed: friendly bilingual message + Try again; chat still usable |
| `07b-help-no-key-real-server.png` | Real server, no key: friendly message, the player's Vietnamese is kept |

Checked in the same run (browser log):
- Level saved on the device (`salon.englishLevel`), and sent with each client turn (`level: beginner` / `some`).
- Tapping a line again hides it; tapping a third time shows it with no new translate call.
- Beginner: a polite but broken line the (fake) client marked `unclearEnglish: true, rude: false, moodDelta: -8` left mood at 45 — the game's own rule held it.
- A wrong word tile does nothing (wiggles); the helped line goes to the server with `helped: true`.
- No page errors.

Still needs the real API: that real clients actually speak at each level, and that real Beginner play with broken polite English shows no mood loss (the story's required real-API playtest).
