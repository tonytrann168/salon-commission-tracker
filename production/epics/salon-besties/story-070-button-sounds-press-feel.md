# Story 070 — Button sounds and a chunky press feel

Type: Visual/Feel (owner signs off) · Owner request, Sat 11-21.
Feel: chunky, satisfying mobile-game buttons. The genre is the reference; no particular game is. Every sound is the game's own, made live with the Web Audio synth (oscillators and filtered noise). No samples, and no copying or imitating another game's sounds.

## What
- **One sound system for every button** (config/ui-sounds.json, game/ui-sounds.ts, game/ui/ui-sound-listener.ts). One delegated listener works out each button's kind. A disabled button always gets `blocked`. Otherwise a `data-sfx` attribute wins, then the CSS selector lists in the config, and anything left gets `press`.
  - `press`: a short low "thock" (a sine that drops in pitch, plus a soft filtered tick).
  - `primary` (Send, Done, Charge, Resume, Start/Continue, Collect/Claim, Confirm): a brighter two-note pop with a small sparkle tail. Also a 25 ms haptic tick, when vibration is on in Comfort.
  - `secondary` (tabs, steps, tool row, colour swatches, shapes and lengths, menu items, −$5 / −10%, answer lines, chips): a soft click. Its pitch varies ±5% per tap so repeats don't sound robotic.
  - `open` / `close` (📋 menu, 📷 picture, the companion's card, ⏸ pause, sheets and their Close): a quick filtered-noise whoosh up / down with a little tone.
  - `toggleOn` / `toggleOff` (mute, Settings switches and checkboxes): an up-blip / down-blip, chosen by the switch's state at the tap.
  - `blocked` (a tap on a disabled button): a soft low "bonk", never harsh.
- **Rewards.**
  - The results count-up ticks softly as the numbers climb (one tick per `tickEveryMs`), then a final `stinger` ding.
  - The daily gift gets a short rising build-up, then a pop.
  - The stars, coin, tip and level-up sounds are kept.
- **Rules.**
  - Everything goes through the SFX volume and master gain; SFX off is silent.
  - At least 40 ms between button sounds (`minGapMs`), so fast taps don't machine-gun.
  - While the client speaks (the existing duck), UI sounds play at `duckGain`.
  - On touch the sound plays on release, and only when the finger stayed on the button (under 10 px of movement) with no pointer cancel, so a scroll never sounds. A mouse or pen sounds on press, for instant feel.
- **Press feel.** Buttons have a chunky darker bottom edge (pink, light pink, or dark green for the station's Done). While pressed they squash down 3 px (2 px for small buttons) and the edge shrinks. The press is instant, with no transition: on the station a press transition kept restarting and never reached the pressed look. On release they spring back with a small overshoot. This replaces 057b's scale squash. With Reduce motion (Comfort or the system) nothing moves; the button only darkens a little.
- **Sound test.** In Settings, under Sound effects, a "Sound test" row has a button for each sound, so the owner can judge them.

## Button → sound kind (evidence)

| Button | Kind |
|---|---|
| Send (chat), Done (station), Charge (Total), ▶ Resume (pause), Start / Continue / Play (title, path, welcome), Collect (gift), Confirm (menu setup), Next client | primary |
| Help me say it (`.help-button`), 🎤 Speak, the station's step tabs (Shape / Length / Colour / Art), tool row (Clean, Undo, Help), colour swatches, shape and length buttons, menu items, −$5 / −10% / Menu price, answer lines on the companion's card, Try this chips, the Reply chip, presets (Basic / Mid / Fancy) | secondary |
| 📋 Menu, 📷 her picture, the companion bubble, ⏸ pause, 🎁 the gift (open), Settings | open |
| Close / Got it / ✕ on sheets, bubbles and overlays | close |
| 🔇 speaker, Settings switches and Mute checkboxes | toggleOn / toggleOff (by state) |
| any disabled button | blocked |
| anything else | press |

## Acceptance
- [x] Unit: ui-sounds.json is read and refused when bad; the throttle lets a sound through only after `minGapMs`; the pitch jitter stays inside ±jitter for secondary and is 1 for the others; `kindFor` follows disabled > data-sfx > toggle > close > open > primary > secondary > press.
- [x] e2e (en + vi): Send, Done, the station's tabs, 📋 Menu, its Close, ⏸ and ▶ Resume and the 🔇 speaker each make their kind; a tap on a disabled button makes `blocked`; two taps 10 ms apart make one sound.
- [x] e2e: a pressed button moves down 3 px and back; with Reduce motion it doesn't move.
- [x] Evidence in production/qa/evidence/story-070/:
  - `*-title-start-1-resting.png` / `*-2-pressed.png` and `*-station-done-1-resting.png` / `*-2-pressed.png` (en + vi, 320×568 @2×)
  - `*-sound-test.png` (the Settings row)
- The old single `tap` sound (057b) is gone. The `tap` event stays in sound-events for anything that still emits it.

## OWNER
- OWNER: the volume levels (each voice's `gain` in config/ui-sounds.json; all of it under the SFX slider).
- OWNER: please play every sound in Settings → Sound test and say which to change (too loud, too high, too long, not chunky enough).
- OWNER: on touch the sound plays on release (so a scroll never sounds). Is that OK, or does it feel late?
