# Story 012: Music and sound

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (awaiting owner review + phone listen)
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Art & audio direction ("upbeat lo-fi music, voiced characters"). No MVP feature covered music or sound effects, so the game was silent apart from speech. Added 2026-11-10 at the overseer's request after the owner's phone playtest.

**ADR Governing Implementation**: N/A (minimal — no ADRs)
**ADR Decision Summary**: N/A (minimal — no ADRs)
**ADR Version**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 (Web Audio for playback) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: none (no ADR engine-compatibility analysis at minimal)

**Control Manifest Rules (this layer)**: N/A (minimal — no control manifest)

---

## Acceptance Criteria

*From `design/game-brief.md` (art & audio direction), scoped to this story:*

- [x] **Background music:** an upbeat lo-fi track loops seamlessly on the title screen and during appointments (one track is enough for v1; a second for results is optional). Every track is royalty-free or generated, and its source and licence are recorded in `assets/audio/LICENSES.md` (title, author, licence, link or generator, date).
- [x] **Sound effects:** a small set of short, soft salon/UI sounds, each tied to one game event: send a line, client mood goes up, client mood goes down, stars revealed on results, tip, level-up (player and bestie), whisper/hint opens, a phrase saved to the phrasebook. Licences are recorded the same way. No sound plays for a mistake on its own (never punish Beginner or Some players with a "wrong" buzzer).
- [x] **Settings:** separate music and sound-effects volume sliders, each with a mute, saved on the device and applied at once. Labels are in both string tables (English and Vietnamese).
- [x] **Ducking:** while the client (story 004) or practice audio speaks, music drops to a low level (config) and comes back smoothly after; sound effects never cover a client line.
- [x] **No audio before the first tap:** nothing plays until the player taps (phone autoplay rules); the first tap starts the music. Audio pauses when the app goes to the background and resumes when it returns.
- [x] **Phone-friendly:** total audio download stays small (budget in config, e.g. under 2 MB, compressed formats with a fallback); missing or failed audio never breaks the game, it just stays quiet.
- [x] All event-to-sound mappings, volumes and ducking levels live in a config file, not in code.

---

## Implementation Notes

- Web Audio (`AudioContext`) resumed inside the first user tap, the same gesture that unlocks speech in story 004 (`VoiceIO.unlock`).
- Ducking needs a signal when client speech starts and ends: `VoiceIO.speak` already resolves when an utterance ends; add a start hook.
- The iPhone silent switch mutes Web Audio by default; record the behaviour in the evidence (do not fight it).
- Keep the music calm enough to talk over: the game is an English lesson first.

---

## Out of Scope

- Voiced bestie lines and Vietnamese speech (later).
- Per-client music, adaptive or layered music, a sound shop (later, with progression).

---

## Files

- `src/game/audio.ts`
- `src/game/config/audio.json`
- `src/public/audio/` (tracks and effects) + `assets/audio/LICENSES.md`
- `src/game/ui/settings-screen.ts`
- `src/tests/audio.test.ts`
- also: `src/game/sound-events.ts`, `assets/audio/LICENSES.md`, `withSpeakingSignal` in `src/game/voice.ts`, sound events in `chat-panel.ts`, `results-screen.ts`, `recap-screen.ts`, `bestie-panel.ts`, `main.ts`
- **not created**: `src/public/audio/` (no audio files: everything is generated)

## Completion Notes (2026-11-10)

- **Generated, not downloaded**: music and effects are synthesised at run time with Web Audio from `config/audio.json`, so there are 0 bytes of audio to download and no third-party licence. `assets/audio/LICENSES.md` records this. Music: a 4-bar lo-fi loop at 78 BPM, swung (pad chords Fmaj7–Em7–Dm7–Cmaj7, sine bass, synth kick, noise snare and hats, a short melody, warm low-pass), on the title screen, during appointments and on results.
- **Effects**: send, mood up, mood down (soft, never a "wrong" buzzer), stars, tip, level-up (player and Mai), whisper (hint or correction), phrase saved. Game code announces them with `emitSound` (a window event), and the engine listens; no UI code holds the engine.
- **Settings**: music and effects volume sliders and mutes, saved (`salon.audio.v1`) and applied at once. Strings in both tables.
- **Ducking**: the music drops to 25% while anything is spoken (client lines, practice Listen) and comes back after 0.25 s. `withSpeakingSignal` counts overlapping lines so a cut-off line never brings the music back mid-sentence.
- **First tap**: nothing is created or played until the first tap or key press, which creates and resumes the AudioContext and starts the music. Audio suspends when the page is hidden and resumes on return. No Web Audio leaves the game silent, never broken.
- **Owner questions**: (1) listen on the phone: is the generated loop pleasant and calm enough to talk over, or should we license a recorded lo-fi track? (2) default volumes (music 50%, effects 70%)?

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

**Story Type**: Visual/Feel
**Required evidence**: `src/tests/audio.test.ts` (event mapping, volume and ducking logic, with a fake audio context) plus a short real-phone playtest note in `production/qa/evidence/` (music loops, ducks under the client, volumes and mute stick, silent before the first tap).

**Status**: [x] `src/tests/audio.test.ts` (11 tests) + `production/qa/evidence/story-012-music-and-sound/` (real Web Audio in Chromium, README). [ ] Real-phone listen: owner.

---

## Dependencies

- Depends on: `production/epics/salon-besties/story-004-voice-in-and-out.md` (ducking under client speech, the first-tap unlock)
- Unlocks: None
