# Story 003 evidence — Signature bestie

Captured 2026-11-10, dev build, Chromium (Playwright, `--use-angle=swiftshader`), iPhone 13 (390 px) and 320×568, reduced motion on.
`en-*` = full Vietnamese mode off, `vi-*` = on; `*-320-*` = small phone. Every AI answer (client, grading, bestie) was answered
by the browser test, so the wording here is the test's, not the model's. Real-API wording: `npm run smoke:api` (now 7 checks).

| File | Shows |
|------|-------|
| `*-01-title-greeting` | Mai greets the player on the title screen (memory seeded: one past appointment) |
| `*-02-settings-hints` | Settings: the new Bestie hints switch |
| `*-03-hint-whisper` | Hint tapped mid-appointment: Mai's whisper covers the header and portraits (she smiles while whispering), the chat and reply box stay usable; not in the transcript |
| `*-04-debrief-question` | Results: Mai's debrief (praise + try next), bestie level, level-up note, and her question |
| `*-05-debrief-reply-level-up` | The player's answer and Mai's reply |
| `*-06-title-welcome-back` | Back on the title: "client number 3", from saved memory |

Checked in the same run (script log):
- The hint, debrief and answer calls all carried the saved memory notes, and the coaching language followed full Vietnamese mode (`en` / `vi`).
- After the debrief and the answer, the saved memory was `{"summary":"Great greeter. Fixes problems kindly.","sessions":2,"xp":40,"lastQuestionAt":1}`: one session, XP 25 → 35 (level 2) → 40, the refreshed summary, and the question recorded.
- Debrief asked a question (`askQuestion: true`) only because the test fixed the random roll; the rule itself (never on the first appointment, never two in a row, otherwise 40%) is unit-tested.
- No page errors; nothing wider than its box or off-screen at 390 or 320 px.
- Layout check with the whisper open (overseer's review of 2561e81), all four runs: reply box 358 px wide at 390 and 288 px at 320; the latest client line fully visible; the whisper never covers the chat. The Hint button and an open whisper now sit over the header and portraits instead of pushing the chat down, and on narrow phones the reply box has its own row above Help me say it and Send.
- Fixed in this run: on 320×568 the title menu ran 15 px off-screen once the greeting was added; short screens now get a tighter menu.

Still needs the real API: how Mai actually sounds (kind, short, in Vietnamese with English example lines), and that her memory notes stay useful over several sessions.

**Mock translations (re-shot 2026-11-10):** the browser test now gives every client line its own Vietnamese, and the script checks that each bubble shows its own translation (it found no mismatches). An earlier capture showed one fixed mock string under every line; that was the test mock, not the game.

**Superseded (owner, 2026-11-10):** the Hint button and the auto-opening whisper shown here were replaced by Mai's on-demand bubble. Current screens: `production/qa/evidence/mai-bubble/`.
