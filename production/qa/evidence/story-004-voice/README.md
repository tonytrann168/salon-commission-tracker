# Story 004 evidence — Voice in and out

Captured 2026-11-10, dev build, Chromium (Playwright, `--use-angle=swiftshader`), iPhone 13 (390 px) and 320×568, reduced motion on.
Headless Chromium has no microphone or voices, so the run swaps in a **scripted fake** of the browser's speech recognition
and speech synthesis. The game code is the real code. AI answers are mocked as in the other evidence runs.
28 screenshots, `en-*` / `vi-*`, 390 px and `*-320-*`.

| File | Shows |
|------|-------|
| `*-01-settings-client-voice` | Settings: the Client voice switch |
| `*-02-chat-mic-and-speaker` | The 🎤 mic (beside the reply box on narrow phones) and the 🔊 speaker toggle by the mood bar |
| `*-03-listening` | Listening: the mic is pink, "Listening…", the words heard so far fill the reply box |
| `*-04-spoken-line-sent` | Mic tapped again: the spoken line is sent as the player's line; "🎤 Practise my last line" under it |
| `*-05-practice-result` | Practice: said "hello what color would you": every word green except "like?" (wavy underline), Try again, Listen |
| `*-06-mic-blocked-fallback` | Mic blocked: a clear message above the reply box; typing still works (the next line was typed and sent) |
| `*-07-phrasebook-practise-buttons` | Phrasebook entries each have a 🎤 Practise button |

Checked in the same run (script log):
- The client spoke the opening line and every reply, at the Beginner rate (0.8 in `config/voice.json`).
- The spoken line reached the transcript as typed text; after the mic was blocked, a typed line went through.
- The speaker toggle turned the voice off and saved it (`salon.clientVoice = off`).
- No page errors. No text spilling out of a button, nothing off-screen, and the reply box at least 200 px wide at 390 and 320.

## Real-phone playtest checklist (owner, tonight)

The fake proves the wiring, not the phone. Please try on the real phone (Safari on iPhone and/or Chrome on Android):
1. First tap on 🎤: the phone asks for mic permission; allow it. Say a line; tap 🎤 again. Does the line appear and send?
2. Does Dana speak her lines aloud, and does she sound OK (which voice did the phone pick)? Slower at Beginner?
3. Time from finishing your line to Dana starting to speak: about 2 s or more? (The AI reply time dominates; the voice itself starts at once.)
4. Deny the mic permission (or turn it off in settings) and tap 🎤: is the message clear, and can you still type?
5. Practise: open a phrasebook line or "Practise my last line", say it, and check which words turn green.
6. If you installed the game to the home screen on iPhone: does the mic still work there? (Apple limits speech recognition in home-screen web apps on some iOS versions.)
