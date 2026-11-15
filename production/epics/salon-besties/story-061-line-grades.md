# Story 061: Grade every line, not only "Perfect"

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4: the feedback should match how good the line really was, not only celebrate the best ones.

## Acceptance Criteria

- [x] Every line the player sends gets one of four badges:

  | Badge (en / vi) | When |
  |---|---|
  | **Try this 💡** / Thử câu này 💡 | the line check found a real fix; the fix waits on the companion's badge, as before |
  | **Good 👍** / Được đó 👍 | a small fix, a helped line, or a line too short to check |
  | **Great ✨** / Hay lắm ✨ | nothing to fix, a shorter line |
  | **Perfect line! 🌟** / Câu chuẩn luôn! 🌟 | nothing to fix, 6+ English words |

- [x] **What decides the grade**:
  - **Fix size**: the share of the better line's words that are new. At most 0.3 counts as a small fix (Good);
    more is Try this.
  - **A helped line** is never more than Good.
  - **Length** decides Great vs Perfect.
  - All thresholds are in `config/juice.json` `grades`: `perfectWords`, `smallFixShare`, `showMs`.
- [x] **Only Perfect gets confetti**, the correct sound and the companion's cheer. Great makes her smile. Try this
  and Good are a small, calm badge. The old Perfect rule (`isPerfectLine`, `perfect.minWords`) is replaced by
  `lineGrade`.
- [x] The line check now runs for every line long enough to check, even after the tip cap. The tips themselves stay
  capped by the companion's badge.

## Tests

- Unit tests (`tests/juice.test.ts`):
  - Perfect vs Great by length
  - Try this vs Good by fix size
  - helped and too-short lines are Good
  - `fixSize`
  - the config refuses a bad `smallFixShare`
- e2e test (`game-flows.spec.ts` "every line graded"), en + vi:
  - a line with a real fix shows Try this, without confetti
  - a short line shows Good, without confetti
- The 057b juice e2e test still checks Perfect with confetti.

## Evidence

`production/qa/evidence/story-061/`, en + vi at 320×568, 2× DPR: one shot each for Try this, Good, Great and
Perfect.
