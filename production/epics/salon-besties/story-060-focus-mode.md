# Story 060: Focus mode while painting; the Menu chip off her face

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4:
- While painting, the chat should get out of the way and her lines should never be missed.
- The "📋 Menu" chip at the top left covered the client's face while she talked.

The overseer's notes on 058:
- The hint card covered the hand.
- The hint said "Tap Fix it" when the player was already on that step.
- The tool row was cut off at the right with no sign there was more.

## Acceptance Criteria

- [x] **Focus mode**: during the service the nail station has the screen (its header is slimmer). The chat is a slim
  bar at the bottom: **💬 Reply to Lily** (vi: Trả lời Lily). It turns pink with a dot while she has an unread line,
  and opens the reply sheet.
- [x] **Her line pops** as a bubble above the hands, with a soft ding (new `ding` sound, 0.3 s) and a short vibration
  where the phone supports it. It stays until read: tap it to reply (the reply sheet opens), or ✕ to dismiss. A new
  line replaces it.
- [x] **📋 Menu** is a small icon button in the mood row (consultation and checkout), above the portraits. It never
  covers her face. The e2e test checks it sits above the portrait zone.
- [x] **Hints** use the step instruction's full-width strip at the bottom edge of the hand area: two lines at most,
  never a tall card over the nails.
- [x] **On the Fix it step** the hint names the next action, because the step opens by itself:
  - "She wants a different colour: tap Remove all, then paint a new colour."
  - "…: rub the polish off the skin."
  - "…: pick a length."
  Both en and vi are updated.
- [x] **The tool row** shows a › button beside it while more tools are hidden to the right (for example the
  colours on the Fix it step). Tapping it scrolls the row; swiping still works.

## Tests

- e2e test (`game-flows.spec.ts` "focus mode"), en + vi:
  - 📋 is in the mood row, above the portraits
  - her line pops with ✕, and the bar shows unread
  - the chat form is hidden in service
  - ✕ clears the bubble and the dot
  - the bar opens the reply sheet; sending returns to the nails, and her next line pops
  - tapping her bubble opens the reply sheet and marks it read
- The story 035/048/058 service tests still pass: the station row still scrolls, the hand keeps its room
  (more than 150 px), and the swatches can be reached on the Fix it step.
- Unit test (`tests/audio.test.ts`): the sfx list now includes `ding`.

## Evidence

`production/qa/evidence/story-060/`, en + vi at 320×568, 2× DPR:

1. 📋 in the mood row (consultation)
2. her line popped and unread, with ✕ and the pink bar
3. after ✕: the full station and the slim bar
4. the Fix it step with the new hint and the › for more tools
