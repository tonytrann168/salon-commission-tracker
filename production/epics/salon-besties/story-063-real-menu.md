# Story 063: A real salon menu, with icons and add-ons

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4: the menu should look like a real US nail salon's in 2026. Price ranges from Zenoti, ThePricer and
Boulevard:

| Service | 2026 price range |
|---|---|
| Basic manicure | $25–45 |
| Gel manicure | $35–70 |
| Dip powder | $40–60 |
| Acrylic full set | $45–75 |
| Fill | $30–50 |
| French tip | +$5–25 |
| Nail art | +$5–20 |
| Removal | +$10–25 |
| Pedicure | $25–40+ |

The overseer's 062 review:
- The path had two "today" cards that disagreed.
- Appointment services were cut off and all #1.

## Acceptance Criteria

- [x] **The menu** has 16 numbered items in four groups, each with a small drawn icon (code SVG; the designer's art can
  replace it later):
  - **Manicure**: 1 Classic manicure, 2 Gel manicure, 3 Deluxe spa manicure
  - **Pedicure**: 4 Classic pedicure, 5 Spa pedicure, 6 Jelly pedicure
  - **Nail enhancements**: 7 Acrylic full set, 8 Acrylic fill, 9 Dip powder, 10 Gel-X extensions
  - **Add-ons** (shown "+$"): 11 French tip, 12 Chrome, 13 Nail art (per nail), 14 Gel removal, 15 Paraffin wax,
    16 Polish change
- [x] **Prices** (classic manicure / gel / acrylic full set / French tip):

  | Preset | Prices |
  |---|---|
  | Basic | $25 / $35 / $45 / +$5 |
  | Mid (about the medians) | $35 / $50 / $60 / +$15 |
  | Fancy | $45 / $70 / $75 / +$25 |

  Each item's price rises from Basic to Mid to Fancy. "My own" stays editable; its tag list has the new services.
  Older own menus (fullSet, ombre, gems, extensions) still work.
- [x] **Her order**: each client has her usual base (classic, gel or spa manicure; classic, spa or jelly pedicure),
  chosen by a stable hash of who she is. Long nails are an acrylic full set. Gems and stickers are nail art, and
  some clients add a French tip. The AI client sees the menu in its groups. She orders by number and may name an
  add-on with it ("number 2 with French tip"). The checkout receipt lists every line, add-ons included.
- [x] The price-sensitive remark now triggers over **$40** (it was $45; the new prices are higher).
- [x] **062 review**:
  - There is one "today" card: today's challenge is its first row (⭐ Today's challenge, with the streak line),
    then the booked guests. A guest is listed only once.
  - Services use short names ("#2 Gel mani + Art + French") and wrap to two lines instead of being cut.
  - The new menu gives the appointments variety.
- [x] The order-by-number smoke check still works (her numbers are on the menu).

## Tests

- Unit tests (`tests/menu.test.ts`):
  - the groups and numbers
  - Mid sits within the 2026 ranges, and Basic ≤ Mid ≤ Fancy item by item
  - her order (manicure, pedicure, acrylic for long nails, art as an add-on)
  - an older own menu still works
  - each client has a stable usual, with variety and some French tips
  - the prompt lists the groups and "+$" add-ons, and "with" joins her order
- e2e tests:
  - "salon menu": Fancy $45, 4 groups, 16 icons, her order and total from what was sent to the client, the receipt
  - "menu first": 16 items
  - "flexible days": one today card, the ⭐ challenge row, each guest once
  - "agreed price": now $30, since the new prices are higher

## Evidence

`production/qa/evidence/story-063/`, en + vi at 320×568, 2× DPR:

1. the one today card
2. the menu top (Manicure, Pedicure)
3. Nail enhancements
4. Add-ons
