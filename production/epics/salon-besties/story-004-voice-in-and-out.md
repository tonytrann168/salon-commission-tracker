# Story 004: Voice in and out

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (awaiting owner review + real-phone playtest)
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

**GDD**: `design/game-brief.md`
**Requirement**: `Brief MVP feature 1` (voice half; split from story 001 to follow the brief's Build order)

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md`, scoped to this story:*

- [x] The player can hold (or tap) a mic button to speak to the client; their speech is turned into text and shown in the chat.
- [x] Client replies are spoken aloud in a voice that fits the client, and still shown as text.
- [x] The client starts speaking within about 2 seconds of the player finishing (streamed speech).
- [x] The player can switch between voice and typing at any point in an appointment.
- [x] If the mic is blocked or the voice service fails, the game falls back to typing with a clear message.
- [x] Voice keys stay on the server; the browser never sees them.
- [x] *(Added 2026-11-09, educational-first redesign.)* **Pronunciation practice:** the player can practise any line — a better line from the recap, a phrasebook phrase, or their own last line — by saying it aloud; the game shows which words it heard as said clearly and which it did not, and lets them try again.
- [x] Client voices follow the player's English level (slower, clearer speech at Beginner; natural speed at Fluent).

---

## Implementation Notes

- Mic access needs a user gesture on phones; ask for permission the first time the mic button is pressed.
- Voice provider is chosen in this story; measure real cost per appointment and record it in the story when done.
- Pronunciation: plain speech-to-text can only say which words it recognised, not how well each sound was made. Owner decision (2026-11-09): build the free word-level check first; add a paid pronunciation-assessment service only if playtests ask for it. Record the cost per appointment.

---

## Out of Scope

- Vietnamese voices: the Vietnamese help in story 010 is shown as text; Vietnamese speech is later.

---

## Files

- `src/api/speech-to-text.ts`
- `src/api/text-to-speech.ts`
- `src/game/voice.ts`
- `src/game/ui/mic-button.ts`
- `src/tests/voice.test.ts`
- also: `src/game/config/voice.json`, `src/game/ui/practice-sheet.ts`, `src/game/ui/voice.css`, wiring in `main.ts`, `chat-panel.ts`, `recap-screen.ts`, `phrasebook-screen.ts`, `settings-screen.ts`, `settings.ts`, i18n tables
- **not created**: `src/api/speech-to-text.ts`, `src/api/text-to-speech.ts` (see the provider note below)

## Completion Notes (2026-11-10)

- **Provider: the phone's own speech (Web Speech API).** Speech recognition and speech synthesis built into the browser: no voice key, nothing on the server, **$0 per appointment**. This is a default, not a final choice: every paid provider (ElevenLabs, OpenAI, Deepgram, Azure) needs a key and costs money, so that decision is the owner's. Everything voice-related sits behind `VoiceIO` in `game/voice.ts`, so a server provider (and the two `api/` files) can be added later without UI changes. "Voice keys stay on the server" holds trivially: there are no voice keys.
- **Mic**: tap to start, tap to stop (works better on phones than holding). Words appear as they are heard, then send as the player's line. Typing works at any time. The browser asks for mic permission on the first tap.
- **Client voice**: spoken with the phone's voice, chosen from `voice.json` (Dana prefers Samantha, Google US English, Microsoft Aria and others, else any US English voice). Rate by level: 0.8 Beginner, 0.9 Some, 1.0 Comfortable, 1.1 Fluent. A 🔊 toggle in the appointment and a Settings switch. The text still shows.
- **Fallback**: no recogniser, a blocked mic, silence or an error each give a clear message above the reply box, and typing keeps working.
- **Pronunciation practice (free word-level check)**: from the phrasebook, the recap and review lines, and "Practise my last line". Shows which words were recognised (green) and which were not (wavy underline), with Listen and Try again. It is honest about its limit: "This checks which words were recognised, not every sound."
- **Playtest fixes (overseer, 2026-11-10)**: (1) `npm run dev` now serves **HTTPS** on the LAN with a self-signed certificate (`@vitejs/plugin-basic-ssl` 2.3.0, pinned exactly, only when Vite runs with `--host`). Phones block the mic and speech recognition on plain `http://<LAN-IP>`. `npm run dev:local` keeps plain http://localhost. (2) iPhone speech is unlocked inside the first tap (Start appointment or the mic) with one silent, empty line (`VoiceIO.unlock`). The iPhone's silent switch still mutes the client's voice.
- **Owner decision (2026-11-10, overseer)**: the free Web Speech default is fine for now.
- **Latency**: the voice starts as soon as the reply text arrives, so "about 2 s" is decided by the AI reply time (Haiku client turn), not by voice. To be measured on the real phone.
- **Risks to check in the playtest**: browser voices vary by phone and can sound robotic; iOS limits speech recognition in home-screen web apps on some versions; Chrome on Android sends audio to Google for recognition (privacy note for the owner).
- **Owner decisions**: (1) is the free browser voice good enough, or pick a paid provider (I'd suggest ElevenLabs for voice and OpenAI or Deepgram for transcription if playtests ask)? (2) client voice on by default? (3) the real-phone playtest note.

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Integration
**Required evidence**: `src/tests/voice.test.ts` (waived as advisory at `qa.level: minimal`) plus a playtest note on a real phone in `production/qa/evidence/`.

**Status**: [x] `src/tests/voice.test.ts` (11 tests) + `production/qa/evidence/story-004-voice/` (scripted-fake browser run + README with a real-phone checklist). [ ] Real-phone playtest note: owner.

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-001-live-client-appointment.md`, `production/epics/salon-besties/story-010-english-in-the-chair.md`, `production/epics/salon-besties/story-011-learning-loop.md` (pronunciation practice uses the recap and phrasebook)
- Unlocks: None
