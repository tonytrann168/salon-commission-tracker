# Story 043: The companion reads her tips aloud

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Audio
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: for players who would rather listen than read, the companion could say her tips.

## Acceptance Criteria

- [x] Settings → **Mai reads tips aloud / Mai đọc mẹo thành tiếng** (her name), **off by default**.
- [x] When on: opening her panel reads the new tips (what was good and why the better line is better), and a hint is
  read when it arrives, in the player's help language.
- [x] Her own voices from `voice-cast.json` (Azure: vi-VN HoaiMy / NamMinh for Vietnamese, by her gender); without
  Azure, the phone's voice: a Vietnamese line needs a Vietnamese voice on the phone, otherwise she stays quiet (an
  English voice reading Vietnamese would be worse).
- [x] Respects the Speech speed setting.
- [x] Overseer follow-up on 045: Fast is now 1.35 (was 1.2; Slow stays 0.8). Not measured by ear here (this container
  has no audio); 1.35 per the overseer so Fast is clearly faster.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/voices.test.ts` (her line goes to the server as the companion with the speed; the Vietnamese voice or
  silence in the browser; off by default).
- e2e (en + vi): with the setting on and a stand-in speech engine, opening a waiting tip reads it (vi-VN in Vietnamese
  mode); the Settings switch turns it off.
- Screens at 320 px: `production/qa/evidence/story-043/`.
