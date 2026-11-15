# Story 062: Path — flexible days and Today's appointments

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4:
- Days should not force the player to finish every stop.
- Booked appointments are part of a nail tech's day, and a rewarding one.

The overseer's 061 review asked that the grade badge sit on the line it grades.

## Acceptance Criteria

- [x] **Flexible days**: coming back on a later calendar day to a salon day that was started but not finished asks:
  - **Continue Day N (3 of 5 done)**, or
  - **Start Day N+1**

  Starting the next day closes the old one with however many clients were served (no penalty), and a small
  "Day 1: 2 clients ✓" note shows. Continue keeps the day, and it doesn't ask again that day. The save keeps
  `pathDayOn` (the calendar day the path was last played) and `pathLog` (the last 7 closed days).
- [x] **📅 Today's appointments**: "You have 4 appointments today", with each booked guest's face, name, time
  (10:00, then every 90 minutes) and service from the salon menu ("#1 Manicure + #4 …", the same order she will
  give). The day's appointment stops are the booked guests, each a different guest. A booked guest gives +5 XP.
  Walk-ins (Other clients) can come between them. The numbers are in `config/path.json` `booked`.
- [x] **Later, not now**: the player schedules, accepts and reschedules appointments. This is noted in
  `design/game-brief.md` (Out of scope).
- [x] **061 review**: the grade badge is pinned to the top-right corner of the line it grades, above its words, and
  every graded line keeps its badge. While painting (the chat folded away) a grade floats as before. Perfect also
  gets its big floating moment with confetti.

## Tests

- Unit tests (`tests/path.test.ts`):
  - day progress
  - when to ask
  - start next day (and its log)
  - today's booked guests and their times
  - a different guest per appointment of a day
  - the booked XP bonus (none on a walk-out)
  - the save fields
- e2e test (`game-flows.spec.ts` "flexible days"), en + vi:
  - Start Day 2: the old day closes ("Day 1: 2 clients ✓"), the path moves on, and the appointments show times and
    services; no overflow
  - Continue: the same stop, and no question after a reload
- e2e test (`game-flows.spec.ts` "every line graded"): the badge is in its own bubble, above the words, at the
  right. This was watched failing on the old chat panel (the badge floated). Each graded line keeps its badge.

## Evidence

`production/qa/evidence/story-062/`, en + vi at 320×568, 2× DPR:

1. continue or start the next day
2. the day's note and the start of today's appointments
3. today's appointments
4. grades pinned to their lines
