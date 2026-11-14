# Story 036: Client pronouns in Vietnamese

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-14

## Context

Owner playtest (bug): with a male client the Vietnamese translation used "chị"; it must be "anh".

## Acceptance Criteria

- [x] Each client has a Vietnamese self-word, from data: male → "anh", female → "chị" by default; a client file may
  set its own (`vi.self`, `vi.you`, `vi.note`): Grace (retired teacher) → "cô"; Lily (a teen) → "em", calling the
  stylist "chị", and her mother "cô". The stylist (the player) stays "em" otherwise.
- [x] The server looks the client up by `clientId` (never trusts pronoun text from the browser) and puts the rule
  into: translation en→vi (client lines, full-Vietnamese help), Help me say it (vi→en: who the "you" is), the
  companion's Vietnamese hints / debrief, and corrections (the Vietnamese meaning of better lines).
- [x] Translations are cached per client (the same English line from Tom and Brenda differs in Vietnamese); old
  cached translations are not reused.
- [x] The pedicure reaction lines' Vietnamese help uses the client's word too.
- [x] Unit tests: the rule per client, the prompts carry it (Tom → anh, never told to say chị), cache per client.
  smoke:api: Tom's line translated → has "anh", no "chị".

## Test Evidence

**Status**: [x] `tests/client-pronouns.test.ts` (6 tests). smoke:api: a 17th check (Tom's line → "anh", no "chị");
not run here (no API key). e2e unchanged flows pass.

## Completion Notes (2026-11-14)

- `clientVietnamese` / `clientVietnameseRule` / `clientMentionRule` (game/types.ts); client files may set `vi`
  (Grace: cô; Lily: em → chị, her mother cô). "Mom" in Lily's file: cô (my call).
- `clientId` goes with translate, bestie and corrections requests; the server looks the client up in the roster.
- Translation cache v3: one entry per client and line.
- Folded in (overseer, after f5445fb): her bubble grows to fit (up to 4 lines) and the order reminder wraps to two
  lines (tap for more); the block is measured and the hand laid out below it; the hand is clipped to its zone (no bleed
  onto the chat at checkout); "Giúp tôi nói" → "Giúp {you} nói" (no earlier decision or test said otherwise).
