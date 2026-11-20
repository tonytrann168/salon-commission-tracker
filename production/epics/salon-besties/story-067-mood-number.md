# Story 067: Her mood as a number (like a battery %); two nits; a vision note

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-19

## Context

Owner request: replace the client's mood bar with a battery-style number. Two nits from the 066 review and a
world-direction note for the design brief.

## Acceptance Criteria

- [x] **The mood bar is gone.** Her mood is a number 0–100 in a pill, "😊 72", with one width (≥ 76 px). At 320 px it
  sits beside 📋, 📷 and 🔇 without shrinking; this fixes the "bar shrinks to a stub" nit.
  - The visible word "Mood / Tâm trạng" is gone so the row fits 320 px in vi. The pill keeps the spoken label
    "Mood 72 of 100" / "Tâm trạng 72 trên 100", and "Mood" as its tooltip.
- [x] **The colour by band** is in the new `config/mood-display.json`: green 70–100 😊, amber 40–69 😐, red 0–39 😟.
  No colour bands existed before: the old bar used a continuous hue, and `voice-cast.json` moodBands pick a tone of
  voice, so they were not reused.
- [x] **Colours** are CSS tokens on the panel (`--mood-good-bg/ink`, …) with AA-contrast text. The game has no dark
  mode yet, so a dark theme can reuse the same tokens.
- [x] **A quick tick** when the number changes (none with Reduce motion). No +/− float was added, because the bar
  had none.
- [x] The bar appeared only in the chat panel (consultation, service, checkout). The results never showed it.
- [x] **Nit**: the "📷 She brought a picture" notice has its own row under the mood bar, never on her chin or under
  the companion's bubble. It goes when 📷 is opened, or after 9 s.
- [x] **Nit**: the results card shows the streak once: the "Streak 0 → 1!" chip, without the second "Daily client
  done! Streak: 1." line.
- [x] **Doc**: `design/game-brief.md` "Later (v2+)" has the owner's world direction (11-19): 2D / 2.5D, not 3D.
  The order is the core game, a decoratable salon room, a town map, then visiting friends' salons. Game logic stays
  separate from rendering.

## Tests

- Unit tests (`tests/mood-display.test.ts`): the bands at 100/70/69/40/39/0 with their faces, and the config
  refuses bad values.
- e2e test (`game-flows.spec.ts` "her picture"), en + vi:
  - the pill (band, label, width ≥ 70, no bar)
  - the picture notice row sits above the portraits
  - 📋 then 📷 still fits within 320 px
  - one streak line on the results

  These checks were watched failing on the old code first.
- The tests that read `.mood-value` still pass (the number is still in `.mood-value`).

## Evidence

`production/qa/evidence/story-067/`, en + vi at 320×568, 2× DPR:

1. green
2. amber, with the picture notice row
3. red (after a slip)
4. the results with one streak line
