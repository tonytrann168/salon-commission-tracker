# Story 053: Sign-up errors

> **Epic**: Salon Besties (Accounts)
> **Status**: Done
> **Layer**: Foundation
> **Type**: Logic
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 3: sign-up always failed with a generic error. Cause (overseer, Supabase auth logs): every /signup
returned 500 because the Resend SMTP sender is a gmail.com address, which Resend rejects ("domain is not verified").
The owner turns "Confirm email" OFF for now; a domain comes later.

## Acceptance Criteria

- [x] "Confirm email" off: sign-up returns a session → the player is signed in straight away (no code screen) and the
  save syncs, the same as after a code.
- [x] "Confirm email" on: the code flow stays as it was.
- [x] Friendly en + vi messages (chị/em kept through the {self}/{you} tokens) instead of a generic error:
  the code email could not be sent ("We couldn't send the code email right now. Please try again later."), already
  registered (Sign in opens with the email kept), weak password and bad email (what to fix), too many tries (wait a
  minute), offline (check your internet).
- [x] Forgot password: if the email fails, the same gentle message, never a raw error.
- [x] Sign-in still never says whether an email exists (the new errors are only for sign-up and email steps).

OWNER: when a sending domain is verified in Resend, turn "Confirm email" back on in Supabase; both settings work.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/account.test.ts` (the error mapping for each Supabase answer, sign-in stays vague, a session from
  sign-up signs in and uploads, no session → the code screen). Watched failing on the old code.
- e2e (en + vi), mocked Supabase: "Confirm email" off signs in at once and the save uploads; the same email again →
  Sign in; a 500 on sign-up and on Forgot password shows the gentle message with no raw error. The existing test
  keeps the code flow.
- Screens at 320 px: `production/qa/evidence/story-053/`.
