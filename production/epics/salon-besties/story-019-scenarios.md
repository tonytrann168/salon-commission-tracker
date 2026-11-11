# Story 019: Scenarios — same clients, new situations

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Config/Data
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

The owner expects many more scenarios and characters (via the overseer, 2026-11-10), so variety must be cheap: a scenario is a data file layered over a client, adding an occasion, constraints, an opening line and (optionally) a different nail request.

## Acceptance Criteria

- [x] Scenarios are JSON files in `src/game/scenarios/` (a new one needs no code): id, name and a short picker tag (en/vi: the scenario's two lines of text), difficulty, eligibility (which client difficulties or clients; "returning" ones need a past visit), occasion and constraints (for the AI), an English opening line, an optional nail-request override.
- [x] Six scenarios: bridal trial (perfect, nervous, white/nude + French tips, both hands); prom/party (sparkle, gems, a time limit); walk-in during a rush ("can you squeeze me in?", apologise + wait time); returning client (remembers the last visit: "last time it chipped", from this client's history in the save); gift card / price confusion (explain prices politely); elderly regular (speaks slowly, gentle hands, short round nails).
- [x] The save keeps a small history per client (visits, last stars, last day), so "returning" is only offered after a real visit.
- [x] The daily client may come with a scenario (picked from the date among the eligible ones); Random sometimes adds one. The picker shows the scenario's tag.
- [x] Scenarios flow into the client-turn and grading prompts (an optional `scenarioId`, plus the visit facts for a returning client); requests without them work as before.
- [x] The opening line and the nail request come from the scenario when it has them; the nail station and matching use the merged request.
- [x] Tests for eligibility, merging and prompt inclusion; a `smoke:api` check (walk-in: the client asks about the wait).
- [x] Evidence: 320 px, en and vi: the picker with a scenario tag, and one chat.

## Out of Scope

- New characters (the roster stays at nine; adding one is a data file, story 006).

## Test Evidence

**Status**: [x] `src/tests/scenarios.test.ts` and `production/qa/evidence/story-019-scenarios/`.

## Completion Notes (2026-11-10)

- `game/scenarios/*.json` (six files) + `scenarios.ts` (parse, eligibility, merge, prompt text, stable pick) + `index.ts` (loads the folder; `parseScenarioFields` for requests). Odds in `config/scenario-odds.json` (daily 0.6, Random 0.5).
- Each scenario's two lines of text (name, tag; en and vi) live in its file, like the clients' picker lines.
- The save (still version 1) keeps `history` per client: visits, last stars, last day; older saves read as empty. "Returning client" is offered only after a real visit and the prompt gets those facts.
- The daily client's scenario is chosen once (from the date) and kept in the save for the day; Random adds one sometimes; a shift does not (yet).
- Prompts: the client turn gets "Today's situation: …" and the scenario's nail request; grading gets "Situation: …" in the user message (the cached system prompt is unchanged).
- **OWNER:** the six scenarios' wording; the odds; scenarios in shifts too?; which clients fit "party" and "elderly regular" (now Mia/Priya/Kim/Victoria and Grace).
