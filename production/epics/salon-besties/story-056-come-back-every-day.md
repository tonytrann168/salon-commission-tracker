# Story 056: Come back every day

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel + economy)
> **Layer**: Feature
> **Type**: Visual/Feel + economy
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 3: a reason to come back every day, the bite-size daily feel.

## Acceptance Criteria

- [x] **Streak**: a local day with at least one finished appointment counts (a walk-out does not). The home screen
  shows the flame and the day count, top left (grey at 0, orange when alive), ❄️ when a freeze is held.
- [x] **One free streak freeze a week**, earned by playing that week (never bought); it covers exactly one missed
  day; at most one is kept.
- [x] **Daily free gift**: 🎁 Quà on the home screen (it wiggles while waiting), opened once a day: $3–6 of in-game
  tips, sometimes a +$5 lucky bonus. **Streak milestones** at 3, 7, 14 and 30 days give bigger gifts ($15, $30, $50,
  $100), once each per streak.
- [x] **Wallet**: the tips the player earns plus the gifts are the in-game money, one wallet, shown on the home
  screen (👛 $35) and in the shop.
- [x] **Shop**: a "Coming soon" section: outfits for Mai/Long, plants and flowers, salon lights, wall pictures
  (locked, no art yet; "never with real money").
- [x] Hard rule kept: no real-money purchases, nothing pay-to-win, English help never sold. All amounts in
  `config/daily.json`. Synced through the save (`play`).
- [x] The profile's 🔥 is now this play streak.

OWNER: the gift amounts, the milestones and the freeze rule are in `config/daily.json`. One wallet: gifts add to the
same tips; say if gifts should be a separate "coins" currency.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/daily.test.ts` (dates and weeks, the streak once a day, starting over, the weekly freeze covering one
  missed day, alive today, a walk-out does not count, the save keeps it, the gift once a day with its range and bonus,
  milestones once per streak, bad config).
- e2e (en + vi): the home streak at 0, the wallet, the gift opened once into the wallet (still opened after a
  reload), a finished appointment lights the streak at 1, the shop's four Coming soon tiles.
- Screens at 320 px: `production/qa/evidence/story-056/`.
