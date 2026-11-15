# Story 055: Choose the companion's voice

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Audio / Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 3: pick Mai's voice, and one voice everywhere she speaks. The owner calls the male companion "Long".

## Acceptance Criteria

- [x] Settings → **Giọng của Mai / Mai's voice** and the companion step of onboarding: three Azure neural voices for
  her gender, each a big button with a ▶ sample (in the help language, chị/em through the tokens). Config:
  `voice-cast.json` → `azure.companion.female|male` (id, en + vi label, an English and a Vietnamese voice). Female:
  Hoài My (Sara in English), Ava, Emma; male: Nam Minh (Jason), Andrew, Brian. Ava/Emma/Andrew/Brian are
  Multilingual voices: the server wraps Vietnamese in `<lang xml:lang="vi-VN">`.
- [x] One voice everywhere the companion speaks: her tips and hints read aloud (043), **▶ Nghe / Listen** on Help me say
  it's English line (new), and the pronunciation example in practice. `/api/tts` is used while it works; the phone's
  voice only after an error.
- [x] The choice is in the save (`companionVoice`, synced with the account and backups). The server accepts only ids
  from the config; anything else is the default.
- [x] A smoke check: `/api/tts` for the companion with the chosen voice "ava" in Vietnamese (real Azure; the overseer
  runs it).
- [x] "Long" is the default male name (Mai stays the female default; both can be renamed).

- [x] 055 fix (overseer): one voice teaches in both languages by default: Ava (female) and Andrew (male) first; Hoài
  My and Nam Minh third, labelled honestly ("natural Vietnamese, English in another voice"). Saves that chose a voice
  keep it.
- [x] 055 fix (overseer): the smoke pronoun checks look only at how the companion speaks of herself and the player
  ("các chị khách", "chị ấy" and quoted or bracketed lines are left out; `game/pronoun-check.ts`, unit-tested with the
  two real replies that failed).

OWNER: please sign (voices by ear). If one of the Multilingual voices sounds wrong in Vietnamese, swap it in
`voice-cast.json`.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/voices.test.ts` (3 choices each, unknown ids fall back, the server's voice and the `<lang>` wrap, the
  natural voice sends the choice and caches each apart, the save keeps only plain ids); `tests/companion.test.ts`
  (Long).
- e2e (en + vi): Help me say it's ▶ Listen asks `/api/tts` with the chosen voice; Settings shows 3 voices, the chosen
  one marked, a new one saved, ▶ plays a sample in it.
- Screens at 320 px: `production/qa/evidence/story-055/` (the meet step with Long's voices, Settings, ▶ Listen).
