# Story 012 evidence — Music and sound

Captured 2026-11-10, dev build, Chromium (Playwright, `--use-angle=swiftshader`, `--autoplay-policy=user-gesture-required`),
iPhone 13 (390 px) and 320×568, en and vi. Real Web Audio; the client's speech is a fake that takes 0.4 s per line
(headless Chromium has no voices). AI answers are mocked.

| File | Shows |
|------|-------|
| `*-01-settings-sound` | Settings: Music and Sound effects, each with a volume slider and a Mute; the note "sound starts after your first tap, music goes quiet while the client speaks" |
| `*-02-results-with-sound` | A finished appointment (sounds played along the way, see the log) |

Checked in the same run (script log, all four runs):
- **No audio before the first tap**: 0 AudioContexts on the title screen; after the first tap, one context, `running`.
- **Settings stick**: music slider to 30 and effects muted saved `{"music":0.3,"sfx":0.7,"musicMuted":false,"sfxMuted":true}`.
- **Ducking**: while Dana's opening line was spoken, the music bus went to 0.017 (0.066 × the 0.25 duck level), then back to 0.066 when she finished.
- **Sound events in one appointment**: `send, moodUp, send, moodDown, send, moodUp, stars, tip, phraseSaved`. (`levelUp` and `whisper` are wired to the level-up and whisper code; unit-tested, not triggered in this run.)
- No page errors; nothing off-screen; no settings card shorter than its text.
- Fixed in this run (older bug): settings cards shrank to fit the screen, so long Vietnamese text spilled out of the "Full Vietnamese mode" card. Cards now keep their natural height (story 008 shots re-taken).

What the fake cannot tell (real-phone playtest): how the music sounds and whether it is calm enough to talk over, the iPhone silent switch (it mutes Web Audio, by design), and the music pausing when the app goes to the background.
