# Story 064: Hard level — a hangnail, the Nipper, a small slip and first aid

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4: the hard level should include real salon care. A hangnail to trim, a small slip handled kindly with
first aid and a sorry. Never gory. Nothing needs fast reflexes.

## Acceptance Criteria

- [x] **Who has one**: some hard clients have a hangnail on one finger (never the thumb). About half of them, by a
  stable hash of the visit; no pedicures. She mentions it, and the station hint says how to trim it.
- [x] **The Nipper**: a new "✂️ Nipper" (vi: Kềm) in the Clean row. With it on, the hand isn't painted.
- [x] **Trimming**:
  - Hold steadily on the hangnail until the ring fills (0.9 s): a clean trim, her thanks, a little mood.
  - A quick snip (let go before 0.3 s) or a hard press (touch or pen pressure above 0.85) slips: a tiny red dot,
    her "Ouch!", and −12 mood.
  - In between: "Hold a little longer, gently."
- [x] **First aid** takes over the tool row: **1 · Apply styptic**, then **2 · Bandage** (+6 mood). Nothing covers
  the hand or the nick. The dot turns into a small bandage.
- [x] **Sorry**: "Now say sorry in the chat". Saying sorry in English or Vietnamese adds +3.
- [x] **Left at Done**: a hangnail still there at Done costs −4 and her line, once.
- [x] Hard difficulty only. Every number and her lines are in `config/hangnail.json`.

## Tests

- Unit tests (`tests/hangnail.test.ts`):
  - hard clients only, about the configured share, never the thumb, stable per visit
  - clean / slip / hold longer
  - sorry in English and Vietnamese
  - the config refuses bad values
- e2e test (`game-flows.spec.ts` "hard level"), en + vi, with Hana (hard):
  - a quick snip slips (a dot, a mood dip), and the first-aid steps are in the tool row below the nick
  - Bandage waits for styptic, and the mood goes up after first aid
  - the sorry hint shows, and a sorry lifts the mood
  - a steady hold trims it clean and the Nipper goes; Done brings no "still bugging me"

## Bugs found on the way

The evidence showed that her "Ouch!" bubble covered a first-aid card in Vietnamese, and a card in the hand area hid
the nick. First aid now uses the tool row.

## Evidence

`production/qa/evidence/story-064/`, en + vi at 320×568, 2× DPR:

1. her hangnail notice
2. the Nipper on (the hangnail ringed)
3. a slip: the tiny dot, and first aid in the tool row
4. bandaged, and "say sorry"
