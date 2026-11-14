# Story 035: Service phase = the game, full screen

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review; owner phone playtest for feel)
> **Layer**: Feature
> **Type**: UI
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Owner playtest (2026-11-13): "the biggest issue is the game interface, why still keep the conversation? just
completely switch to the playing game part … having conversation mid-way is ok, but we need to figure out a way."

## Acceptance Criteria

- [x] Consultation and Checkout stay the chat screen. When Service starts (and the client has a nail request), the
  screen switches fully to the station: the hand/foot large, the tools, the client's face small in a corner with
  the mood, the companion. No chat log, no reply box on screen.
- [x] The appointment stays in Service until the player taps Done (the AI can't move it on); Done → a short "Time to
  check out" transition → Checkout in the chat, opened by a client line (data). A redo scenario asks for its redo
  first (data line) and keeps the station.
- [x] Mid-service talk: 1–3 client lines per service (data: `config/service-talk.json`, by difficulty, timed, no
  repeats), plus the AI's replies. Each pops as a speech bubble from her face (voiced as before) with a pulsing
  "💬 Reply / Trả lời" chip. The chip opens a bottom sheet with the chat (tap-to-translate), the reply box, mic and
  Help me say it; Send or ✕ closes it. Painting pauses while it's open.
- [x] A question left unanswered for `ignoreSeconds` (~20 s) → a small mood dip (once per line) and a gentle
  companion nudge. Never a walk-out from this alone (mood floor).
- [x] The full transcript (with the mid-service lines) still goes to grading and corrections.
- [x] The station uses the space: bigger nails and tap targets in Service. e2e flows updated (en + vi).

## Test Evidence

**Status**: [x] `tests/service-talk.test.ts` (4 tests: the plan of 1–3 distinct timed lines, questions vs remarks and
data checks, the held Service phase with Done → checkout, her own lines in the transcript). e2e (en + vi): "the service
is full screen" (chat hidden, her line from her face, Reply sheet, send closes it, an ignored question → −3 and a nudge,
Done → checkout opened by her line); colour redo updated (she asks for the redo from her face; the second Done ends the
service); the other flows go through Done. Screens: `production/qa/evidence/story-035-service-full-screen/` (en + vi,
320 px; the pedicure prep full screen in en).

## Completion Notes (2026-11-13)

- `appointment.ts`: `holdPhase`, `advance`, `clientSays`. `config/service-talk.json` + `game/service-talk.ts`.
- `chat-panel.ts`: service mode (class `service-mode`): the chat log, reply box and voice status move into a bottom
  sheet (`reply-sheet`) behind the "💬 Reply" chip; painting is blocked while the sheet is open.
- Station layout: a tall zone gets a top band (her face, her bubble) and the hand centred and wide below it; 44 px tools.
- Found while testing: her next line arrived before an unanswered question's 20 s ran out and reset the wait, so the
  dip never happened. She now holds her next line while a question is waiting; opening the sheet counts as attention
  (no dip).
- Clients without a nail request keep the chat for the whole appointment (none in the roster today).
- **OWNER:** timings and lines are in `src/game/config/service-talk.json` (first line after 10 s, 14–26 s apart, 20 s
  to answer, −3 mood). The mid-service lines are fixed data lines (not AI); her replies to what you say are AI.
- **OWNER:** the lower third of the service screen is empty at 320 × 568 (the hand keeps its proportions); say if you
  want the tools or a bigger hand there.

## 035 fixes (overseer review of b7332ae, 2026-11-13)

1. Toolbar in two rows: the selected tab's options at full width (6 colours in view at 320 px, the 7th cut off; the
   chosen one has a dark ring), then tabs, Clean up (always at hand), the hand switch and Done. e2e: 5+ swatches inside
   the screen, the row scrolls, a swatch is tappable right after Service starts.
2. The Reply chip sits with her bubble beside her face; the nudge takes the hint line's place while it shows. e2e
   checks that chip, bubble, order reminder and hint don't overlap.
3. Checkout: no tools, no toggle, no pill; just the finished nails above the chat.
4. Her checkout line fits the result: `checkout` in `service-talk.json` has happy / okay / unhappy bands (thresholds on
   nail match and mood, 3 lines each; unhappy stays polite). Unit test, incl. the 28% / mood 49 case.
5. The pedicure prep starts below her face and the companion.
6. Order reminder (new; nothing like it existed): "🎨 colours · shapes · extras" under her bubble for the whole
   service, from the request data, in the interface language.
Also: a line counts as a question if it has a "?" anywhere (found by the e2e test: "Are you almost done? I have to
pick up my kids soon." was not waiting for an answer).
