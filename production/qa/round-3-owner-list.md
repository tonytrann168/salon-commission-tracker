# Round 3: owner list and playtest checklist

> SAFE TO PAUSE after story 057c. Stories 053–057c are done. The overseer reviewed each one, and each round of
> follow-ups went into the next commit. **Paused until Sat 2026-11-21** (owner's budget note).

## What changed (for the owner's playtest)

| Story | What to try |
|---|---|
| 053 | Create an account (Tạo tài khoản). Errors show as a clear box above the buttons, never as a raw error. Use an email that already has an account → you are taken to Đăng nhập. |
| 054 | A first game: set up the salon menu (Bảng giá) before the first client. The price-board icon is in the Shop/Profile row. When cleaning, the cotton pad and swab icons show. |
| 055 | Cài đặt → the companion's voice: 3 for her and 3 for him, each with ▶ to hear a sample. One voice for English and Vietnamese. "Long" by default. |
| 056 | Home: 🔥 streak, today's 🎁 gift (once a day), the weekly ❄️ freeze, milestones at 3/7/14/30 days. The Shop's "Coming soon" tiles. |
| 057a | Start → the salon path: a top bar (🔥, Cấp / Level + XP bar, the daily goal ring "0/3"), today's client, the stops (clients and short 📖 lessons), Khách khác. |
| 057a part 2 | The first open shows the welcome page: Tạo tài khoản / Đăng nhập / Chơi thử không cần tài khoản. Home bar: 🔥 · coins · $ tips · the account button. Gifts give coins; tips stay for the salon. Today's challenge says "giữ chuỗi N ngày". |
| 057b | Sounds (tap, correct, coin, streak). Buttons squash a little when pressed. The gift's coins burst out. A good line → "Câu chuẩn luôn!" with confetti and Mai cheering. A thin bar under the steps fills during each visit. Mai looks sad with you if a client walks out. |
| 057c | The results open with the rewards: stars, +XP, +coins and +$ tips count up, then 🔥 Chuỗi 0 → 1 ngày, then the polaroid. Tap the card to skip. |

## OWNER decisions

The defaults are in place. Change any of them in the config file named.

- OWNER (two currencies, `config/daily.json`):
  - gift 10–20 coins, with a +10 bonus 20% of the time
  - milestones 50 / 100 / 150 / 300 coins at 3 / 7 / 14 / 30 days
  - the daily goal ring +15
  - each level-up +50
  - a one-time welcome gift of 20
- OWNER (057a, `config/path.json`): the path pattern is client, client, lesson, client, client; a lesson is 3 phrases
  and gives 5 XP; the daily goal is 3 clients.
- OWNER (057a part 2): the welcome page shows "Salon Besties" in words above the big companion. Swap in the
  designer's logo when it is ready.
- OWNER (057a part 2): after 3 appointments, guests still see the companion's "keep your progress safe?" banner, as
  the spec allows, beside the account button. Say if it should go.
- OWNER (057b, `config/juice.json` `perfect.minWords`): "Perfect line!" shows for every good line of 3 or more words.
  Overseer: keep this. Say if it should be rarer.
- OWNER (057b, `config/audio.json` `sfx.tap`): the tap sound plays on every button press, quietly, and follows the
  sound-effects setting. Overseer: keep this.
- OWNER (057b): the companion faces (happy, celebrating, thinking, sad) are placeholder art. The designer's Mai and
  Long sprites go in `imageSkins` in `config/mascot.json`, one image per face, with no code change.
- OWNER (057c): the payment card below the rewards still shows its own stars and the tip, part by part (story 039's
  moment). Say if the rewards card makes that feel like a repeat.
- OWNER: the version is still 1.0.0-rc.1. Bump it, and write What's new for rounds 2 and 3, before sending to testers
  (`config/whats-new.json`, `package.json`).

## Still to check outside this container

- `npm run smoke:api` with the real keys (the overseer ran 18/18 on 057b).
- A Vietnamese speaker's read of the new vi text (welcome, coins, path, lessons, "Câu chuẩn luôn!", rewards).
- On a real mid-range phone: whether the bursts and the count-up feel smooth (here, a 4× CPU throttle on software
  rendering showed no new long tasks).
- Cosmetics for coins (outfits, decorations) are still "Coming soon": a later story.

## Pending, waiting on the user (not the overseer)

- Changing the `model:` lines in `.claude/agents/*.md` (haiku for qa-tester, release-manager and community-manager;
  sonnet for the rest) changes Claude Code configuration. It waits for the user's own approval in chat.
