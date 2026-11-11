# Story 019 evidence — Scenarios

Chromium (Playwright), 320×568, en and vi. Today's client seeded as Grace + "Walk-in during a rush"; AI mocked.

| File | Shows |
|------|-------|
| `*-320-01-picker-scenario-tag` | The daily card with the scenario tag ("🚶 Walk-in: no booking, the salon is busy" / "🚶 Khách vãng lai: không hẹn trước, tiệm đang đông") |
| `*-320-02-scenario-chat` | The chat opens with the scenario's line ("Hi, I don't have an appointment. Can you squeeze me in? How long is the wait?"); the player apologises and gives the wait |

Checked ("problems: none"): the tag shows in both languages with no sideways scroll; the opening line is the scenario's; the client-turn request carried `clientId: grace, scenarioId: walk-in-rush` (no visit facts, which only go with "returning client").

Tests: `src/tests/scenarios.test.ts` (9): the six scenarios; a bad file refused with its name; eligibility (fits the client, difficulty unlocked, "returning" only after a visit, no bridal for Tom); a stable pick; the daily client keeps its scenario all day; opening line and nail request merged; the situation (and past visits) in the client prompt; requests (optional, unknown refused, bad visit facts dropped); grading gets the situation; per-client history.
`smoke:api` check 14: a walk-in client, greeted but not told the wait, asks about waiting (not run here: no key).
