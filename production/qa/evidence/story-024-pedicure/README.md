# Story 024 evidence — Pedicure

Chromium (Playwright), 320×568, en and vi. Today's client seeded as Grace + "Pedicure day"; AI mocked.

| File | Shows |
|------|-------|
| `*-320-01-picker-scenario-tag` | The daily card: "🦶 Pedicure: tired feet, sandal season" / "🦶 Làm móng chân: chân mỏi, mùa dép sandal" |
| `*-320-02-pedicure-station` | The station shows the right foot (five toes, big toe largest), the 🦶1 switch ("Right foot (1 of 2)…" / "Chân phải (1/2)…"), chat area 213 px |

Checked ("problems: none"): the opening line asks for a pedicure; the request carried `scenarioId: pedicure-day`; chat area unchanged; no sideways scroll.
Tests: `src/tests/nail-art-match.test.ts` ("pedicure": five toes with the big toe largest and the little toe smallest; a foot with the wrong toe count is refused; a pedicure request picks the foot and is described "pedicure, both feet: …" to the client and the review; a manicure keeps the hand). `src/tests/scenarios.test.ts` lists the new scenario.
