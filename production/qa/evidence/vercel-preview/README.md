# Salon Besties — private hosted preview (owner setup)

A separate Vercel project for the game, so you and your testers can play on a phone over real HTTPS. **The PolishPay
tracker deploy is not touched** (its Vercel project, `vercel.json`, `.vercelignore`, `index.html`, `app.html` and
`legal.html` at the repo root are unchanged). The game lives in `src/` and gets its own project.

How it is protected:
- **Invite codes.** The first screen asks for a code. The server checks it against `TESTER_CODES` and sets a signed,
  httpOnly cookie (30 days). Every AI call (`/api/*`) without that cookie gets "401 unauthorized", so someone who only
  has the link cannot use your AI credit. You use a code too (no special bypass).
- **Spending guard.** Per code: 20 AI calls a minute and 300 a day. Per IP: 40 a minute. For everyone together:
  `DAILY_AI_CALL_CAP` a day (2000 if not set). Over a limit, the game says "Mai needs a rest! Come back tomorrow"
  (in Vietnamese too). One typed line is usually two AI calls (the client's reply plus Mai's correction check), so
  300 a day is about 100–150 lines per tester. Limits are in `src/server/guard-config.json`.
  *Honest note:* the counters are kept in memory (no database): each running server copy counts on its own and a
  restart resets them. That's fine for a few testers. **The Anthropic Console monthly spend limit (step 6) is the real
  safety net.**
- **Not in search engines:** `noindex` header and meta tag, and `robots.txt` says Disallow.

## Owner setup, step by step

You need: a Vercel account (free Hobby is fine) connected to your GitHub, and your Anthropic API key.

1. **Create the project.** On vercel.com click **Add New… → Project**, choose the GitHub repository
   **salon-commission-tracker**, and click **Import**.
