# Story 069b — The combo visit: hands, then feet, then one checkout

Type: Visual/Feel (owner signs off) · Owner playtest 5 · Follows 069a (the foot, toe rules, combos on the menu).

## What
- **The combo visit.** A combo client (new scenario `combo-day`, medium clients) gets her hands done first. At the hands' Done there is no checkout yet. She says "They look lovely! Now my feet, please.", and after a short pause the station becomes her foot (a new station: short nails, square or round). The soak and scrub come first, as in a pedicure. At the feet's Done the visit goes to **one** checkout.
- **One bill line.** The bill is the combo from the menu: "Classic mani + pedi", or "Gel mani + spa pedi" when her usual is gel or spa. The Total step's menu price is that line.
- **One match.** The visit's match is the average of hands and feet. The review gets both descriptions. Each half moves her mood by half a single service's change (`moodShare` 0.5), so a combo moves it as much as one service.
- **The order card for the feet** starts with "🦶 Now the feet" / "Giờ tới chân".
- **069a review nit:** the order card is never cut at 320 px. "👣 big toes only" has its own line, and the card shows up to 3 lines.
- **068b review add:** tapping an answer on the companion's card puts it in the reply box. The player still taps Send or says it with 🎤 ("Tap a line to put it in your reply.").
- Config: config/combo.json (`moodShare`, `switchMs`, `feetLine`, `feetArt` false: no art on the feet unless set). Logic: game/combo.ts (`comboStages`, `comboScore`). No picture on a combo visit.

## Acceptance
- [x] Unit: the combo stages (hands as asked; feet both, short, square or round, no art); the average match; ONE combo bill line and no single services; combo.json validated; the combo-day scenario.
- [x] e2e (en + vi): hands (more than 2 shapes, no soak) → Done → `data-stage=feet`, soak and scrub → "Now the feet" on the order → 2 toe shapes → Done → the Total step has exactly one bill line (the combo), and the menu price equals it.
- [x] e2e: at 320 px the pedicure order card isn't cut. Watched failing on the old code, then passing.
- [x] e2e: tapping an answer line fills the reply box with "Short, please." and doesn't send it.
- [x] Evidence (en + vi, 320×568 @2×): production/qa/evidence/story-069b/: 1 hands, 2 "now my feet", 3 soak, 4 feet, 5 one checkout, 6 the answer card, 7 the answer in the reply box.

## OWNER
- OWNER: the photo and My work keep the feet (the last set). Keep both hands and feet?
- OWNER: feet with no art on a combo (`feetArt` false). Turn on art for toes in combos?
- OWNER: is a combo client only on medium days right?
