# Evidence — chat auto-scroll (owner playtest fix, 2026-11-10)

Chromium (Playwright, `--use-angle=swiftshader`), **full motion** (the letter-by-letter reveal runs), en and vi, iPhone 13
(390 px) and 320×568. Long mock client lines so the chat overflows. Vietnamese under lines in the `vi` runs is the
test's mock ("(VI) ..." where it has no fixed translation).

| File | Shows |
|------|-------|
| `*-01-following` | After two exchanges: the newest line is in view; header and portraits never moved |
| `*-02-reread-new-message-pill` | Player scrolled up (mouse wheel); a new reply arrived; no jump, the "New message ↓" / "Tin nhắn mới ↓" pill shows |
| `*-03-after-pill` | Pill tapped: at the bottom, pill gone |
| `*-04-mai-panel-open-following` | With Mai's panel open, the player sends a line (Enter); the reply still follows and the panel stays open |
| `*-05-keyboard-open` | Visible area shrunk to 55% (phone keyboard): the reply box and newest line stay in view; on 320×568 the portraits fold away |

Measured (script log, all four runs): distance from the bottom 0–1 px mid-reveal and when settled; header top 0 → 0;
reread scrollTop unchanged when the reply arrived (e.g. 411 → 411); 0–1 px after the pill; 0–1 px with the whisper
open; keyboard: reply box bottom ≤ visible height (312 at 320×568, 365 at 390), distance 0. No page errors.
Unit tests: `src/tests/scroll-follow.test.ts` (follow / pause / pill / resume logic).
