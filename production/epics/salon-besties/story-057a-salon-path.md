# Story 057a: Home becomes a path of salon days

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 3: "too plain, just words and symbols"; wants the daily, bite-size feel of popular learning apps,
with Salon Besties' own look (no copied layout, colours, characters or sounds).

## Acceptance Criteria

- [x] **Start opens the salon path**: a sticky top bar (🔥 streak, **Cấp / Level N** with the rank name and an XP bar,
  the **daily goal ring** "2/3" clients today), today's challenge card, then the day's stops as a winding path of
  round "nail" stops: done ones ticked ✓ (tap to play again), the current one big with **Bắt đầu / Start** (a soft
  glow, still with reduced motion), later ones locked 🔒.
- [x] Each stop is an **appointment** with a set client (day 1 easy, harder day by day within what the rank opened) or
  a **short lesson** (three starter phrases of one topic, ▶ Listen in the companion's voice, 🎤 Say it, "Hiểu rồi"
  finishes it, +5 XP the first time). Pattern, goal, lesson size and XP in `config/path.json`; progress in the save
  (`pathDone`).
- [x] **Khách khác / Other clients** opens the full picker (difficulty tabs, Random, Shift); Back returns to the path;
  Next client after the results returns to the path.
- [x] Level-ups: the existing rank-up celebration; the XP bar fills toward the next level.
- [x] Overseer follow-up (056): the home screen's streak, wallet and gift are ONE top bar, left of the EN | VI switch;
  nothing overlaps it at 320×568 (the gift drops its word, then the ❄️, if the wallet is long).

OWNER: please sign. The path's look is our own (pink and cream nail stops), with placeholder client faces until the
designer's art.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/path.test.ts` (the day pattern, lessons by topic, harder days within the opened ranks, done / current /
  locked, finishing only moves on from the current stop, the goal ring count).
- e2e (en + vi): the home bar is one row clear of the switch; the path's bar, goal 0/3, today's challenge, the current
  stop; playing it → done ✓, the next stop current, goal 1/3; a lesson stop → 3 phrases → done and +5 XP; Other
  clients opens the picker. Every older flow still reaches today's challenge from the path.
- Screens at 320×568: `production/qa/evidence/story-057a/`.
