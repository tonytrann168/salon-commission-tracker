# Story 068: Playtest-5 fixes — never stuck, no phantom picture, music on iPhone, pause / leave

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-20

## Context

Owner playtest 5 (11-19, about 21:20 PT; "send now and fix now").

## Acceptance Criteria

### 1. Feeling stuck (top priority; the owner's real transcript)

- [x] **(a) Waiting line**: when she asks something, "She's waiting for: “Short or medium nails, please?”" shows
  above the reply box. It clears when she gets an answer.
- [x] **(b) Help after one miss**: a miss is her "say that again" (config patterns) or a reply graded "Try this".
  After one miss the companion opens on her own: her waiting tip with the better line, or a fresh hint.
- [x] **(c) Tappable chip**: the "Try this 💡" chip is a button. It shows the better line (en and vi) with
  🔊 Listen in the companion's voice.
- [x] **(d) She picks after two misses**: the line says "No worries: reply anything, and she will choose…". The next
  client turn carries `stuck=yes` and she picks a sensible answer and moves on, with a gentle −2 mood. Numbers are
  in `config/stuck.json`.

### 2. Picture bug

- [x] Every client turn now tells the AI `picture=yes/no` (in the game note, so the system prompt stays cached).
  The prompt forbids claiming, showing or describing a picture unless picture=yes. If asked, she says she doesn't
  have one and describes what she wants in words.

### 3. Music on iPhone

- [x] **No regression found**: the audio code has not changed since round 3. Two iOS weak spots are fixed:
  - Any later tap, and `pageshow`, now resume a context iOS left "interrupted" or "suspended" after a call,
    another app or a spoken line. Before, only the first tap and returning to the tab did.
  - The music now un-ducks by itself after `duck.maxSeconds` (20 s). If a spoken line's end event never fired on
    iOS, the music stayed at 25% and seemed gone.
- [x] **Silent switch**: a one-time hint on iPhone or iPad at the first tap: "No sound? Check the silent switch on
  the side of your iPhone."
- [x] **The mood row's 🔊/🔇** mutes only the client's voice. Its label and tooltip now say so, and that music and
  sounds are in Settings.

### 4. Pause / leave a visit

- [x] **⏸ in the mood row** opens an out-of-world "Paused" overlay. No client line, her timers wait (no "ignored
  question" dip), and Resume returns exactly where the player was. ⏸ is disabled while her reply is on its way.
- [x] **"Leave visit"** goes back to the path. Nothing is counted (no stars, XP, tips or coins), the streak is
  untouched, and today's client stays available. Owner default: no penalty; `config/pause.json` has
  `xpPenalty` / `coinsPenalty` (0).
- [x] **Not done**: surviving an app reload mid-visit. It isn't cheap: the AI transcript, the station's design and
  her timers would all need saving and restoring. Left for later.

## Tests

- Unit tests:
  - `tests/stuck.test.ts`:
    - the owner's transcript through the rules ("Got it." → help; "say that again" → she picks; her answer
      closes it)
    - "say again" phrasings and the question trimming
    - the server note (picture=no by default, stylist_is_stuck only when asked) and the prompt rules
    - leaving changes nothing by default; a configured penalty stays at zero or above
  - `tests/audio.test.ts`:
    - a later tap and pageshow resume an "interrupted" context
    - a stuck duck lifts by itself
    These were watched failing on the old engine.
- e2e tests, en + vi:
  - "feeling stuck" (stable 3/3 in a row):
    - the waiting line, the companion opening after the miss, the tappable chip with the better line
    - "she will choose", the third turn's `stuck: true`, and the line clearing after her choice
  - "pause": overlay, Resume, the mood row within 320 px with ⏸, Leave → path with the save unchanged, and
    today's client still open
- smoke:api (two new cases, run by the overseer with the real key):
  - a non-reference client asked "Can I see a picture?" does not claim one
  - the stuck transcript with `stuck: true`: she names short or medium and doesn't ask again

## Evidence

`production/qa/evidence/story-068/`, en + vi at 320×568, 2× DPR:

1. waiting for
2. the companion helps
3. Try this → the better line
4. she will choose
5. paused
