# Story 069a — A real foot, toe rules, big-toe accent, combos on the menu

Type: Visual/Feel (owner signs off) · Owner playtest 5 · Split: 069b is the combo flow (hands → feet → one checkout).

## What
- **A real foot.** The pedicure station draws a foot (a sole with five toes sitting on it), not fingers on a palm. The big toe is clearly the largest; the four small toes get shorter. Toenails are much shorter and wider than fingernails (config/nail-art.json `foot`, `kind: "foot"`).
- **Toe rules.** Toes take short nails only, square or round only (`PEDICURE_SHAPES`, `PEDICURE_LENGTHS`). A pedicure request is kept to these (`pedicureRequest`); the station shows only the two shapes and one length.
- **Art scales to the nail.** Decorations size to the short, wide toenail.
- **Big-toe accent.** A request can say `accent: "bigToe"` (the common pedicure accent). Only big-toe art counts for the match; art on the small toes halves the extras score. Her order card says "big toes only" / "chỉ ngón cái"; her picture (hard clients) puts the art on the big toes. The pedicure-day scenario now uses it.
- **Pictures for feet.** Hard pedicure clients can bring a picture too; the Match % works the same.
- **Combos on the menu (17–18).** "Classic mani + pedi" and "Gel mani + spa pedi", each about 12% cheaper than its two services, showing "Save $N vs separately". Prices from 2026 US guides (sources in config/menu.json `_note`: usecalcpro mani-pedi calculator, Groupon pedicure guide, Zenoti, Boulevard, ThePricer).

## Acceptance
- [x] Foot config: big toe area > 2× each small toe; every toenail wider than tall (tests/pedicure.test.ts).
- [x] Pedicure request → square/round, short; manicure unchanged.
- [x] Big-toe accent: big-toe art scores higher than the same art on small toes; picture art on big toes only.
- [x] Every preset has both combos, saving 8–25%.
- [x] e2e: pedicure station shows 2 shapes, 1 length, "big toes only"; menu has 18 items in 5 groups.
- [x] Evidence en + vi, 320×568 @2×: production/qa/evidence/story-069a/ (foot shapes, foot art step, combo menu).

## OWNER
- OWNER: combo prices (Mid $60 / $88, Basic $44 / $62, Fancy $79 / $119) — about 12% off; change in config/menu.json.
- OWNER: is the foot drawing good enough until the designer's art, or do you want toes drawn differently?
- OWNER: choosing a combo today only adds the line to the bill; the hands → feet flow with one checkout is 069b.
