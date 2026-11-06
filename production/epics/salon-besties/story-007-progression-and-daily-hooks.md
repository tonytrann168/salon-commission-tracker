# Story 007: Progression & daily hooks

> **Epic**: Salon Besties (MVP)
> **Status**: Ready
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: —

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 6`

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [ ] Tips earned in appointments add to a wallet that is saved between sessions.
- [ ] A shop lets the player spend tips on station upgrades and new polishes; bought polishes appear in the nail art station.
- [ ] XP from appointments raises the player's rank from Junior Tech to Master Tech; harder clients unlock at higher ranks.
- [ ] Skill badges are awarded for scorecard milestones (e.g. a 90+ upsell score) and shown on a profile screen.
- [ ] One daily challenge client is offered each day; finishing it extends a streak, missing a day resets it.
- [ ] Rank-ups, badges and streak milestones get a celebration moment (sound + effect).
- [ ] All tuning values (prices, XP curve, badge thresholds) live in config files.

---

## Implementation Notes

- Save state locally (no accounts in v1); keep the save format versioned so a cloud save can be added later.
- Daily challenge picks a client deterministically from the date so it is the same all day.

---

## Out of Scope

- Leaderboards and sharing (out of v1 scope).
- Payments and the bestie customization shop (out of v1 scope).

---

## Files

- `src/game/progression.ts`
- `src/game/save.ts`
- `src/game/daily-challenge.ts`
- `src/game/config/progression.json`
- `src/game/ui/shop-screen.ts`
- `src/game/ui/profile-screen.ts`
- `src/tests/progression.test.ts`

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Logic
**Required evidence**: `src/tests/progression.test.ts` (waived as advisory at `qa.level: minimal`) plus retained screenshots of the shop and profile in `production/qa/evidence/`.

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-002-scoring-and-results.md`, `production/epics/salon-besties/story-006-client-roster-and-difficulty.md`
- Unlocks: None
