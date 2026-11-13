# Story 025b: The companion's Vietnamese voice — older or younger

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Owner decisions (via overseer, 2026-11-13). Vietnamese kinship pronouns are the game's signature: the account
screens speak in the companion's voice (chị/em), and the player chooses whether the companion is older or younger.

## Acceptance Criteria

- [x] Account screens (story 025) in Vietnamese are the companion talking, e.g. "{Self} gửi mã 6 số vào email của
  {you} rồi nè, nhập vô đây nha!". No "chúng tôi", "tôi" or "mình". The safety meaning stays exact (privacy note,
  delete confirmation, "Email hoặc mật khẩu chưa đúng"). English unchanged.
- [x] Meet screen and Settings → Bạn thân, after gender and name: "{name} lớn hơn hay nhỏ hơn {you}?" with two cards:
  **Older** (default; today's behaviour: the companion is chị/anh, the player em) and **Younger** (the companion is
  em; one follow-up, phrased without "em": "{name} nên gọi bạn là chị hay anh?" [Chị] [Anh]).
- [x] Stored with the companion: `relation: 'older' | 'younger'`, `playerTitle: 'chi' | 'anh'`; old saves → older.
- [x] Tokens filled by `t()`: {self}/{Self} (how the companion says "I"), {you}/{You} (how the companion and the game
  address the player), {pair} ("chị em" / "anh em", elder first). Every vi string that hardcoded em/chị/anh uses them.
- [x] The shared `vietnameseSelfRule` (all bestie and corrections prompts) follows the relation: younger → "Call
  yourself 'em' and the player 'chị'/'anh'; never call the player 'em'".
- [x] English unaffected.
- [x] Tests: token resolution for all 6 combos (female/male × older, younger+chị, younger+anh); no vi string
  hardcodes em/chị/anh outside tokens (allowlist: "tiếng Anh", "bạn thân", client-facing lines). smoke:api: a
  younger female companion with a player titled "anh" replies with "em" for herself and "anh" for the player.
- [x] Evidence (vi, 320 px): the meet screen with the relation question; one companion line in the younger mode.

## Test Evidence

**Status**: [x] Created — `tests/companion.test.ts` (6 combinations, old saves → older, younger strings in vi
including the account code line, no hardcoded em/chị/anh in vi — watched failing on a planted "em" — and the
younger prompts in bestie + corrections); `tests/i18n.test.ts` (the "bạn" rule allows only the chị/anh question).
`smoke:api` gains a 16th check (younger female companion, player "anh", vi). Screens:
`production/qa/evidence/story-025b-companion-voice/` (vi, 320 px): meet screen default, younger + Anh chosen, the
title greeting "Chào anh! Em là Mai…".

## Completion Notes (2026-11-13)

- Tokens: {self}/{Self} = how the companion says "I" (was {selfLower}/{self}), {you}/{You} = the player,
  {pair} = "chị em"/"anh em" (elder first). 100+ vi strings moved to them; English untouched.
- `CompanionIdentity` carries `relation` and `playerTitle`, so the server's `vietnameseSelfRule` gets them with
  every bestie and corrections request (no request format change for old clients: missing → older).
- Account strings (story 025) rewritten as the companion talking; "Email hoặc mật khẩu chưa đúng." kept exact.
- Story 025's vi screenshots show the earlier wording (not re-shot, to save the usage cap).
- **OWNER:** please have a Vietnamese speaker read the account strings and the relation cards.
