# Story 007: Progression & daily hooks

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

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

- [x] Tips earned in appointments add to a wallet that is saved between sessions.
- [x] A shop lets the player spend tips on station upgrades and new polishes; bought polishes appear in the nail art station.
- [x] XP from appointments raises the player's rank from Junior Tech to Master Tech; harder clients unlock at higher ranks.
- [x] Skill badges are awarded for scorecard milestones (e.g. a 90+ upsell score) and shown on a profile screen.
- [x] One daily challenge client is offered each day; finishing it extends a streak, missing a day resets it.
- [x] Rank-ups, badges and streak milestones get a celebration moment (sound + effect).
- [x] All tuning values (prices, XP curve, badge thresholds) live in config files.

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

**Status**: [x] `src/tests/progression.test.ts` (12 tests) and `production/qa/evidence/story-007-progression/` (title, picker, celebration, results, shop, profile; en and vi).

---

## Completion Notes (2026-11-10)

- **Logic** (`game/progression.ts`, pure): ranks and unlocks, XP, badges, the daily challenge (in this file rather than a separate `daily-challenge.ts`), the shop, upgrade effects. **Save** (`game/save.ts`): one versioned record (`salon.save`, version 1); damaged fields fall back one by one; an unknown version starts fresh.
- **Config** (`config/progression.json`): ranks Junior Tech 0 XP (easy) → Nail Tech 60 (medium) → Senior Tech 250 (hard) → Master Tech 600; XP by stars 5/10/20/35/50, +15 for the brief's goal, ×1 / ×1.25 / ×1.5 by difficulty, +20 for the daily; 9 badges; streak milestones 3/7/14/30; shop prices. Shop polishes are palette colours marked `"shop": true` in `nail-art.json`.
- **Shop**: 5 polishes ($25–45) that appear in the nail station once bought, and 3 upgrades: Clean-up pen ($40, wipe radius ×1.4), Fine brush ($60, brush ×0.85, fewer slips on small nails), Comfy chair ($90, clients start +3 mood). Tips come from play only; nothing is sold for money.
- **Daily challenge**: picked from the date among the clients the player can take, then kept in the save for the day. Finishing it (not a walk-out) extends the streak; a missed day resets it. The card sits on top of the client picker.
- **Celebrations**: rank-up (with what it unlocks), new badges (one card for several), streak milestones. Each has the level-up sound and confetti (none with reduced motion), and shows only while the results are on screen.
- **Screens**: Shop and Profile from the title menu; the progress panel on the results screen.
- **After review (2026-11-10):** Mai brings each celebration (celebrating mood, speech line). Rank names from the owner: Baby Chick / Gà Mới Nở, Glow-Up Tech / Thợ Xịn Xò, Gel Warrior / Chiến Thần Sơn Gel, Nail Boss / Trùm Nail Đỉnh Nóc, each with an icon. **One streak**: days in a row with a finished daily client; Mai's hello reads it (her memory's own counter is gone). **Tester unlock**: invite codes listed in the server env var `UNLOCK_ALL_CODES` see every difficulty (`/api/session` answers `unlockAll`); everyone else keeps the rank locks. The brief's monetization note now says the tips-shop upgrades are never sold for real money.
- **Owner to check**: XP thresholds, prices, badge list.

## Dependencies

- Depends on: `production/epics/salon-besties/story-002-scoring-and-results.md`, `production/epics/salon-besties/story-006-client-roster-and-difficulty.md`
- Unlocks: None
