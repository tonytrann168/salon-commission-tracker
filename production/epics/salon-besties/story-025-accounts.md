# Story 025: Player accounts — sign in with email, continue anywhere

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner Supabase setup pending, see `src/supabase/README.md`)
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Owner: "log in with email, include forgot, keep it light; the only purpose is continuing progress." No payment or
credential data in the game. Supabase (free tier). Owner correction (2026-11-13): **email + password**, with every
email step done by a 6-digit **code** (links open Safari instead of the home-screen app).

## Acceptance Criteria

- [x] **Sign up / sign in with email + password** (Supabase `signUp` / `signInWithPassword`). Password: at least 8
  characters, nothing else; a show/hide eye.
- [x] **Confirm the email at sign-up with a 6-digit code** (`verifyOtp` type `signup`), so a mistyped email is caught.
  "Send a new code" unlocks after 60 s (`config/account.json`).
- [x] **Forgot password?** email → 6-digit recovery code (`verifyOtp` type `recovery`) → new password → signed in.
- [x] **Remember me** (default on), through supabase-js's custom `storage`: on → the session lives in localStorage
  (signed in next time); off → sessionStorage (closing the app signs out). Changing it while signed in moves the
  session. Both tested.
- [x] **"Which email did I use?"** shows the email last used on this phone, masked (t***@gmail.com).
- [x] **Friendly en/vi errors:** wrong password, email not confirmed (goes to the code step), wrong code, rate limited,
  offline. Sign-in failures never reveal whether an email exists: one "Email or password is wrong."
- [x] **Cloud save:** `saves` (user_id, data = the SB1 backup code, version, updated_at), row-level security (own row
  only), `delete_my_account()`. The browser uses only the public anon key.
- [x] **Sync, local-first:** signed in, progress uploads 4 s after changes and at the end of each appointment.
  At sign-in and at each start: no cloud save → upload; same → nothing; only one side changed since this phone last
  matched (a fingerprint of the progress, not the code, which carries its date) → that side wins quietly; this phone
  empty → use the cloud; both changed → "Which progress do you keep?" with appointments, XP and tips of each. Never
  overwrites silently.
- [x] **Optional:** play signed out. After the 2nd appointment the companion suggests an account once. Settings → Your
  account: signed in as …, Sign out (uploads first), Delete my account (confirm step; this phone's progress stays).
- [x] **Feature flag:** without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` nothing about accounts shows; the
  Supabase library loads only when needed.
- [x] **Privacy note** on the sign-in screen and in Settings (en and vi).
- [x] Tests with a stand-in cloud; `supabase/migrations/001_saves.sql`; the owner README.

## Test Evidence

**Status**: [x] Created — `tests/account.test.ts` (17 tests: config flag, validation, no email-exists leak,
remember me on/off and moving the session, sync decisions, fingerprint, debounced uploader, sign-up + code, wrong
login, continue on a new phone, remembered phone at start, keep-which choice, forgot password, sign out, delete).
Screens: `production/qa/evidence/story-025-accounts/` (en + vi, 320 px, dev build with a stand-in cloud): no account
UI without settings, the companion's suggestion, signed-out settings, sign-in error + email hint, the code step with
the 60 s resend, the keep-which choice, signed in.

Not tested here: a real Supabase project (none exists yet; the owner creates it with the README).
