# Story 021: Companion corner (pet-like)

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Mai is the soul of the game (design/game-brief.md). Between appointments the player can spend a moment with their companion. It works with the placeholder art and doesn't wait for the designer.

## Acceptance Criteria

- [x] Tapping the companion on the title opens the corner: the companion large (current look), with 💬 Chat, 🤗 Pat and 🙌 High-five.
- [x] Each tap gets a reaction: a mood (happy, celebrating, proud…) and a transform animation (bounce, wiggle, jump; none with reduced motion), plus a short line from the string tables, using the companion's name and gender (chị/anh). No AI calls.
- [x] The first pat or high-five of the day adds a little friendship (config).
- [x] Gifts at friendship milestones (config: level → a free polish colour or an accessory): "🎁 {name} has a gift for you!" → claim once → added (polish to the station, accessory to dress-up). Never sold, no real money.
- [x] en and vi at 320 px; saved on the device; unit tests for the daily bonus, gifts and lines.

## Test Evidence

**Status**: [x] `src/tests/corner.test.ts` and `production/qa/evidence/story-021-companion-corner/`.

## Completion Notes (2026-11-13)

- `game/corner.ts` (pure) + `config/corner.json` (daily XP 2; gifts: level 2 Sky blue, 3 Round glasses, 4 Rose gold, 5 Gold shimmer; line counts) + `game/ui/companion-corner.ts` (loaded on demand). Tap target over the title's companion (`.companion-hotspot`).
- Lines: `corner.chat1-6`, `corner.pat1-3`, `corner.high1-3` in en and vi; Vietnamese uses {self}/{selfLower} (Chị/Anh).
- Gift polishes are shop colours given free at friendship milestones (they stay buyable with tips too). Nothing is sold for money.
- **OWNER:** the lines; the gift list; a "tap me" hint on the title (the companion has no visible cue that it's tappable yet).
