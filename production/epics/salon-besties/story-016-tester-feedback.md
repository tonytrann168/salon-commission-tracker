# Story 016: Tester feedback button

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Integration
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

Testers get the hosted preview link tonight (owner request via the overseer, 2026-11-10). They need a quick way to tell the owner what they think, and the owner needs to read it without a database.

## Acceptance Criteria

- [x] A "Góp ý / Feedback" entry in Settings and on the results screen opens a small sheet: a 1–5 smiley rating, an optional text box (up to 500 characters), and Send.
- [x] An optional, ticked-by-default "Add game details" attaches: client id, English level, language, stars (results only) and app version. Never any chat text.
- [x] A separate, unticked-by-default "Include my conversation" box adds the appointment's chat text (results only). It is sent only when ticked.
- [x] It posts to `/api/feedback`. On the hosted preview that route needs the invite cookie and has its own rate limits (per code per minute and per day), separate from the AI budget.
- [x] The server validates everything and writes one structured log line (`FEEDBACK {...}` JSON, with the tester's code id, never the code) readable in Vercel → Logs. No database.
- [x] A thank-you message on success; a friendly retry message on failure; works in en and vi at 320 px.
- [x] Unit tests (no AI, no network) and a README section on reading feedback in Vercel → Logs.

## Out of Scope

- Storing or emailing feedback; analytics dashboards.

## Test Evidence

**Required evidence**: `src/tests/feedback.test.ts`; a 320 px screenshot of the sheet in en and vi.

**Status**: [x] `src/tests/feedback.test.ts` and `production/qa/evidence/story-016-feedback/`.

## Completion Notes (2026-11-10)

- Server: `server/handlers/feedback.ts` (validate, one `FEEDBACK {json}` line via console.log), `PLAIN_ROUTES` in `server/routes.ts` (not AI routes), `guard.chargeFeedback` (cookie, `feedbackPerCodePerMinute` 3, `feedbackPerCodePerDay` 30 in `guard-config.json`; the AI budget is untouched). Local dev serves it without a guard.
- Client: `game/feedback.ts` (post builder, app version from package.json), `game/ui/feedback-sheet.ts` (entry in Settings and on the results screen).
- The tester's id is the code's short hash (as in the session cookie), never the code.
- **OWNER:** the 3-a-minute / 30-a-day limits; whether "Add game details" should be on by default.
