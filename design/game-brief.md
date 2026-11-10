# Game Brief: Salon Besties

**One-sentence pitch:** An educational phone game where Vietnamese nail techs build real-world English by working the chair: talk (typed or out loud) with AI clients who speak at your level, get Vietnamese help the moment you need it, and your AI best friend corrects you gently, remembers what you've learned, and grows with you from Junior Tech to Master Tech.

## Pillar: Mai, the soul of the game *(owner, 2026-11-10)*
Mai, the player's mascot best friend, is the main reason to play and to come back. She is a supportive companion and coach, not a fixer: she is there when the player wants her (an on-demand bubble), remembers them, greets them by name, notices their progress and streaks, cheers their wins and is gentle after a bad appointment, never shaming. Her look is a cute salon mascot (concepts A/B/C, owner to pick), built as a swappable skin with accessory slots so she can be dressed up, and later re-skinned for the hair salon.

## Core loop
- Pick a client (easy / medium / hard) or a shift of several; clients speak English pitched to your English level (Beginner / Some / Comfortable / Fluent).
- Run the appointment in English: consultation → service in the nail art station while keeping the conversation going → checkout and rebooking. Stuck? Tap a client line to translate it, or type in Vietnamese with "Help me say it" and re-type the English to send.
- Get stars, a tip and a review, plus a scorecard that includes an English score; the bestie whispers corrections and debriefs you, and a Vietnamese recap gives you better English lines to try. New salon phrases go into your phrasebook.
- The game raises or lowers your level as you improve; spend tips on upgrades, rank up, and come back for the daily challenge client.

## Player goal & fail state — what "working" looks like
- **Goal:** serve a client fully in English at your level — 5 stars, a good tip, a rebooking — and come away with new phrases learned.
- **Fail:** the client walks out (mood hits zero) or leaves a 1–2 star review. **At Beginner and Some, English mistakes never lower the client's mood or cause a walk-out** — only how you treat the client does; at Comfortable and Fluent, clients react to unclear English realistically.
- **A session is complete when** the client has checked out, the bestie debrief and the Vietnamese recap have been shown, and new phrases are in the phrasebook.

## MVP — what must exist to be the game
1. **Live client appointment:** a Claude-run client you talk to by text or voice — consultation, service, checkout — with a live mood meter and an expressive portrait; voice includes pronunciation practice.
2. **English in the chair:** pick your English level at the start; clients adapt (short, slow, simple sentences for Beginner → slang, idioms and speed for Fluent); level-fair mood rules as in the fail state above.
3. **Vietnamese help:** tap any client line to translate it; "Help me say it" (type Vietnamese → English shown → re-type it in English to send); a full Vietnamese mode with English shown side by side; menus and buttons in Vietnamese.
4. **Signature bestie & learning loop:** optional whispered hints and corrections right after a mistake ("You said… → Better: …"), a debrief with a full English review, a Vietnamese recap with better lines to try, a phrasebook of salon phrases learned, memory of past sessions, and level auto-adjust after a few appointments (up is automatic, with a small celebration; down is only ever a suggestion the player accepts or declines).
5. **Scoring:** stars, tip and review, plus a scorecard on greeting, consultation, upsell, rebooking and problem handling, and an English score (clarity, politeness, grammar/vocabulary) weighted by the player's level.
6. **Nail art station:** shape, base color, polish, core art tools (gradients, gems, stickers); the client judges the result against what they asked for.
7. **Clients & progression:** ~9 clients across easy / medium / hard (picky, rude/impatient, complaints & redos, price & booking issues; realistic but clean); tips buy upgrades and polishes; ranks Junior → Master Tech with badges; daily challenge client with a streak.

## Keep — what must survive every change
- Expressive faces: moods readable at a glance.
- 5–20 minute sessions that fit between real clients.
- A kind bestie: Mai is supportive, on demand, and the reason players return.
- Real-salon situations.

## Avoid — what this game must never do
- Mistakes punishing Beginner or Some players.
- Mocking accents or background.
- Walls of English text at Beginner.
- Nagging corrections.

## Out of scope — not building this (v1; all planned for later)
- Hair salon (next location)
- Languages other than English (learned) and Vietnamese (help)
- Mirror role swap (player as the client; tech copies the player, or a different tech)
- Story campaign chapters (beauty school → salon owner)
- Leaderboards and sharing
- Payments of any kind. **Monetization note (owner, 2026-11-10):** v1 is free, with no purchases. Later, a cosmetic shop sells accessories and outfits for Mai (free ones are earned by playing). Never pay-to-win, and never put English help, translations or corrections behind a payment.
- Native App Store / Google Play apps (v1 is an installable web app)
- PolishPay integration

## Build order
1. One client, text only, with mood meter and portraits *(built: stories 001, 009)*.
2. Scoring with the English score (002).
3. English in the chair: level pick, client adaptation, tap-to-translate, Help me say it, full Vietnamese mode (010) — the riskiest question now: can a Beginner actually get through an appointment and learn from it?
4. Menus and buttons in Vietnamese (008) — Beginners can't use English menus.
5. Signature bestie (003).
6. Learning loop: whispers and debrief corrections, Vietnamese recap, phrasebook, level auto-adjust (011).
7. Voice in and out, with pronunciation practice (004) — the free word-level check first; a paid pronunciation-assessment service only if playtests ask for it.
8. Nail art station (005).
9. Client roster (006), then progression and daily hooks (007).

---
**Who it's for / what they feel:** Vietnamese nail techs at any English level, playing 5–20 minutes between clients, who come away less nervous and more confident speaking English with real clients — and proud of how they handle people.

**Art & audio direction:** cute, stylish 2D with very expressive faces (moods readable at a glance), trendy pastel salon, upbeat lo-fi music, voiced characters.

**Reference game:** *Good Pizza, Great Pizza* — v1 keeps its read-the-customer-while-you-make-their-order loop, except the customers talk back live and the conversation is your English lesson.

**Notes:** educational first, still a real game: the hooks stay. Career sim is the frame (ranks, upgrades); quick single client vs full shift gives the arcade side. AI: Claude for clients, bestie, translation, corrections and scoring; a separate voice service for speech.
