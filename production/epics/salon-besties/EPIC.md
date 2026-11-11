# Epic: Salon Besties (MVP)

> **Source**: `design/game-brief.md` (minimal tier: the brief is the whole design)
> **Status**: Stories created — rescoped 2026-11-09 (educational-first redesign)

**Goal**: An educational phone game where Vietnamese nail techs build real-world English by working the chair: talk (typed or out loud) with AI clients who speak at your level, get Vietnamese help the moment you need it, and your AI best friend corrects you gently, remembers what you've learned, and grows with you from Junior Tech to Master Tech.

**Scope**: the brief's 7 MVP features — live client appointment, English in the chair, Vietnamese help, signature bestie & learning loop, scoring with an English score, nail art station, clients & progression.

**Order** (the brief's Build order): 001 and 009 are built; then 002 → 010 → 008 → 003 → 011 → 004 (with pronunciation practice) → 012 (music and sound, added 2026-11-10) → Mai bubble, mascot skin and concepts (owner, 2026-11-10; folded into 003/011) → 005 → 013 (Mai companion and dress-up; needs the owner's mascot pick) → 006 → 007.

## Stories

Listed in build order.

| # | Story | Type | Status | ADR |
|---|-------|------|--------|-----|
| 001 | Live client appointment (text) | Integration | In Progress | N/A |
| 009 | Character portraits & mood expressions | Visual/Feel | In Progress | N/A |
| 002 | Scoring & results (+ English score) | Logic | Complete | N/A |
| 010 | English in the chair | Integration | Ready | N/A |
| 008 | Menus and buttons in Vietnamese | UI | Complete (review) | N/A |
| 003 | Signature bestie | Integration | Complete (review) | N/A |
| 011 | Learning loop | Integration | Complete (review) | N/A |
| 004 | Voice in and out (+ pronunciation practice) | Integration | Complete (review + phone playtest) | N/A |
| 012 | Music and sound | Visual/Feel | Complete (review + phone listen) | N/A |
| 005 | Nail art station | Visual/Feel | Complete (review + phone 60 fps) | N/A |
| 013 | Mai companion and dress-up | Feature | In progress: art-independent parts complete (review); art waits for the designer | N/A |
| 006 | Client roster & difficulty | Config/Data | Complete (review) | N/A |
| 007 | Progression & daily hooks | Logic | Complete (review) | N/A |
| 014 | Companion contests & social visits (v2, not scheduled) | Design only | Not scheduled | N/A |
| 015 | First-time onboarding with Mai | UI | Complete (review) | N/A |
| 016 | Tester feedback button | Integration | Complete (review) | N/A |
| 017 | Harder nail requests (art tools, both hands) | Feature | Complete (review) | N/A |

## Backlog

- **Before going online (owner, 2026-11-09):** rate-limit the server functions (`src/api/*`): a per-IP limit and/or an origin check, so nobody can spend the API key's credit from outside the game. Also decide where `src/api` is hosted (it is not deployed yet).
