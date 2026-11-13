# Story 020: Save backup & transfer

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

On iPhone the home-screen app and Safari keep SEPARATE storage: a tester who played in Safari and then installs the app starts over (owner, via the overseer, 2026-11-13).

## Acceptance Criteria

- [x] Settings → "Back up my progress" makes a backup code: everything the game saves on this device (`salon.*`: progress, companion, phrasebook, settings…), compressed, versioned, with a checksum. Copy it, or save it as a text file. No secrets (the invite cookie is not in device storage and is never included).
- [x] Settings → "Restore from code": paste a code (or open the file) → the game checks it (version, checksum, contents) → shows what it holds → asks to confirm ("This replaces the progress on this phone") → restores and reloads.
- [x] A bad, partial or edited code is refused with a clear message; nothing is changed.
- [x] First run (the companion has not been met yet): a hint "Played in Safari before? Restore your progress here" with a Restore button.
- [x] en and vi at 320 px; unit tests for the code (round trip, checksum, version, bad input, key filter).

## Test Evidence

**Status**: [x] `src/tests/backup.test.ts` and `production/qa/evidence/story-020-backup/`.

## Completion Notes (2026-11-13)

- `game/backup.ts`: `SB1-<12-hex SHA-256>-<deflate-raw JSON, base64url>`; version 1; only `salon.*` text keys (not the per-device Mai bubble side or the session reload flag). `game/ui/backup-panel.ts`: the Settings section and the restore sheet (paste or open a file → check → summary → confirm → restore → reload).
- About 600 characters for a typical player; a long phrasebook compresses well.
- **OWNER:** the code is long to copy by hand; "Save as a file" or pasting into a message to yourself is easiest. A QR code could come later.
