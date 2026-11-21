# Story 071a — Pedicure and combo clients actually show up

Type: Feature + Visual (owner signs off) · Owner playtest answers, Sat 11-21.
071b is the second half: both photos on the combo results, and what each service includes on the menu.

## Why
The owner played many times and never got a pedicure or combo client. Only 2 of 10 scenarios carried them, and only behind a scenario chance.

## What
- **Feet bookings on the salon path** (config/path.json `feet`, game/path.ts `bookedService`). Once the player has had 2 appointment stops (`afterVisits`), every salon day books at least one pedicure-or-combo guest (a stable pick of that day's slots). Each other stop is one with chance `extraChance` (0.05). That makes about 29% of visits; the unit test checks 25–32% over 400 days. `comboShare` 0.4 of them are combos.
  - A feet booking brings its scenario. Her own variant comes first; otherwise one for anyone who fits (`feetScenario`).
  - "Today's appointments" shows the service in green, e.g. "#4 Classic pedi + Art", "#20 Mani + pedi".
- **11 new scenarios** (21 in all):
  - Pedicures for anyone: `beach-gel-pedi` (easy, gel on the toes for a beach trip), `rough-heels` (medium, "my heels are so rough", callus care), `toe-art-picture` (hard, she always brings a picture of big-toe gem art; new `picture: true`).
  - Combos for anyone: `combo-treat` (easy), `spa-combo-picky` (hard, "the full spa pedicure: scrub, mask, massage, everything"). `combo-day` now takes every medium client.
  - Persona variants, in her own words: `rosa-spa-pedi`, `jake-first-pedi`, `marcus-quick-pedi`, `kim-combo-deal`, `priya-combo`, `victoria-gel-combo`.
  - Every one of the 16 clients can book both a pedicure and a combo (unit test).
- **Her extras on the bill:** a scenario's `nailRequest.extras` adds menu items (gel on the toes, callus care) or names her pedicure (a spa pedicure).
- **New add-ons on the menu** (all presets): Gel polish on toes (+$10 / $12 / $15), Callus treatment (+$8 / $10 / $15), Hot stone massage (+$6 / $8 / $12). They have icons and en/vi names; sources are in config/menu.json `_note`. The menu now has 21 items (`maxItems` 24).
- **Art on combo toes** (owner, `feetArt` true). When she asks for art, the feet take it on the big toes (the accent).
- **Testers' chooser.** With an unlock-all code, the path shows "Tester: next client — Manicure / Pedicure / Combo". The choice applies to the next booked stop. Non-gated builds now also ask the server once (in the background) whether the session unlocks everything; the server still decides.

## Acceptance
- [x] Unit (tests/feet-bookings.test.ts):
  - nothing before 2 visits, then at least one feet booking every day for 60 days
  - 25–32% overall, with both kinds
  - the node carries its service
  - path.json validated
  - every client finds both kinds, her own variant first
  - at least 4 of each kind, across easy, medium and hard
- [x] Unit: combo toes take the big-toe accent when she asks for art; the scenario list and eligibility are updated; the menu numbers are Add-ons 11–19, Combos 20–21.
- [x] e2e (en + vi): on day 3 the card has at least one pedicure/combo row; there is no chooser without a tester code; with one, Pedicure makes the next stop a pedicure (soak and scrub).
- [x] Evidence (en + vi, 320×568 @2×): production/qa/evidence/story-071/ — `*-1-tester-chooser.png`, `*-2-appointments.png`.

## OWNER
- OWNER: is about 29% of visits right (`feet.extraChance` / `comboShare` in config/path.json)?
- OWNER: the add-on prices (gel toes, callus care, hot stones) are a template, editable like the rest of the menu.
