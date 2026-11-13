# Story 027: Backup QR + "tap me" cue

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Owner (via overseer, 2026-11-13). Story 020's backup code is long to copy by hand between phones; a QR code lets
another phone's camera carry it. Story 021's companion corner is easy to miss; a small cue invites the first tap.

## Acceptance Criteria

- [x] After "Back up my progress", the backup code also shows as a **QR code** (drawn on the device: a small
  MIT-licensed library or a tiny encoder; no network). Scanning it with another phone's camera gives the SB1 code,
  which pastes into "Restore from code". A code too long for a QR says so and keeps Copy / Save as file.
- [x] A **"tap me" cue** on the title companion (a small bubble/bounce next to the hotspot) until the corner is
  opened the first time; never again after that. Reduced motion: no bounce, the label stays.
- [x] en + vi strings; unit tests (QR size limit / encoding round trip if the encoder is ours; the cue's
  shown-until-opened rule); evidence at 320 px en + vi.

## Test Evidence

**Status**: [x] Created — `tests/backup-qr.test.ts` (a real backup code encodes, with finder patterns and one
path square per dark module; the size limit; the cue rule). Screens: `production/qa/evidence/story-027-backup-qr-cue/`
(en + vi, 320 px): the title with the cue, the backup QR. The cue is gone after the corner is opened once and after a
reload. Both QR screenshots decode (jsQR, run outside the project) to the full SB1 code (649 / 651 characters).

## Completion Notes (2026-11-13)

- `qrcode-generator` 2.0.4 (MIT, no dependencies, pinned exactly); the SVG is built in `backup-panel.ts` from the
  module matrix (no HTML from the library). Black on white with a 4-module quiet zone, 280 px at most.
- Typical codes are ~650 characters (version ~20 QR); the limit is 2953 bytes, past which the panel says to use Copy /
  Save as file.
- The cue: `salon.cornerSeen` (backed up with the rest). Reduced motion: no bounce.
