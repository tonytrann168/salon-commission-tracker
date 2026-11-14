# Story 037 + 038: Voices — consistent, natural, with mood

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review; Azure not yet verified against the real service)
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-14

## Context

Owner playtest: the client's voice keeps changing; voices should sound natural and follow the client's mood.

## Acceptance Criteria

- [x] **Pinned voices (bug):** each client keeps one browser voice for the whole appointment and across sessions
  (stored on the device). Female and male clients get voices of their gender; different clients get different voices
  where the phone has several. A stored voice the phone no longer has is picked again.
- [x] **Natural voice:** `POST /api/tts` (server) turns a client's line into speech with Azure AI Speech neural voices
  (SSML, `mstts:express-as` styles). Env: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`. Without them the route answers
  "not configured" and the game uses the browser voice exactly as before.
- [x] Each client maps to an en-US neural voice (data: `config/voice-cast.json`); the companion has a female and a male
  voice for English and for Vietnamese (vi-VN HoaiMy / NamMinh).
- [x] The route: only known clients or the companion as speakers (never the player's text: the game only sends client
  lines); text length cap; on the hosted preview the invite cookie, a per-minute limit and a daily character cap per
  code (config); answers cached (same text + voice + style: an in-memory LRU on the server and a cache in the browser).
- [x] **038 — voice follows mood:** the client turn may return an `emotion` tag (strict enum); otherwise the mood band
  decides. Emotion → Azure style + degree (angry / unfriendly when low, friendly at neutral, cheerful / excited when
  high); browser fallback → rate and pitch.
- [x] Unit tests (pinning, emotion from mood/tag, SSML is escaped, route validation, not-configured fallback, cache,
  guard cap). smoke:api: one `/api/tts` check when the Azure env vars exist (skipped otherwise). Owner README.

## Test Evidence

**Status**: [x] `tests/voices.test.ts` (15 tests: pinning, gender, distinct voices, stored choice, mood → emotion,
the turn's tag, the appointment's last emotion, cast per client, request validation, SSML escaping and style, not
configured / audio / cache / upstream failure, the guard's character cap, the browser wrapper's play / cache /
fallbacks). smoke:api: a tts check when the Azure env vars exist (else "SKIP").

## Completion Notes (2026-11-14)

- `game/voice-cast.ts` + `config/voice-cast.json`; `game/voice.ts` (pinned voice in `salon.voices.v1`, not backed up;
  mood prosody); `game/natural-voice.ts` (asks `/api/tts`, plays the audio, falls back); `server/handlers/tts.ts`;
  guard `chargeTts`; `emotion` in the client turn (optional enum) and `lastEmotion` in the appointment.
- Why the voice kept changing: the voice was chosen again for every line from whatever list the phone returned at
  that moment (the list loads late and its order changes), and most clients had no preferred voices at all.
- **Not verified:** the real Azure service (no key, and the owner's Azure portal was down). The request shape follows
  Azure's REST text-to-speech API as I know it; the overseer's smoke check will confirm once the key exists.
- The companion does not speak aloud in the game today; her voices are in the data and the route accepts her as a
  speaker, ready for when she does.
- **OWNER:** Azure setup: `production/qa/evidence/vercel-preview/README.md` → "Natural voices".
