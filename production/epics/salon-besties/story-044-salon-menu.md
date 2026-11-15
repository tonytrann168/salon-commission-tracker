# Story 044: Salon menu with numbers

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Gameplay
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: real salons have a numbered menu on the wall and clients order by number ("number 2 and number 5").

## Acceptance Criteria

- [x] **Basic / Mid / Fancy** price sets (`config/menu.json`; Mid keeps the old prices: manicure $25, both hands $35,
  pedicure $35), or **my own menu**: English and Vietnamese names, a price ($1–200), what each item is, add and remove
  (1–12 items). Settings → Your salon menu. Saved with the game (so backups and the account carry it).
- [x] **📋 Menu / Bảng giá** at the top left of the face area during consultation and checkout (not during the
  service): the numbered menu with English and Vietnamese names; at checkout her order is marked with the total.
- [x] Her order follows her nail request (base service, both hands, ombre, gems, nail art, long nails) and is found on
  any menu by what each item is (`game/menu.ts`); an item the menu lacks is left off.
- [x] The AI client gets the menu and her order numbers and orders by number; the server re-checks the menu from the
  browser (plain names, prices in range, only numbers on the menu).
- [x] Checkout rings up the ordered items on the payment card ("#1 Manicure $25, #5 Gems $8, Total $33").
- [x] Pretend money: the menu is what the client pays the salon; the wallet still gets only the tip.
- [x] Overseer follow-up on 050: My work thumbnails and the big view show the whole photo (contain, not cover).

OWNER: should Fancy prices make some clients less happy (or tip less), and Basic more? Today the price set changes
only what is shown and rung up.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/menu.test.ts` (Mid = old prices, her order by number, a menu missing items, the save, bad config, the
  prompt, the server's re-check).
- e2e (en + vi): Fancy in Settings → the client-turn request carries the menu and order [1]; 📋 Menu in consultation
  (7 items, nothing marked), hidden in the service, at checkout her order marked with $40; the bill rings up #1 and
  $40; my own menu saves a changed price.
- Screens at 320 px: `production/qa/evidence/story-044/`.
