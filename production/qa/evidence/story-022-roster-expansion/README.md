# Story 022 evidence — Roster expansion

Chromium (Playwright), 320×568, en and vi, all difficulties unlocked. Full-page shots of the Easy and Hard tabs.

- Easy: Ana, Grace, Jake, Mia, Rosa. Medium: Dana, Kim, Lily, Marcus, Priya. Hard: Brenda, Derek, Hana, Tom, Victoria (15 clients, five per difficulty).
- Men (short-hair faces, male voice preferences): Jake, Marcus, Derek (and Tom).
- No sideways scroll; every card has its face and picker line in both languages.

Tests: `src/tests/roster.test.ts` ("roster expansion": 15 clients, five per difficulty, the men, Lily's two voices, Ana's simple English, Hana picky and hard; Hana's persona and nail request reach the AI prompt). `smoke:api` check 15: Hana (new hard client) asks about technique and stays clean (not run here: no key).
