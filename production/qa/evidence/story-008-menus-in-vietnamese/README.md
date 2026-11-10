# Story 008 evidence — Menus and buttons in Vietnamese

Captured 2026-11-10, dev build, Chromium (Playwright), iPhone 13 viewport, reduced motion on. `en-*` = full Vietnamese mode off, `vi-*` = on.
Client replies, translations and grading were answered by the browser test (the shots show interface text, not AI output). Nothing faked ships in the game.

| File | Shows |
|------|-------|
| `*-01-title` | Title menu: tagline, Start, Settings |
| `*-02-settings`, `*-02b-settings-toggle` | Settings; the full-Vietnamese-mode switch is always labelled in both languages |
| `*-03-level-picker` | First-run level picker: title in the interface language, cards stay bilingual (story 010) |
| `*-04-chat` | Phases, mood, Help me say it, placeholder, Send, tap-to-translate hint |
| `*-05-help-me-say-it` | Help me say it at Beginner (word tiles) |
| `*-06-results`, `*-07-results-scrolled` | Stars, tip, rebook note, review heading, skills, English score, buttons |

Checked in the same run (script log):
- Every screen above, both languages, at 390 px and 320 px wide: no element wider than its box, no sideways page scroll.
- `<html lang>` is `vi` in Vietnamese mode and `en` otherwise; no page errors.
- Fixed from the first run: the Vietnamese chat placeholder "Câu trả lời của bạn…" was cut off; now "Trả lời…".
