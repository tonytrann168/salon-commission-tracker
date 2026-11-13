# Story 021 evidence — Companion corner

Chromium (Playwright), 320×568; en with Mai, vi with a male companion (Minh) wearing the pink bow. Friendship seeded at 78 XP (level 2, its gift unclaimed).

| File | Shows |
|------|-------|
| `*-320-01-corner` | Tap the companion on the title → the corner: the companion large, a line, "🎁 … has a gift for you!" + Open the gift, 💬 Chat / 🤗 Pat / 🙌 High-five |
| `*-320-02-corner-after` | After a pat (+2 friendship today → level 3, celebration card), the level-2 gift opened (Sky blue polish, now in the station) and the level-3 gift offered; a high-five line |

Checked ("problems: none"): the gift went into the save's owned polishes for free (wallet untouched); friendship 78 → 80 once; a second pat the same day added nothing; lines in vi use "anh"/"em" for Minh; no sideways scroll. Animations are off with reduced motion (the shots use it).
Tests: `src/tests/corner.test.ts` (daily bonus once a day and not for chat; gifts once each, lowest first, free; never the same line twice in a row; every line in both languages; bad gift config refused; corner state saved with the companion).
