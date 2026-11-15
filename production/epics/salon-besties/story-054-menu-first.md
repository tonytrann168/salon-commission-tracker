# Story 054: Menu first, with a real icon

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 3: "I never saw the menu during play." It was only in Settings.

## Acceptance Criteria

- [x] **Set up your salon menu / Làm bảng giá cho tiệm** is the first step before the first client: Basic, Mid, Fancy
  or my own prices, the numbered list, **✓ Confirm menu**. The companion says in one line that clients order by
  number ("Number 3, please!") and that it can be changed any time from home.
- [x] Existing saves without a confirmed menu see the step once (their next Start); then never again
  (`menuConfirmed` in the save, synced with it).
- [x] A real icon everywhere: a little price board on an easel (`game/ui/menu-icon.ts`, drawn in code) on the home
  button, the chat's menu button, the menu sheet, Settings and the setup screen.
- [x] Home: **Bảng giá của tiệm** opens the menu to view or edit any time (with Back).
- [x] Clean mode shows its tool under the finger: a cotton pad (centred) for Chà / Rub, a cotton swab for Lau viền /
  Clean edges, like the polish brush (off with reduced motion).
- [x] Found on the way: the account suggestion card on the home screen was wider than the phone at 320 px (text cut
  at both sides); it now fits, with one-line buttons.

OWNER: please sign this Visual/Feel story (the setup step, the icon, the cotton pad).

## Test Evidence

**Status**: [x] Created

- e2e (en + vi): a save without a confirmed menu sees the setup (title, the companion's line, 7 items) once; Confirm
  saves `menuConfirmed` and the preset; the next Start goes straight to the clients; the home price-board button
  opens the menu with Back; the chat's menu button has the icon; Clean shows the cotton pad under the finger.
- Screens at 320 px: `production/qa/evidence/story-054/`.
