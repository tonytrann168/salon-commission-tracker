# Story 013: Mai companion and dress-up

> **Epic**: Salon Besties (MVP)
> **Status**: Ready (needs the owner's mascot pick: A Polish Bottle, B Hoa Mai blossom, C Salon Kitty)
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: L
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10 (owner vision: female/male, rename, pet-like care)

## Context

**GDD**: `design/game-brief.md` ("Pillar: Mai, the soul of the game" and the monetization note)
**Requirement**: Owner, 2026-11-10: "The most important key factor of this game is the mascot Mai, the soul of the game. Make it so players play partly because of Mai. She needs to be supportive, and players come back. Later, add levels and let players buy accessories and dress her up, but the beginning will be free."

**ADR Governing Implementation**: N/A (minimal — no ADRs)

**Engine**: Web — Vite 8.3 / PixiJS 8.22 | **Risk**: NOT ASSESSED

---

## Acceptance Criteria

- [ ] **Friendship level:** a bond level between the player and Mai that rises with play (appointments, answered questions, phrases practised, daily hellos). It replaces or extends story 003's bestie XP (one number, not two), with a small celebration and a line from Mai at each new level.
- [ ] **Daily hello and streak:** the first open of the day, Mai greets the player by name and notes their streak and recent progress ("3 days in a row! Last time you nailed the greeting."). A missed day is never scolded. Coordinates with story 007's daily hooks: one streak, owned in one place.
- [ ] **Accessories, earned free:** accessories unlock by playing (friendship levels, streak milestones, first 5-star client, phrasebook milestones). Each fits one slot of the mascot skin (head, face, neck, held item, outfit/colour; slots come from the skin config built with the Mai bubble).
- [ ] **Dress-up screen:** the player sees Mai large, tries unlocked accessories per slot, and saves the look. The bubble, the panel and the results card all show her current look. Locked items show how to earn them.
- [ ] **Shop placeholder, no payments:** a "Shop — coming later" entry with no prices, no purchase flow and no payment code. Nothing that helps English (hints, translations, corrections) is ever for sale.
- [ ] **Female or male** *(owner, 2026-11-10)*: at the first meeting the player picks a female or male companion; it can be changed later in Settings.
- [ ] **Rename**: the player can rename the companion (1-12 characters: letters, spaces and Vietnamese diacritics; a simple blocklist of offensive words; default "Mai"). Stored on the device.
- [ ] **Name and gender everywhere**: the companion's name and gender flow into every bestie prompt (hint, debrief, answer, corrections) and every i18n string that names or refers to her/him. In Vietnamese the female companion calls herself "chị" and the male one MUST use "anh" (never "chị"); English uses she/he. A `smoke:api` check: a male companion in Vietnamese says "anh", not "chị".
- [ ] **Bust vs full figure**: the bubble shows the bust (head and shoulders); the Mai panel, a full conversation and the dress-up screen show the full figure.
- [ ] **Accessories per version**: accessories are shared between the female and male versions where they fit; gender-specific accessories are allowed (per-skin anchors already support this).
- [ ] Saved on the device; strings in English and Vietnamese; works at 390 and 320 px.

## Out of Scope

- Payments, prices and any store integration (later, owner's business decision).
- The hair-salon re-skin (later; the skin system already allows it).

## Dependencies

- Depends on: the owner's mascot pick and the Mai bubble + skin work (folded into stories 003/011); `story-007-progression-and-daily-hooks.md` for the shared streak.
- Unlocks: the later cosmetic shop.
