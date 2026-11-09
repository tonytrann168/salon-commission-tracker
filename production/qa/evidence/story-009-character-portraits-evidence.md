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

`stamp.txt` hashes the code these were captured from.

## Checks

- Each expression is told apart by shape (brows, eyes, mouth, head turn), not color only — seen in 03–08.
- The chat log's position and height (top 193 px, height 399 px) were identical before and after every expression change. At walk-out the log shrinks only because story 001's end box appears.
- The portrait zone's aria-label follows the pose ("Dana, neutral" … "Dana, walking out").
- No page errors during any run.

## Not covered by a still

- The transition's feel (200 ms ease) and 60 fps on a real mid-range phone: DEFERRED, needs a playtest on a device.

## Observations

- The title screen's "Start appointment" button renders in a fallback serif font. This comes from story 001's button styling, not this story.

## Sign-Off

A **Visual/Feel** story needs the lead sign-off below before `/story-done` marks it COMPLETE. Solo developers may sign as the lead.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead (art-director / designer) | | | [ ] Approved |
