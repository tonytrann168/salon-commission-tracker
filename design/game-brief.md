# Game Brief: Salon Besties

**One-sentence pitch:** A phone game where you work the chair for real: talk (out loud or typed) with AI clients who have moods, opinions and attitude, do their nails while you chat, and your AI best friend coaches you, remembers you and grows with you from Junior Tech to Master Tech.

## Core loop
- Pick a client (easy / medium / hard) or start a shift of several clients back to back.
- Run the appointment: consultation → service in the nail art station while keeping the conversation going → checkout and rebooking. The client's mood moves live with everything you say and do.
- Get stars, a tip and a written review, plus a bestie debrief and skill scorecard.
- Spend tips on station upgrades and new polishes, level up, earn badges, unlock harder clients; a daily challenge client brings you back tomorrow.

## Player goal & fail state — what "working" looks like
- **Goal:** turn every client into a 5-star review with a good tip and a rebooking.
- **Fail:** the client's mood hits zero and they walk out, or they leave a 1–2 star review / demand a redo.
- **A session is complete when** the client has checked out and the bestie debrief has been shown.

## MVP — what must exist to be the game
1. **Live client appointment:** a Claude-run client you talk to by text or voice — consultation, service, checkout — with a live mood meter.
2. **Client roster:** ~9 clients across easy / medium / hard: picky / changes mind, rude / impatient, complaints & redos, price & booking issues. Realistic but clean.
3. **Nail art station:** shape, base color, polish, core art tools (gradients, gems, stickers); the client judges the result against what they asked for.
4. **Signature bestie:** optional live whispered hints, post-client debrief, memory of past sessions and weak spots, levels up alongside the player, sometimes asks the player to teach them.
5. **Scoring:** stars, tip and written review, plus a scorecard on greeting, consultation, upsell, rebooking and problem handling.
6. **Progression & hooks:** tips buy upgrades and polishes; ranks Junior → Master Tech with skill badges; daily challenge client with a streak.
7. **English + Vietnamese:** UI and bestie coaching in either language; clients speak English by default, Vietnamese optional.

## Out of scope — not building this (v1; all planned for later)
- Hair salon (next location)
- Mirror role swap (player as the client; tech copies the player via quiz + play history, or a different tech)
- Story campaign chapters (beauty school → salon owner)
- Leaderboards and sharing
- Bestie customization shop and any payments (business model decided later)
- Native App Store / Google Play apps (v1 is an installable web app)
- PolishPay integration

## Build order
1. One client, text only, with mood meter and scorecard — the riskiest question: does talking to an AI client feel real and fun?
2. Bestie whispers, debrief, and memory between sessions.
3. Voice in and out.
4. Nail art station, tied to what the client asked for.
5. Full client roster and the three difficulty tiers.
6. Progression: tips, upgrades, ranks, badges, daily challenge and streak.
7. Vietnamese language.

---
**Who it's for / what they feel:** working nail techs playing 5–20 minutes between clients, who come away more confident and proud of how they handle people.

**Art & audio direction:** cute, stylish 2D with very expressive faces (moods readable at a glance), trendy pastel salon, upbeat lo-fi music, voiced characters.

**Reference game:** *Good Pizza, Great Pizza* — v1 keeps its read-the-customer-while-you-make-their-order loop, except the customers talk back live.

**Notes:** career sim is the frame (ranks, upgrades); quick single client vs full shift gives the arcade side; story chapters come later. Player chooses session length. AI: Claude for characters and scoring, a separate voice service for speech.
