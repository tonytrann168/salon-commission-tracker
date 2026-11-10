# Story 008 evidence — Menus and buttons in Vietnamese

Captured 2026-11-10 (re-shot after the overseer's review), dev build, Chromium (Playwright, `--use-angle=swiftshader`), iPhone 13 viewport, reduced motion on. `en-*` = full Vietnamese mode off, `vi-*` = on.
Client replies, translations and grading were answered by the browser test (the shots show interface text, not AI output). Nothing faked ships in the game.

| File | Shows |
|------|-------|
| `*-01-title` | Title menu: tagline, Start, Settings |
| `*-02-settings`, `*-02b-settings-toggle` | Settings; the full-Vietnamese-mode switch is always labelled in both languages |
| `*-03-level-picker` | First-run level picker: title in the interface language, cards stay bilingual (story 010) |
| `*-04-chat` | Phases, mood, Help me say it, placeholder, Send, tap-to-translate hint |
| `*-05-help-me-say-it` | Help me say it at Beginner (word tiles) |
| `*-06-results`, `*-07-results-scrolled` | Client's final pose and the bestie above the results; stars, tip, rebook note, review, skills, English score, buttons |
| `en-08-review-vietnamese` | Tap-to-translate mode: the review tapped, its Vietnamese under it |
| `vi-08-review-vietnamese` | Full Vietnamese mode: the review's Vietnamese shown automatically |

Checked in the same run (script log):
- Every screen above, both languages, at 390 px and 320 px wide: no element wider than its box, no sideways page scroll.
- `<html lang>` is `vi` in Vietnamese mode and `en` otherwise; no page errors.
- Fixed from the first run: the Vietnamese chat placeholder "Câu trả lời của bạn…" was cut off; now "Trả lời…".

**The blank portrait block in the first capture was not a game bug.** Chromium's default headless GPU path drops the WebGL canvas from full-viewport screenshots (story 002's evidence noted the same). A clip of just the portrait zone showed Dana and the bestie, and with `--use-angle=swiftshader` the full captures show them too. Future evidence captures should use that flag.

**Mock translations (re-shot 2026-11-10):** the browser test now gives every client line its own Vietnamese, and the script checks that each bubble shows its own translation (it found no mismatches). An earlier capture showed one fixed mock string under every line; that was the test mock, not the game.
