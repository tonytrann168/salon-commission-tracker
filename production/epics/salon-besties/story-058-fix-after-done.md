# Story 058 (urgent bug): Fix it after Done

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Logic + Integration (bug)
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4 (Sun 11-15). At checkout, Grace said: "there is some polish on my skin near one nail… a bit more red
than coral". The player said "Let me fix it for you" and she agreed, but there was no button.

Root cause (`chat-panel.ts`): `askFix()` only worked while the station was open and not `ending`. After a normal Done,
`afterDone()` closes the station and checkout runs in the chat, so a complaint in her checkout replies could never
open a fix.

## Acceptance Criteria

- [x] After Done (at checkout), each of her replies is checked for fix requests. One line can carry several:
  `fixKindsOf` finds both "polish on my skin" (edge) and "a bit more red than coral" (colour).
- [x] When she asks, a clear orange **🔧 Fix it** (vi: **Sửa lại**) button shows above the reply bar. It also shows
  when the player offers a fix ("let me fix", "I'll fix", "I can clean", "để em sửa", "em sửa liền"). Those
  patterns are in `config/fix-requests.json` `playerOffers`.
- [x] Fix it reopens the station on the Fix it step with those requests open: Clean / Rub, Remover, colour. The next
  Done returns to checkout. For each request she says thanks and gains `fixedMood` (fixed), or says her open line and
  loses `openMood` (not fixed). The results and the companion's debrief see the outcome. The set's nail mood is not
  counted a second time.
- [x] A colour that is not what she asked for is a colour request: "more red than coral", "not quite the shade I asked
  for", "isn't the colour I wanted".

## Tests

- Unit tests (`tests/fix-requests.test.ts`):
  - her real line → `['edge', 'colour']`
  - another colour line
  - non-requests → `[]`
  - the player's offers in English and Vietnamese, and non-offers
- e2e test (`game-flows.spec.ts` "Fix it after Done"), en + vi, the owner's exact flow:
  1. Done
  2. her checkout complaint
  3. Fix it → the station on the Fix it step
  4. a new colour, and rub the skin
  5. Done
  6. her thanks
  7. the payment and results, with a fix shown as done

  This test was watched failing on the old `chat-panel.ts` (no Fix it after her complaint) before the fix.

## Evidence

`production/qa/evidence/story-058/`, en + vi at 320×568, 2× DPR:

1. checkout with Fix it
2. the station on the Fix it step
3. her reaction back at checkout

In the en run, the colour counted as fixed but the skin edge did not, so she thanks for the colour and says the edge is
still open. That is the intended reaction to a half-done fix.
