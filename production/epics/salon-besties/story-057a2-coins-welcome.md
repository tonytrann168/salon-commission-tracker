# Story 057a part 2: Two currencies, the welcome page, the account button

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Visual/Feel + Logic
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

The overseer reviewed 057a and passed on two owner decisions: (1) two pretend currencies; (2) sign-in and sign-up on
the front page, as other apps do. There were also two fixes: the path's top bar was see-through, and today's challenge
said "start a streak" even when the streak was already going.

## Acceptance Criteria

- [x] **Two currencies, both pretend, never bought with real money, never pay-to-win.**
  - **Tips ($)** come only from client tips. They buy salon upgrades and tools (the existing shop).
  - **Coins** (a drawn coin, not $ and not an emoji) come from:
    - the daily gift: 10–20, sometimes a +10 bonus
    - streak milestones: 3/7/14/30 days pay 50/100/150/300
    - the daily goal ring: +15 the moment it is reached
    - each level-up: +50
  - Coins will buy cosmetics: outfits and decorations, the shop's "Coming soon" tiles.
  - Every amount is in `config/daily.json`.
- [x] **Existing saves**: tips stay as they are. Coins start at 0, plus a one-time welcome gift of 20 coins (with a
  short note on home). Both currencies are in the save, so they sync and back up with it.
- [x] **The home top bar** shows 🔥 streak · coins · $ tips · the account button. It is one row, left of EN | VI, and
  fits 320 px. Today's 🎁 floats just below the bar.
- [x] **The welcome page** shows on a first open when the player is not signed in and no account is remembered on this
  phone. It has:
  - the logo and the companion
  - a big **Tạo tài khoản / Create account**
  - a second button, **Đăng nhập / Sign in**
  - a small link, **Chơi thử không cần tài khoản / Play without an account**
  - a note that a guest's progress stays on the phone and can go into an account made later
  Each path leads home. The sheets and the auth logic are unchanged.
- [x] **The account button**:
  - For a guest it is a person silhouette that opens Sign in / Create account.
  - When signed in it shows the email's initial with a green ✓ and opens **Your account** (the email, Sign out,
    Delete account).
  - It updates when a remembered session is restored.
  - Settings keeps the account section.
- [x] **The path bar is solid** (no faded heading behind it) and has a shadow.
- [x] **Today's challenge line**, using the play streak shown in the bar:
  - 0 days: "start a streak"
  - streak going: "…to keep your N-day streak" (vi: "…để giữ chuỗi N ngày")
  - after today's challenge is done: the cheer line

## Bug found and fixed on the way

An account made before the first appointment reloaded the page in a loop. Every boot writes a little (the tagline),
so the phone differed from the cloud save it had just synced. `decideSync` then downloaded again, because the phone
had 0 appointments. Now, if the cloud is what this phone last synced, only this phone changed, so it uploads. A fresh
phone that has never synced still takes the cloud's progress. The regression unit test was watched failing first, and
the e2e test checks that the page loads only twice.

A second bug, seen in the evidence: the "Delete your account?" confirmation always showed, both in Settings and in the
new "Your account" sheet. Its `display: flex` overrode `[hidden]`. Fixed with `.backup-confirm[hidden] { display: none; }`.
An e2e assertion was added and watched failing first.

## Tests

- Unit tests (`tests/daily.test.ts`):
  - the coin config
  - the welcome coins are given once and tips are kept
  - goal-ring and level-up coins, and none for a walk-out
  - the save keeps coins and drops nonsense values
  - the challenge-line key
- Unit test (`tests/account.test.ts`): the no-reload-loop sync rule.
- e2e tests (`game-flows.spec.ts`):
  - the gift goes into coins and tips are unchanged
  - the bar has 4 items in one row
  - the "keep your 3-day streak" line (watched failing first on the old streak source)
- e2e test (`progress-and-app.spec.ts`), the welcome page:
  - a first open shows it
  - Play without an account → home with the guest button and 20 coins; after a reload the page stays answered
  - the guest button opens the sign-in sheet
  - Create account → the initial with ✓, and Your account shows the email
  - a signed-in reopen skips the page, even with its stored answer removed
  - no reload loop
  - Sign in on another phone

## Evidence

`production/qa/evidence/story-057a2/`, en + vi at 320×568:

1. the welcome page
2. the guest top bar
3. the gift card in coins
4. the path top with the "keep" line
5. the path scrolled under the solid bar
6. the signed-in top bar
7. Your account
