# Story 013: Mai companion and dress-up

> **Epic**: Salon Besties (MVP)
> **Status**: In progress: art-independent parts complete (review); final figures and accessory art wait for the outside designer
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10 (art-independent parts built)

## Context

**GDD**: `design/game-brief.md` ("Pillar: Mai, the soul of the game" and the monetization note)
**Requirement**: Owner, 2026-11-10: "The most important key factor of this game is the mascot Mai, the soul of the game. Make it so players play partly because of Mai. She needs to be supportive, and players come back. Later, add levels and let players buy accessories and dress her up, but the beginning will be free."

**ADR Governing Implementation**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED

---

## Acceptance Criteria

- [x] **Friendship level:** a bond level between the player and Mai that rises with play (appointments, answered questions, phrases practised, daily hellos). It replaces or extends story 003's bestie XP (one number, not two), with a small celebration and a line from Mai at each new level.
- [x] **Daily hello and streak:** the first open of the day, Mai greets the player by name and notes their streak and recent progress ("3 days in a row! Last time you nailed the greeting."). A missed day is never scolded. Coordinates with story 007's daily hooks: one streak, owned in one place.
- [x] **Accessories, earned free:** accessories unlock by playing (friendship levels, streak milestones, first 5-star client, phrasebook milestones). Each fits one slot of the mascot skin (head, face, neck, held item, outfit/colour; slots come from the skin config built with the Mai bubble).
- [x] **Dress-up screen:** the player sees Mai large, tries unlocked accessories per slot, and saves the look. The bubble, the panel and the results card all show her current look. Locked items show how to earn them.
- [x] **Shop placeholder, no payments:** a "Shop — coming later" entry with no prices, no purchase flow and no payment code. Nothing that helps English (hints, translations, corrections) is ever for sale.
- [x] **Female or male** *(owner, 2026-11-10)*: at the first meeting the player picks a female or male companion; it can be changed later in Settings.
- [x] **Rename**: the player can rename the companion (1-12 characters: letters, spaces and Vietnamese diacritics; a simple blocklist of offensive words; default "Mai"). Stored on the device.
- [x] **Name and gender everywhere**: the companion's name and gender flow into every bestie prompt (hint, debrief, answer, corrections) and every i18n string that names or refers to her/him. In Vietnamese the female companion calls herself "chị" and the male one MUST use "anh" (never "chị"); English uses she/he. A `smoke:api` check: a male companion in Vietnamese says "anh", not "chị".
- [ ] **Bust vs full figure** *(wired: the bubble asks for the bust, the panel, cards and dress-up for the full figure; needs the designer's image skin to show a difference)*: the bubble shows the bust (head and shoulders); the Mai panel, a full conversation and the dress-up screen show the full figure.
- [x] **Accessories per version**: accessories are shared between the female and male versions where they fit; gender-specific accessories are allowed (per-skin anchors already support this).
- [x] Saved on the device; strings in English and Vietnamese; works at 390 and 320 px.

## Completion Notes (2026-11-10, art-independent parts)

- **Identity** (`game/companion-core.ts`, shared with the server; `config/companion.json`): female or male, a name (1-12 letters and spaces, Vietnamese diacritics fine; a blocklist matched without accents, short words only as whole words so Long, Điền, Edith pass), defaults Mai / Minh. Grammar: chị/she/her or anh/he/his. Mai's persona is a template.
- **On the device** (`game/companion.ts`, `salon.companion.v1`): the choice, name and look. First meeting on the first Start; change in Settings (Your bestie) any time.
- **Placeholder male**: mascot skin `placeholder-male` (short hair, deeper colour) and portrait `bestie-male`; the title, the chat corner, the bubble, the panel and the celebration cards follow the gender and wear the look.
- **Name and gender everywhere**: every bestie and corrections request carries `companion`; the server prompts use the name, the persona, and "anh" for a male companion in Vietnamese (never "chị"). Interface strings use `{mai}`, `{self}`/`{selfLower}` (Chị/Anh) and `{maiHer}` (her/his), filled from the saved companion. `smoke:api` check 13.
- **Friendship** = the bestie level (one number): appointments, answers, the daily hello (+3) and practice (+2). Each new level gets the companion's celebration card.
- **Daily hello**: the first open of the day; with a streak (the one daily-client streak from story 007) the greeting also names last time's best skill ("Last time you nailed saying hello").
- **Dress-up**: from Profile and Settings; every accessory by slot, unlocked by playing (start, friendship level, first 5 stars, phrasebook size, streak), locked ones say how; saved at once. "Boutique: coming later" with no prices or purchase code.
- **Waiting for the designer**: final female and male figures (full and bust), accessory art and per-skin anchors.
- **Owner to check**: the male default name "Minh", the blocklist, the Vietnamese lines in Mai's voice.

## Out of Scope

- Payments, prices and any store integration (later, owner's business decision).
- The hair-salon re-skin (later; the skin system already allows it).

## Dependencies

- Depends on: the owner's mascot pick and the Mai bubble + skin work (folded into stories 003/011); `story-007-progression-and-daily-hooks.md` for the shared streak.
- Unlocks: the later cosmetic shop.
