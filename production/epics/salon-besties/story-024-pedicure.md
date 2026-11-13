# Story 024: Pedicure service

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Acceptance Criteria

- [x] A foot is a second finger list in `nail-art.json` (five toes: a large big toe, small little toe), drawn and painted by the same station; the left foot is the mirror, as with hands.
- [x] A nail request can say `service: "pedicure"` (with `hands: 2` meaning both feet); the station then shows the foot, and the client, the review and the descriptions say "pedicure".
- [x] Chosen by data: a "Pedicure day" scenario (easy and medium clients) asks for a pedicure; regular manicures are unchanged.
- [x] 320 px chat space unchanged; unit tests for the foot config, descriptions and the scenario.

## Test Evidence

**Status**: [x] tests in `nail-art-match.test.ts` / `scenarios.test.ts` and `production/qa/evidence/story-024-pedicure/`.

## Completion Notes (2026-11-13)

- `nail-art.json` → `foot` (same shape as `hand`; parsed by the same code; must have as many toes as the hand has fingers). `limbFor(request)` picks hand or foot; the station draws whichever it is given; `hands: 2` means both feet; the switch shows 🦶 and "Right foot / Left foot".
- `nailRequest.service: "pedicure"` (clients or scenarios); descriptions say "pedicure, both feet: …".
- Chosen by data: `game/scenarios/pedicure-day.json` (easy and medium clients; not Jake or Marcus).
- **OWNER:** a pedicure step before painting (soak, scrub) as a mini-game later? Which clients should ask for pedicures directly?
