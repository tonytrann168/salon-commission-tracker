# Story 032: Errors & resilience

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Overseer (release-candidate push): a friendly global error screen, clear AI timeouts with a retry, and privacy-safe
client error reports.

## Acceptance Criteria

- [x] **Global error screen**: an error the game did not catch shows a friendly, companion-voiced screen ("Thử lại" /
  "Try again" reloads; progress is safe because it is saved as you play). If the game was already usable, "Keep
  playing" closes it. Chunk-load errors stay with the stale-build guard (story 018); benign browser noise
  (ResizeObserver loop) and errors from other origins (extensions) are ignored.
- [x] **AI timeouts**: every AI call already gives up after a set time (30 s for a client turn); a timeout now says so
  ("{name} is taking too long…") with the existing Try again button in the chat; other failures keep their message.
- [x] **Client error reports**: message (≤300 characters, emails and long numbers scrubbed), the top 3 same-origin
  stack lines (no query strings), the app version and the screen path. Never chat text, email or storage. At most 3
  per page session, no duplicates. Sent to `POST /api/client-error`.
- [x] **Server**: `/api/client-error` validates strictly, logs a line, and forwards to `FEEDBACK_WEBHOOK_URL` if set; on
  the hosted preview it needs the invite cookie and has its own rate limits (separate from AI and feedback).
- [x] Unit tests (scrubbing, limits, server validation, guard limits, forwarding); e2e: a forced error shows the screen
  in en + vi and a report is sent with no chat text.

## Test Evidence

**Status**: [x] `tests/error-report.test.ts` (8 tests: scrubbing, stack top, report shape, per-session limit, server
validation + re-scrub + webhook, webhook failure, guard limits separate from feedback, timeout vs network). e2e (en +
vi): a forced error shows the screen, the report has only message/stack/version/path (no email), Keep playing closes it.
Screens: `production/qa/evidence/story-032-errors/`.

## Completion Notes (2026-11-13)

- `game/error-report.ts` (shared by browser and server), `game/ui/error-screen.ts`, `server/handlers/client-error.ts`;
  guard `chargeClientError` (5/min, 50/day per code; `server/guard-config.json`), the feedback and client-error
  guards now share one `chargePlain`.
- `networkError()` turns a timed-out fetch into `TurnError('timeout')` for the client turn, grading and translation;
  the chat says "{name} is taking too long…" with the existing Try again.
- **OWNER:** reports go to the same Discord webhook as feedback (`FEEDBACK_WEBHOOK_URL`); say if you want a separate one.
