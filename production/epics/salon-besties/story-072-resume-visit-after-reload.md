# Story 072 — Continue a visit after a reload or a crash

Type: Feature (owner: "reload survival matters") · Owner playtest answers, Sat 11-21.

## What
- **Saved on every meaningful change, on this phone only** (localStorage `salon.visit`; no cloud sync of an unfinished visit). It is saved after each turn and mood change, each change to the set (the station's note, at most 4 times a second), the finished photo, and the hands' photo of a combo. The save holds:
  - the client, scenario, challenge/path stop and English level
  - the phase, mood, mood history, transcript and agreed total
  - the station design (for a combo, which half is on the station, and the hands' match)
  - the fix requests
  - whether the hangnail is still there
  - whether the soak and scrub are done
  - the service time so far
  - after Done, the finished set and its photo
- **On load,** a saved visit under 24 hours old (`maxAgeHours`) shows "Continue your visit with Grace?" with ▶ Continue and Leave visit. Leave visit has the same no-penalty rules as Pause.
- **Continue restores exactly:**
  - the same chat, mood, phase and nails
  - a pedicure doesn't repeat its soak and scrub
  - a combo continues on the right half
  - a hangnail that was trimmed doesn't come back
  - at checkout the job stays finished, with its photo
- **Her timers resume from the time left:** her planned service lines are scheduled from the saved service time, and the ones already past aren't said again.
- **Cleared** at the results (or a walk-out) and on Leave visit.
- **Versioned** (`version` in config/visit-save.json). A save of another version, a broken one or an old one is dropped safely, with no prompt.
- The appointment can start from a saved state (`restore`), and the chat panel reports its part of the visit (`visitState()`). Logic: game/visit-save.ts (pure).

Not restored, on purpose:
- Undo history starts fresh.
- The "Perfect line" grade chips on old lines are not regenerated (the chat text itself is all back).
- A turn that was in flight when the game closed is not resent: the player sends again.
- The wait on an unanswered question restarts in full.

## Acceptance
- [x] Unit (tests/visit-save.test.ts):
  - reads back exactly
  - dropped when another version, too old (24 h), broken, finished, a bad transcript or a bad design
  - visit-save.json validated
  - an appointment restored has the saved phase, mood, chat, mood history and agreed total
- [x] e2e (en + vi):
  - start a visit, paint 2 nails, reload, Continue: the same painted cells (`data-painted`), mood, chat and phase; then the results, after which nothing is left to continue
  - a pedicure past its soak and scrub doesn't repeat them
  - Leave visit counts nothing and clears the save
  - a save of another version is dropped with no prompt
- [x] Two older e2e tests that reload mid-visit now answer the new prompt (Leave visit).
- [x] Evidence (en + vi, 320×568 @2×): production/qa/evidence/story-072/ — `*-1-before-reload.png`, `*-2-continue-prompt.png`, `*-3-continued.png`.

## OWNER
- OWNER: is 24 hours right for how long an unfinished visit is offered back (`maxAgeHours`)?
