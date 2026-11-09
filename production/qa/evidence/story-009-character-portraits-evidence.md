# Test Evidence: Story 009 — Character portraits & mood expressions

**Story**: `production/epics/salon-besties/story-009-character-portraits.md`
**Type**: Visual/Feel
**Captured**: 2026-11-09, dev build (`npm run dev`), Chromium via Playwright
**Viewports**: iPhone 13 (390x844) for the appointment screens; 375x667 and iPhone 13 for the title screen
**How moods were reached**: the browser test answered `/api/client-turn` with fixed mood changes (no API key yet). Dana starts at mood 45. Nothing faked ships in the game.

## Screenshots (`production/qa/evidence/story-009-character-portraits/`)

| File | What it shows | Mood |
|------|---------------|------|
| `01-title-bestie-375x667.png` | Bestie portrait (delighted) on the title screen; title, tagline and Start button clear | — |
| `02-title-bestie-iphone13.png` | Same, iPhone 13 | — |
| `03-neutral.png` | Dana neutral; bestie in the zone's corner | 45 |
| `04-pleased.png` | Dana pleased | 60 |
| `05-delighted.png` | Dana delighted | 85 |
| `06-annoyed.png` | Dana annoyed | 20 |
| `07-furious.png` | Dana furious | 10 |
| `08-walkout.png` | Dana walking out (eyes away, head turned) | 0 |

**Added 2026-11-09 (talking state + font fix):**

| File | What it shows |
|------|---------------|
| `09-title-font.png` | Title "Start appointment" button now in the app font (computed: `system-ui, sans-serif`) |
| `10-opening-line-revealing.png` | Opening line revealing word by word while Dana talks |
| `11-talking-while-typing.png` | Dana talking (mouth open) while the typing indicator shows |
| `12-reply-revealing.png` | Reply mid-reveal ("…done by four. Ca"), Dana talking on her annoyed face |
| `13-reply-done-settled.png` | Reply fully shown, Dana stopped talking |
| `14-reduced-motion-talking-static.png` | Reduced motion: static slightly-open mouth while the typing indicator shows |

`stamp.txt` hashes the code these were captured from.

## Checks

- Each expression is told apart by shape (brows, eyes, mouth, head turn), not color only — seen in 03–08.
- The chat log's position and height (top 193 px, height 399 px) were identical before and after every expression change. At walk-out the log shrinks only because story 001's end box appears.
- The portrait zone's aria-label follows the pose ("Dana, neutral" … "Dana, walking out").
- No page errors during any run.
- Talking: repeated screenshots of the portrait were identical while idle and after a reply, and varied while the typing indicator showed (mouth moving at about 7 Hz). Under reduced motion, the face held one still, slightly-open mouth while waiting and returned to the expression when the reply was shown.
- Text reveal: mid-reveal the bubble held a partial line; the screen-reader live region held the full line ("Dana: …") at once. Under reduced motion the reply appeared whole.
- Unit test `src/tests/expression-bands.test.ts`: every band edge and the walk-out rule (13 tests) pass.

## Not covered by a still

- The transition's feel (200 ms ease) and 60 fps on a real mid-range phone: DEFERRED, needs a playtest on a device.

## Observations

- ~~The title screen's "Start appointment" button renders in a fallback serif font.~~ Fixed 2026-11-09: buttons and inputs take the app font globally (`src/game/ui/global.css`).

## Sign-Off

A **Visual/Feel** story needs the lead sign-off below before `/story-done` marks it COMPLETE. Solo developers may sign as the lead.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead (art-director / designer) | | | [ ] Approved |
