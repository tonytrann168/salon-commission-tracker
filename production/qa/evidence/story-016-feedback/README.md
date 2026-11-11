# Story 016 evidence — Tester feedback

Chromium (Playwright), 320×568, en and vi, against the local dev server (its `/api/feedback` route logs like the hosted one; no guard locally).

| File | Shows |
|------|-------|
| `*-320-01-feedback-sheet` | From Settings: "Góp ý / Feedback", five smileys (4 picked), a note, "Add game details" ticked; no conversation box here |
| `*-320-02-feedback-thanks` | Sent: "Thank you! 💖" |
| `*-320-03-feedback-results` | From the results screen: 5 picked, game details and "Include my conversation" ticked |

Checked in the same run ("problems: none"):
- From Settings the post carried `{rating, text, details: {language, level, appVersion}}` and **no chat**.
- From results with the box ticked: `details: {clientId: "grace", difficulty, level, language, stars: 4, appVersion}` and the 7-message conversation.
- The dev server wrote four `FEEDBACK {"v":1,...}` log lines, one per post.
- Note: these shots were taken before the "Add game details" label lost its "No chat text." ending (it read oddly next to the conversation box); the wording change is text only.

Tests: `src/tests/feedback.test.ts` (6): what the browser sends (details only when allowed, chat only when ticked), one tidy log line, no chat unless `includeChat`, bad input refused or dropped, a plain (non-AI) route, and the preview guard's own feedback limits (cookie needed, 3/min, 30/day, AI budget untouched).
Reading feedback: `production/qa/evidence/vercel-preview/README.md` → "Read tester feedback".
