# Story 022: Roster expansion

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Config/Data
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

More characters (owner via the overseer, 2026-11-13). A client is a data file (story 006), so this is data plus checks.

## Acceptance Criteria

- [x] Six new clients (15 in total), five per difficulty: Jake (easy, man, first manicure), Ana (easy, non-native English speaker: simple English, patient), Marcus (medium, man, businessman on a lunch break), Lily (medium, a teen with her mom: two voices, mom watches the budget), Hana (hard, a nail tech from another salon: picky about technique), Derek (hard, man: complaint and redo).
- [x] Each has a persona, a nail request, a pronoun, a difficulty, an en/vi picker line, a look and male voice preferences for the men. Realistic but clean.
- [x] They fit the scenarios where it makes sense (data only; no code changes).
- [x] A `smoke:api` check for a new hard client (Hana stays in character, picky but clean).

## Test Evidence

**Status**: [x] `src/tests/roster.test.ts` and `production/qa/evidence/story-022-roster-expansion/`.

## Completion Notes (2026-11-13)

- Six files in `game/clients/` (no code). Lily's persona plays Lily and her mom, marking who speaks ("Lily: …", "Mom: …"). Ana speaks simple English with small mistakes, which the persona says never to mock.
- Scenarios: Lily joins "party tonight"; the bridal trial excludes the men and Lily.
- Marcus, Derek and Hana ask for plain nails on purpose; the story 017 test now checks its own art clients, and that every difficulty above easy still has art requests.
- **OWNER:** names, personas and Vietnamese picker lines of the six new clients; should Lily's mom have her own face later (art)?
