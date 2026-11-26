# Story 074 — The client never speaks as the stylist

Type: Bug fix · Owner playtest screenshot, 25 Nov 5:15 PM (production/qa/evidence/story-074/owner-bug-2026-11-25.png).

## The bug
The stylist said "Thank you sister". The AI client (Grace) answered: "You are welcome, dear. **What color do you want today?** Coral is my favorite." That is the stylist's own question, as if the roles had swapped. The game then showed it as her question waiting for an answer ("Khách đang chờ chị trả lời: 'What color do you want today?'").

## Why
The client's prompt said once, at the top, that she is the client, but nothing forbade the stylist's lines. The stylist's last message was not a question (just thanks), so the model kept the conversation moving with the most likely next salon line, which belongs to the stylist. Nothing on the server or in the game checked for it.

## Fix
1. **Prompt:** a ROLES section. She is the CLIENT; she never asks what colour, shape, length or service the stylist wants, and never offers a service, a seat, a price or the steps. When the stylist says something that is not a question, she answers briefly and then says what she wants, or asks a client's question.
2. **Server check** (game/role-guard.ts + config/role-guard.json, shared with the game). If her reply has a stylist-style line ("What colour do you want…", "How can I help you", "Have a seat", "Put your feet in the water"…), the server asks the model once more with a correction note. If she swaps again, the stylist-style sentences are dropped. If nothing is left, a plain line is used ("I'd like my nails done in coral today, please.").
   - A client asking the stylist's advice ("What colour would you pick for me?") is fine and never matches.
3. **Game:** a stylist-style question is never shown as her question waiting for an answer.
4. **Live smoke check** (scripts/smoke-api.mjs) with the owner's transcript.

## Owner idea, recorded (not built)
"Swap seats": sometimes the player chooses to be the customer and the AI is the nail tech. It's in design/game-brief.md under Later (v2+). It wasn't in the original brief: the reference game, *Good Pizza, Great Pizza*, always has the player serving.

## Acceptance
- [x] Unit (tests/role-guard.test.ts), watched failing on the old code (4 of 5 failed):
  - the swapped reply is asked again with the correction
  - a second swap is dropped
  - normal replies and advice questions pass in one call
  - the prompt has ROLES
  - the game doesn't show the swapped line as her waiting question
- [x] Smoke: the owner's transcript (needs the live API; run in the overseer's review).
- [x] npm test and e2e green.

## OWNER
- OWNER: "swap seats" (the player as customer): want it as a story, and when?
