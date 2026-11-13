# Acceptance sweep — stories 001–029

> Story 030, 2026-11-13. Every story file's acceptance items checked against the code, the unit tests (348, `npm test`),
> the end-to-end suite (20 flows en + vi, `npm run e2e`, story 029) and the retained evidence in `production/qa/evidence/`.
> **Done** = every item met. **Gap fixed** = something was missing and is now fixed. **Needs owner** = a Visual/Feel
> check on a real phone, art from the designer, or a design choice. `/story-done` was not run on Visual/Feel stories.

| Story | Result | Notes |
|---|---|---|
| 001 Live client appointment | Done · **Needs owner (choice)** | Boxes were never ticked; all met. Replies are one structured answer revealed at speaking pace, not token-streamed: keep (recommended) or ask for streaming. |
| 002 Scoring and results | Done | Boxes were never ticked. Real grading now covered by `smoke:api` (16/16 on the real API). |
| 003 Signature bestie | Done · Needs owner review | — |
| 004 Voice in and out | Done · **Needs owner (phone)** | Microphone and speech on a real iPhone/Android. |
| 005 Nail art station | Done · **Needs owner (Visual/Feel)** | 60 fps painting on a phone. |
| 006 Client roster and difficulty | Done | — |
| 007 Progression and daily hooks | Done | Rank-up and shop flows in the e2e suite. |
| 008 English and Vietnamese | Done · Needs owner review | A Vietnamese speaker should read all vi text (with 025b's tokens). |
| 009 Character portraits | Done · **Needs owner (Visual/Feel)** | Boxes were never ticked; met. 60 fps and the faces' look need a phone playtest; final art from the designer. |
| 010 English in the chair | Done | Boxes were never ticked; met (33 + 25 + 3 tests). |
| 011 Learning loop | Done · Needs owner review | — |
| 012 Music and sound | Done · **Needs owner (Visual/Feel)** | Listen on a phone. |
| 013 Companion and dress-up | Done except art · **Needs owner (designer)** | Bust vs full figure is wired; shows a difference only with the designer's image skin. |
| 014 Contests and social | Not scheduled | Design note only (needs moderation and a backend); accounts (025) now exist. |
| 015 First-time onboarding | Done | First run in the e2e suite. |
| 016 Tester feedback | Done | — |
| 017 Harder nail requests | Done | Both hands in the e2e suite. |
| 018 PWA and fast start | Done · **Needs owner (phone)** | Install to the home screen on an iPhone; offline title in the e2e suite. |
| 019 Scenarios | Done | — |
| 020 Save backup | Done | Backup → restore across browsers in the e2e suite. |
| 021 Companion corner | Done | — |
| 022 Roster expansion | Done | — |
| 023 Comfort and accessibility | Done · **Needs owner (Visual/Feel)** | Text sizes and contrast on a phone. |
| 024 Pedicure | Done | Pedicure in the e2e suite. |
| 025 Accounts | Done · **Needs owner (setup)** | Supabase project, SMTP, Vercel env vars (`src/supabase/README.md`); the full flow runs against a fake Supabase in the e2e suite. |
| 025b Companion voice | Done · Needs owner review | Vietnamese speaker review of the account strings and relation cards. |
| 026 Soak & scrub | Done · **Needs owner (Visual/Feel)** | Swipe feel on a phone. |
| 027 Backup QR + cue | Done | Cue now waits for the stage (028 commit). QR decodes (jsQR). |
| 028 Tết pack | Done · **Needs owner (designer)** | Áo dài is placeholder art. |
| 029 End-to-end suite | Done | — |

## Gaps found

- Stories 001, 002, 009, 010: acceptance boxes had never been ticked although the work was done; ticked with notes.
- No functional gaps found in the code during this sweep.

## For the owner (phone playtest checklist)

1. 60 fps while painting and with portraits (005, 009).
2. Voice in and out on iPhone and Android (004).
3. Music and sound levels (012).
4. Install to the home screen; offline title (018).
5. Text sizes / high contrast (023); soak & scrub swipe (026).
6. Decide: token streaming for client replies (001), recommended no.
