# Story 039: Checkout you've earned

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review; owner phone check for feel)
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-14

## Context

Owner playtest: make payment rewarding.

## Acceptance Criteria

- [x] When the results are ready, the client pays first: a register "ka-ching" with the service price (pretend money,
  from data: manicure / pedicure / both hands), then the tip counting up with its parts itemised (service, matched
  her request, happy client, situation handled). The parts always add up to the tip the scoring gave.
- [x] Coins and bills fly to the wallet; the stars appear one by one with sound; the companion cheers in a line that
  fits the result (en/vi, tokens); then the client's review and the rest of the results appear.
- [x] Under ~6 s (timings in `config/payment.json`), skippable with a tap; reduced motion → the totals at once.
- [x] Only the tip goes to the wallet, as before (the price is the salon's). Nothing is sold.
- [x] Unit tests (parts sum to the tip for every tip 0–20 and any inputs; price by service; timeline under 6 s).
  Evidence en + vi at 320 px.

## Test Evidence

**Status**: [x] `tests/payment.test.ts` (6 tests). e2e (en + vi): the manicure flow checks the price, that the
itemised parts add up to the tip, and that the review follows. Screens: `production/qa/evidence/story-039-checkout/`.

## Completion Notes (2026-11-14)

- `game/payment.ts` + `config/payment.json`; `game/ui/payment-card.ts`; the rest of the results is hidden
  (`.chat-results.paying`) until the sequence ends (~5 s for 5 stars and 4 parts; a tap skips).
- The itemised parts are a presentation of the one tip the scoring gives (shares weighted by nail match and mood);
  the scoring itself is unchanged. No "neatness" part: the match score already includes spills.
- Found while taking evidence: an English review without its lists crashed the results (the error screen). The
  browser now checks the review's shape and shows the normal "couldn't finish" message.
- **OWNER:** prices ($25 manicure, $35 pedicure, +$10 both hands) are pretend and only shown; say if the salon's price
  should count toward anything.
