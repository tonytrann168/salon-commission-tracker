# Story 075 — Owner answers (26 Nov): a random service mix; a natural-size cotton pad

Type: Tuning (owner decisions) · Follows 071a and 073.

## Owner answers
- Pedicure and manicure: **"just mix them up, no fixed rate."**
- Rubbing size: **"whatever makes it look most natural to play."**
- Clean edges wait: keep the 1.2 s pause (`tidy.seconds`, unchanged).
- Unfinished visits: keep 24 h (`maxAgeHours`, unchanged).
- Menu template (add-on prices, "includes" texts): keep (unchanged).

## What changed
- **A random mix, no quota** (config/path.json `feet`; `bookedService` in game/path.ts).
  - The daily guarantee and the fixed share are gone. After the first 2 visits (which teach the basics on a manicure), each booking is a random pick of manicure, pedicure or combo by `feet.mix` (equal weights), stable for that stop so the day's list never changes.
  - Some days have several pedicures or combos, some none. Days 1–6 now read: 1 combo; 1 pedicure + 1 combo; 1 combo; 4 feet; 4 feet; 2 combos.
- **The cotton pad is the size of what it cleans.** The pad is drawn at the rub's reach (44–84 px), still lifted 40 px above the finger, with the faint ring where it cleans. The two read as one tool. The reach itself is unchanged from 073.

## Acceptance
- [x] Unit:
  - the first visits are manicures
  - over 400 days each service is between 15% and 55%
  - some days have no feet booking and some have 3 or more (no quota)
  - stable picks
  - day 3 (the e2e fixture) has one
  - path.json `feet.mix` validated
- [x] npm test and e2e green.
- [x] Evidence: production/qa/evidence/story-075/ — `*-rubbing.png` (en + vi, 320×568 @2×).

## OWNER
- OWNER: no action needed (all answered). Still open from 074: "swap seats" (the player as customer): want it as a story, and when?
