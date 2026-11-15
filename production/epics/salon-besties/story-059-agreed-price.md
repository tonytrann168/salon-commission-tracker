# Story 059 (urgent): The price matches what was agreed

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4: the owner gave a discount ($40 → $35) in the conversation, but the receipt still said $40.

## Acceptance Criteria

- [x] The client-turn tool has an optional `agreedTotal` (dollars): the price agreed in the chat (a discount, or a
  price she accepted). It is in the schema and the prompt (a PRICE section), and the server parses it, keeping
  1–1000 and rounding to whole dollars. The appointment keeps the latest one and passes it to the results.
- [x] **The Total step** at checkout, before the payment, for completed visits. It shows:
  - her order lines and the menu price
  - "Agreed in the chat: $35", when there was one
  - the total, pre-filled with the agreed price (else the menu price)
  - − / + buttons, quick chips (−$5, −10%, Menu price), or type a number
  - "Discount −$5" when the total is under the menu price
  - **Charge $35**
  Grading runs in the background meanwhile.
- [x] **The receipt** lists a Discount line (or an Extra line), and the total is what she pays.
- [x] **Her reaction**:

  | What you charge | Mood | Tip | Results note |
  |---|---|---|---|
  | More than agreed (or more than the menu price) | −2 per dollar, at most −20 | × 0.5 | "noticed you charged more…" |
  | The agreed price | neutral | normal | "pays the price you agreed. Fair and friendly!" |
  | A small discount she didn't ask for | +3 | normal | "is happy with the little discount" |

  Her tip also follows what she pays: tip × charged ÷ menu price. All numbers are in `config/payment.json`
  `charge`.
- [x] Smoke check: a client-turn where she accepts "$35 instead of $40" returns `agreedTotal` 35.

## Tests

- Unit tests (`tests/charge.test.ts`):
  - the expected price
  - typed totals are kept sensible
  - agreed, menu, over and discount reactions
  - the tip follows the price paid
  - the config refuses bad values
  - the appointment keeps the latest agreedTotal and passes it to the result
- Unit test (`tests/english-level.test.ts`): the server keeps a sensible agreedTotal and drops anything else.
- e2e test (`game-flows.spec.ts` "the agreed price"), en + vi:
  - the agreed $20 fills the Total step, with the Discount shown
  - the − / + and Menu price chips work
  - Charge $20 → the receipt shows the discount and the $20 total
  - her "agreed" note
  This test was watched failing on the old `results-screen.ts` (no Total step; the menu price was charged).
- All e2e flows now pass the Total step through the `toResults` / `finishAppointment` fixtures, which charge the
  pre-filled total.

## Evidence

`production/qa/evidence/story-059/`, en + vi at 320×568, 2× DPR: the Total step with the agreed price, and the
receipt with the discount.
