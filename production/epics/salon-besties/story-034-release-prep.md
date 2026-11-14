# Story 034: Release prep (1.0.0-rc.1)

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Foundation
> **Type**: Config/Data
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Acceptance Criteria

- [x] Version `1.0.0-rc.1` (package.json, the single source) shown at the bottom of Settings and sent with feedback
  and error reports.
- [x] An in-app **What's new** (en/vi, from `config/whats-new.json`): shown once on the title after an update to a
  version with notes, and any time from Settings.
- [x] `production/qa/TESTER-GUIDE.md` (en + vi): install to the home screen, invite code, feedback, backup / account.
- [x] `production/release/PR-DESCRIPTION.md`: a draft for merging this branch into main. The PR is NOT opened.
- [x] Unit tests (what's new: shown once per version, notes complete in both languages); evidence en + vi at 320 px.

## Test Evidence

**Status**: [x] `tests/whats-new.test.ts` (3 tests: one version everywhere, notes complete in en/vi, shown once /
never on a first run). e2e (en + vi): What's new once after an update, then from Settings with the version. Screens:
`production/qa/evidence/story-034-release/`.

## Completion Notes (2026-11-13)

- `package.json` version `1.0.0-rc.1` → `APP_VERSION` (Settings, feedback, error reports).
- `config/whats-new.json` + `game/whats-new.ts` + `game/ui/whats-new.ts`.
- `production/qa/TESTER-GUIDE.md`, `production/release/PR-DESCRIPTION.md` (draft; no PR opened).
