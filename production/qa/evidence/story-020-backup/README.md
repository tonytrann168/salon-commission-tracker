# Story 020 evidence — Save backup & transfer

Chromium (Playwright), 320×568, en and vi. Two separate browser contexts stand in for Safari and the home-screen app (separate storage).

| File | Shows |
|------|-------|
| `*-320-01-backup-code` | Settings → Back up & restore: the code (SB1-…, ~600 characters for 12 appointments), Copy code, Save as a file, Restore from code |
| `*-320-02-restore-confirm` | First run in the "app": "Played in Safari before? Restore your progress" → paste → Check code → what it holds + "This replaces the progress on this phone" → Replace and restore |

Checked ("problems: none"): a code cut short is refused ("The code is incomplete or changed…"); after Replace and restore the page reloads with wallet 77, 12 appointments, the bought rose-gold polish and the companion Minh.
Tests: `src/tests/backup.test.ts` (round trip of all `salon.*` keys and nothing else, compression, damaged / cut-off / future-version codes refused, a code with a correct checksum but a foreign key refused, restore replaces only the game's keys).