2. **Configure it** (on the same "Configure Project" page, before deploying):
   - **Project Name:** `salon-besties` (your link becomes https://salon-besties.vercel.app, or the closest free name).
   - **Framework Preset:** `Other`.
   - **Root Directory:** click **Edit**, choose **`src`**, click **Continue**.
   - **Build and Output Settings:** turn on the override for **Build Command** and enter `npm run build:preview`.
     Leave Output Directory and Install Command as they are (the build writes Vercel's ready-made output folder).
   - **Environment Variables** (add each one: Name, Value, **Add**):
     - `ANTHROPIC_API_KEY`: your Anthropic API key.
     - `TESTER_CODES`: the invite codes, separated by commas, for example `OWNER-7Q2,LAN-48K,HOA-91X`. Use one code
       per tester so you can remove one later. Letters and numbers; capitals don't matter.
     - `COOKIE_SECRET`: a long random password, at least 16 characters (32+ is better). Make one with any password
       generator. Never share it. Changing it signs everyone out.
     - `DAILY_AI_CALL_CAP`: the most AI calls per day for everyone together, for example `1500`.
     - `UNLOCK_ALL_CODES` (optional): codes that open **every** client difficulty straight away, for you and testers
       who need to try hard clients, for example `OWNER-7Q2,TEST1-5RT`. These codes also work as invite codes. Anyone
       else starts with easy clients and unlocks harder ones by ranking up.
   - Click **Deploy**.
3. **Deploy from this branch.** The game is on the branch `claude/code-game-studios-myzjer` for now. In the project,
   open **Settings → Git**, set **Production Branch** to `claude/code-game-studios-myzjer`, save, then go to
   **Deployments** and **Redeploy** the latest one (or push any change). From then on every push to that branch updates
   the game.
4. **Protection for test builds.** In **Settings → Deployment Protection**, keep **Vercel Authentication** on (the
   default, "Standard Protection"). That locks the extra preview links Vercel makes for each change to your Vercel
   login. The main link (https://salon-besties.vercel.app) stays open so testers can reach the invite screen; the
   invite code protects it.
5. **Play on the phone.** Open https://salon-besties.vercel.app on the phone, enter your code, and play. The
   microphone works here because it is real HTTPS. To share: send a tester the link and their own code.
6. **Final safety net (do this).** On console.anthropic.com open **Settings → Limits** (or **Billing**) and set a
   **monthly spend limit** you are comfortable with. If anything goes wrong, Anthropic stops at that amount.

### Add or remove a tester
In the Vercel project: **Settings → Environment Variables → TESTER_CODES → Edit**. Add a code (comma-separated), or
delete one to revoke it, save, then **Deployments → Redeploy** the latest deployment. A removed code stops working
straight away after the redeploy, even for someone already signed in.

### Let a tester try every client
Add their code to `UNLOCK_ALL_CODES` (comma-separated) and redeploy. They see the Medium and Hard tabs open on their
next visit. Remove the code to put them back on the normal rank locks.

### Read tester feedback
Testers tap **💬 Góp ý / Feedback** (in Settings and on every results screen): a 1–5 smiley, an optional note, and
game details (client, level, language, stars, app version; on by default, never any chat text). The conversation is
added only if the tester ticks "Include my conversation". Nothing is stored in a database.

1. In the Vercel project open **Logs** (or **Deployments → the latest → Logs**).
2. Search for `FEEDBACK`. Each note is one line: `FEEDBACK {"v":1,"at":"…","tester":"<code id>","rating":4,"text":"…","details":{…},"chat":null}`.
3. `tester` is a short id made from the invite code, not the code itself. To match it to a person, ask Claude to work
   out the id for a code (it is the first 16 hex characters of the SHA-256 of the code in capitals).
4. Vercel keeps runtime logs only for a limited time (how long depends on your plan), so copy the lines you want to
   keep soon after testers send them. A tester can send up to 3 notes a minute and 30 a day.

### Keep feedback in Discord (recommended)
Vercel keeps runtime logs only briefly (on the free Hobby plan, about an hour), so feedback sent at night can be gone
by morning. A free Discord webhook keeps every note as a message:

1. In Discord: your server → **Server Settings → Integrations → Webhooks → New Webhook**. Pick a channel (for
   example `#feedback`), then **Copy Webhook URL**.
2. In Vercel: **Settings → Environment Variables → Add** `FEEDBACK_WEBHOOK_URL` = the copied URL (it must start with
   `https://`). Treat it like a password: anyone with it can post to that channel.
3. **Deployments → Redeploy** the latest deployment.

Each note then arrives as one message, for example `⭐⭐⭐⭐☆ (4/5) · tester 1a2b…`, the note, and `Game: client tom
(hard) · level some · vi · 3★ · v0.1.0` (and the chat only when the tester ticked it). Mentions are switched off, so
a note can't ping anyone. If Discord is down, the tester still sees "Thank you", and the `FEEDBACK` log line is still
written.

### Change the limits
`DAILY_AI_CALL_CAP` is an environment variable (edit, then redeploy). The per-code and per-minute limits are in
`src/server/guard-config.json` (ask Claude to change them).

## What was checked here (no Vercel access from this session)

`npm run build:preview` builds `src/.vercel/output` (Vercel's Build Output API: the static game, one bundled
`/api` function, routes). The built function was run on a local Node server with `TESTER_CODES`, `COOKIE_SECRET` and
`DAILY_AI_CALL_CAP=2`: no cookie → 401; wrong code → 401; right code (any case, spaces trimmed) → 200 with an
`HttpOnly; Secure; SameSite=Lax` cookie; signed in → AI calls reach the handlers; over the global cap → 429
`daily_cap`; a forged cookie → 401; a 70 KB body → 413. A browser run against a local stand-in for Vercel's routing
(screenshots here, en/vi at 320 px): the invite screen, a wrong code, signed in (the page cannot read the cookie),
and "Mai needs a rest" once the cap is hit. Tests: `src/tests/guard.test.ts`.

**Not yet checked: a real Vercel deploy.** Please send the overseer the first deploy's build log if anything fails.

| File | Shows |
|------|-------|
| `*-320-01-invite` | First screen: invite code |
| `*-320-02-wrong-code` | A wrong code: a friendly message |
| `*-320-03-in` | The right code: into the game |
| `*-320-04-mai-needs-a-rest` | Over the cap: "Mai needs a rest! Come back tomorrow." |

Local development is unchanged: `npm run dev` (HTTPS on the LAN) and `npm run dev:local` need no invite code.

### Natural voices (Azure AI Speech) — optional, story 037
Without this the clients speak with the phone's own voice (it works, but sounds robotic). With it they get natural
neural voices whose tone follows their mood.

1. In the Azure portal (portal.azure.com): **Create a resource → AI Services → Speech** (or search "Speech").
   Pricing tier **Free F0** (about 0.5 million characters a month for neural voices). Pick a region near your players,
   for example **West US 2**. Create it.
2. Open the resource → **Keys and Endpoint**. Copy **KEY 1** and the **Location/Region** (for example `westus2`).
3. In Vercel → the salon-besties project → **Settings → Environment Variables**, add:
   - `AZURE_SPEECH_KEY` = KEY 1
   - `AZURE_SPEECH_REGION` = the region, lower case, no spaces (for example `westus2`)
   Then **Redeploy**.
4. Try it: start an appointment with the speaker on (🔊). The client should sound natural; an annoyed client sounds
   annoyed. If the key is missing or wrong, the game quietly uses the phone's voice.

Limits (in `src/server/guard-config.json`): 6,000 characters of speech per tester code per day and 15,000 for everyone
per day (about 450,000 a month, inside the free tier). Only clients' lines are sent to Azure, never what the player
types or says. Voices per client and the mood → tone table are in `src/game/config/voice-cast.json`.
Locally: with the two variables in `src/.env.local`, `npm run smoke:api` adds a voice check.
