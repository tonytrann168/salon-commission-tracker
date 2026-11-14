# Story 046: Mic — check before sending

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-14

## Context

Owner playtest round 2: "when I mis-speak, it doesn't let me change it; I tapped the text box but it just sent
automatically. I like that it sends without a button, but a mis-spoken line can't be changed." Audience: a 45–60-year-old
nail tech, not a gamer: big buttons with words, 16 px+ text, one clear next step, nothing that needs fast reflexes.

## Acceptance Criteria

- [x] After speaking, the words go into the reply box and a visible ~3 s countdown runs on the Send button (a ring
  filling up, with the word "Send"), plus one plain line: "Check your words. Tap the box to change them."
- [x] Tapping the box, typing, or tapping "🎤 Again" (the mic, now with a word) cancels the countdown; the player edits
  and taps Send. Tapping Send sends at once. The countdown time is in data.
- [x] Settings: "Send voice replies automatically" on (default) / off (off: the words wait for Send).
- [x] Tests: the countdown (sends after the time, cancel never sends, Send now sends once); e2e with a stand-in
  microphone: tapping the box during the countdown never sends; left alone it sends; with the setting off it waits.

## Test Evidence

**Status**: [x] `tests/voice-send.test.ts` (3 tests); e2e (en + vi) with a stand-in microphone: tap the box → nothing sent after 3.6 s, edit + Send sends the edited line; left alone it sends; setting off → it waits. Screens: `production/qa/evidence/story-046-mic-check/`.

## Completion Notes (2026-11-14)

- The mic shows a word ("🎤 Speak" / "🎤 Nói"; "Again" / "Nói lại" once words are in the box).
- Test detail: headless Chromium now has an unprefixed `SpeechRecognition`, which the game prefers; the stand-in replaces both names.
