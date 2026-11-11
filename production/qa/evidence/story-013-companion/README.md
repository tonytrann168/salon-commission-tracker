# Story 013 evidence — Companion (art-independent parts)

Chromium (Playwright), 320×568, en and vi. AI mocked. The run starts as a regular player (12 appointments, 590 XP, friendship 2 XP short of level 3, five stars earned) who has not met a companion yet. Placeholder art only: the designer's figures and accessory art drop in later through the skin system.

| File | Shows |
|------|-------|
| `*-320-01-meet` | First meeting (on Start): pick Female or Male (live previews), name field (default Mai), "change later in Settings" |
| `*-320-02-meet-male-bad-name` | Male picked (default name becomes Minh); "Mai2" refused: "Letters and spaces only." and Let's go disabled |
| `*-320-03-title-male` | Title with the male placeholder portrait (short hair). vi greeting: "…Có **anh** đây." |
| `*-320-04-dress-up` | Dress-up from Profile: Minh large, wearing the pink bow (free from start) and round glasses (friendship 2); locked items say how to earn them; "Boutique: coming later" (no prices) |
| `*-320-05-settings-bestie` | Settings → Your bestie: Female/Male, rename, Dress up |
| `*-320-06-bubble-look` | In an appointment the bubble shows the male companion with his bow and glasses |
| `*-320-07-top-rank-card` | Rank-up card from the companion: "Minh: “Lên level Trùm Nail Đỉnh Nóc Kịch Trần rồi nè! 👑”" — wraps to three lines, nothing clipped |
| `*-320-08-results-top-rank` | Results progress with the top rank name (wraps, not clipped) |
| `*-320-09-profile-top-rank` | Profile with the top rank (wraps, not clipped) |

Checked in the same run (script log, en and vi, "problems: none"):
- The first open of the day is the daily hello: friendship 78 → 81 XP, level 3, and the companion's card "We're friendship level 3 now!" / "Mình lên cấp thân thiết 3 rồi nè!".
- Saved companion: `{"chosen":true,"gender":"male","name":"Minh"}`; every bestie and corrections request carried `companion: {name: "Minh", gender: "male"}` (5 of 5).
- 5 accessories still locked, each with its how-to line; nothing clipped at 320 px (dress-up items, celebration text, progress panel, profile rank).

Unit tests (`tests/companion.test.ts`, 11): names (diacritics fine; Long, Điền, Edith not blocked; empty, too long, digits/emoji, offensive refused), defaults (Mai / Minh), grammar (anh/he/his vs chị/she/her), persona for a male companion, server prompts for bestie and corrections use the name and "anh" (never "chị") for a male companion, interface strings follow the saved companion, damaged saves, gender switch keeps a typed name, accessory unlock rules, the daily hello once a day, best skill remembered.
`smoke:api` has a 13th check: a male companion answering in Vietnamese says "anh" and never "chị" (not run here: no key).

**Re-shot after the overseer's review of 7924b1f:** the top-rank card's subtitle now speaks to the player as "em" ("Em lên bậc cao nhất rồi. Giỏi quá trời!"); every other player-facing "bạn" in vi.json became "em" ("bạn thân", best friend, stays). Run: problems none, nothing clipped.
