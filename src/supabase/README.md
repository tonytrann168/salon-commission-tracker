# Player accounts (story 025): owner setup

Players can make an account (email + password) to keep their progress on any phone. Without this setup the game
works as before and shows no account buttons.

1. **Create a project** at supabase.com (free plan). Pick a region near your players (e.g. West US).
2. **Create the table:** in the project, open **SQL Editor → New query**, paste everything from
   `src/supabase/migrations/001_saves.sql`, and **Run**. It creates `saves` (one row per player), the
   row-level-security rules (each player can only see their own row), and `delete_my_account()`.
3. **Email + password with codes:** **Authentication → Sign In / Providers → Email**: Email provider **on**,
   **Confirm email on**, **Email OTP length 6**. Minimum password length 8 (no other rules needed).
4. **Codes, not links** (links open Safari instead of the home-screen app): **Authentication → Emails → Templates**:
   - **Confirm signup**: put `{{ .Token }}` in the email, e.g. "Your Salon Besties code is {{ .Token }}", and remove
     the `{{ .ConfirmationURL }}` link.
   - **Reset password**: the same, "Your code to set a new password is {{ .Token }}".
5. **Real email sending (required for testers):** Supabase's built-in email only sends to your own team and is
   heavily rate-limited. Under **Authentication → Emails → SMTP Settings**, turn on custom SMTP with a free provider
   (for example Resend or Brevo): sender address, host, port, user, password from that provider.
6. **Connect the game:** in **Project Settings → API**, copy the **Project URL** and the **anon public** key. In
   Vercel → Settings → Environment Variables add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then
   **Redeploy**. (The anon key is meant to be public; the table's rules keep each player's save private. Never put
   the `service_role` key in Vercel for the game.)
7. **Try it:** Settings → Your account → Sign in or create an account → Create account → type the code from the
   email. Then try "Forgot password?" and signing in on a second phone.

What is stored: the player's email and password (Supabase Auth keeps the password hashed; the game never sees it
again) and their game progress (the same contents as a backup code). No payment data. "Delete my account" removes
both; the progress on the phone stays.
