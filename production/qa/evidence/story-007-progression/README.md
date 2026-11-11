# Story 007 evidence — Progression & daily hooks

Chromium (Playwright), 320×568, en and vi, starting from an empty save. AI answers mocked; the grading mock gives a great visit (90+ skills and English).

| File | Shows |
|------|-------|
| `*-320-01-title` | Title menu with the new 🛍 Shop and ⭐ Profile row; on short phones the menu sits at the bottom so all five buttons fit (last row ends at 558 of 568 px) |
| `*-320-02-picker-daily-locked` | New player: **Today's client** card on top (Grace, picked from the date), Medium and Hard tabs locked (🔒) with "Reach Nail Tech to unlock…"; Random and Shift disabled on a locked tab |
| `*-320-03-celebration` | After the daily visit: the rank-up card "You're now a Nail Tech! New clients unlocked: Medium." with sound and confetti (none with reduced motion); the 5 new badges follow on **one** card |
| `*-320-04-results-progress` | Results "Your progress": +85 XP · +$17 tips (wallet $17), the rank bar "85 / 250 XP to Senior Tech", "Daily client done! Streak: 1." |
| `*-320-05-shop` | Shop after buying Rose gold: owned ✓, wallet $45; prices; "Tips come from your appointments" |
| `*-320-06-profile` | Profile: rank and XP bar, appointments, tips to spend, tips earned, day streak, badges 5/9 (earned in colour, others grey with their goal) |

Checked in the same run (script log, en and vi, "problems: none"):
- XP for the daily 5-star goal visit on an easy client: (50 + 15) × 1 + 20 daily bonus = 85; rank Junior → Nail Tech (60 XP).
- Save after the visit: wallet 17, xp 85, streak 1, badges first-client, five-stars, upsell-pro, rebook-pro, clear-english.
- Rose gold bought for $25 → it is the 11th swatch in the nail station for Dana (now unlocked).
- The roster shift script (story 006) still passes with a high-rank save; a celebration never covers the next appointment (it only shows while the results are on screen).

Logic tests: `src/tests/progression.test.ts` (12): wallet and XP by stars, goal, difficulty and daily bonus; rank-ups and unlocks; badges once each, the hard-client rule, nothing for a walk-out; the daily client fixed for the day (and after a rank-up) and varying across days; streak +1, reset after a missed day, milestones, no credit for walk-outs or twice in a day; shop buy/owned/funds; bought polishes in the station; upgrade effects; no client requests a shop colour; bad config refused; damaged or future-version saves read safely.

## Fixes after the overseer's review of 3e0f485 (re-shot)

- **Mai brings the news:** each celebration card shows Mai in her celebrating mood, speaking ("Mai: “You're a Glow-Up Tech now! ✨”", vi "Mai: “Lên level Thợ Xịn Xò rồi nè! ✨”"), with the rank or badge icon as a sticker by her.
- **New rank names (owner):** 🐣 Baby Chick / Gà Mới Nở → ✨ Glow-Up Tech / Thợ Xịn Xò → 💅 Gel Warrior / Chiến Thần Sơn Gel → 👑 Nail Boss / Trùm Nail Đỉnh Nóc (gender-neutral; ids and XP unchanged).
- **One streak:** days in a row with a finished daily client. Mai's hello reads the same counter; her memory no longer keeps its own.
- This run starts with 30 XP so the first daily visit still ranks up (the browser's UTC date picked Rosa, whose nails the script doesn't paint, so 4 stars and +55 XP). Result: rank-up card, then one card for 4 badges; progress 85 / 250 XP to Gel Warrior.
