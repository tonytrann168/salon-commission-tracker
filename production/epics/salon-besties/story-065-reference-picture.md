# Story 065: Hard level — a client brings a reference picture

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Feature
> **Type**: Logic + Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 4: real clients often show a photo of the nails they want. For now there are no real photos and no
image generation. The owner may supply real reference photos later.

## Acceptance Criteria

- [x] **The picture**: some hard clients (40%, by a stable hash of the visit; no pedicures) bring a picture.
  - It is a target design made from her request: her first shape, length and colour, her gradient and her art,
    fully painted.
  - The game's own nail renderer draws it off screen (`stage.designPhoto`) as a polaroid.
- [x] **📷 in the mood row** opens "Hana's picture" (vi: "Hình mẫu của Hana"): "Make the nails look like this: shape,
  length, colour and art." It pulses until first opened, and a short notice says she brought it.
- [x] **The match**: her request narrows to the picture, so the match at Done is how close the set is to it (shape,
  length, colour, art, coverage, neatness). Her mood change from the match is ×1.5 (`config/reference.json`), and
  her tip follows the mood, as before.
- [x] **The results**: "Her picture vs your work" side by side, in the polaroid's place, with **Match N%**
  (vi: Giống N%), in green, amber or orange.
- [x] **064 review notes**:
  - **The first-aid hint**: a slip clears the trimming notice. The strip says "A small nick: tap 1 · Styptic, then
    2 · Bandage" (vi: "Khách bị chảy máu nhẹ: bấm 1 · Cầm máu, rồi 2 · Dán băng"), then "Say sorry in the chat".
  - **The hint stays**: while first aid is open its hint stays, even if a fix request comes in. Her random "careful,
    too close to my skin" line could replace it.
  - **The pulsing ring**: the hangnail has a soft pulsing ring until the Nipper is on (none with Reduce motion).
  - **Her line**: "short oval" was only in the test fixture; the live game gives the AI her real request. The
    fixture now says "long oval".

## Tests

- Unit tests (`tests/reference.test.ts`):
  - hard clients only, about the configured share, stable per visit
  - the picture is one concrete look (shape, length, colour, gradient, gems, fully painted)
  - the narrowed request
  - the picture matches itself at 95% or more, and a different look below 60%
  - the config refuses bad values
- e2e test (`game-flows.spec.ts` "her picture"), en + vi:
  - the 📷 button and the notice
  - the picture is a real drawn image (a data URL more than 50 px wide); no overflow
  - the results show the side-by-side with a "Match N%" and no single polaroid
- e2e test (`game-flows.spec.ts` "hard level"), updated: after a slip the notice is gone and the strip names
  Styptic / Cầm máu. Both tests ran twice in a row to rule out the notice race (the picture notice now shows at
  once, so the hangnail notice wins).

## Evidence

- `production/qa/evidence/story-065/`, en + vi at 320×568, 2× DPR:
  1. the 📷 button
  2. her picture
  3. her picture vs your work (Match 65%)
- `production/qa/evidence/story-064/` re-shot: the pulse ring, the first-aid hint, and "long oval".
