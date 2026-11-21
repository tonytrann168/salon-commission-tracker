# Story 071b — Combo results with both photos; what each service includes

Type: Visual/Feel (owner signs off) · Owner playtest answers, Sat 11-21 · The second half of 071 (071a: feet bookings).

## What
- **Combo results show both photos:** hands and feet side by side, each with its own Match %, then "Overall match: N%" (the average, which also drives the stars and tip as before). The hands' photo is taken at the hands' Done, while the hand is still on the stage. A pedicure alone shows the feet, as before. My work still keeps the last photo (the feet).
- **What each service includes**, under its name on the menu (en/vi; config/menu.json `includes`):
  - Classic pedicure: soak, trim and shape, cuticle care, callus removal, short massage, polish ($35 Mid).
  - Spa pedicure: the classic steps plus sugar scrub, mask, hot towels, a longer foot and calf massage ($50 Mid).
  - The same for the manicures, enhancements, combos and the new add-ons.
  - Sources are in the `_note`: Groupon pedicure guide 2026; Diamond Nails & Spa, Modern Nails Spa and Phoenix Nails Spa menus.
  - A player's own menu stays fully editable; its own items have no includes.
- **Clients ask about them.** The client's menu prompt lists what each service includes and lets her ask once what hers includes (especially a pedicure, a spa service or a combo), and notice a skipped step.
- **The spa steps the game doesn't play** (mask, hot towels, the longer massage, hot stones, paraffin) are a short line from her after the soak and scrub, when her order has one of those items (config/pedicure-prep.json `relax`). No new mini-game.

## Acceptance
- [x] Unit:
  - every preset's pedicure, spa pedicure, combos, manicure and new add-ons have includes in en and vi, and the pedicure lists soak, callus, massage, polish
  - a spa pedicure with hot stones rings up both
  - the prompt carries the includes and the "ask once" rule
  - a spa step gives her relax line; a classic pedicure gives none
- [x] e2e (en + vi): the menu sheet shows the includes under the classic pedicure; the combo visit's results have 2 photos, 2 matches and the overall match.
- [x] Evidence (en + vi, 320×568 @2×): production/qa/evidence/story-071/ — `*-3-menu-includes.png`, `*-4-combo-results.png`.

## OWNER
- OWNER: My work keeps the feet photo after a combo. Keep both?
- OWNER: are the includes texts right for your salon? They're in config/menu.json, per preset.
