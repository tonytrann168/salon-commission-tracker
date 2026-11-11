# Story 018 evidence — Installable app, offline title, fast first load

Production build (`npm run build`) served with `vite preview`, Chromium (Playwright), 320×568, Vietnamese.

## Sizes (before → after)

| | Before (6427aa7) | After |
|---|---|---|
| Main script (`index`) | 510.8 kB (160.3 kB gzip) | 125.7 kB (42.2 kB gzip) |
| JS loaded at start (index + shared `progression` + runtime) | 510.8 kB (160.3 kB gzip) | 192.0 kB (65.5 kB gzip) |
| `stage` (PixiJS, scenes, chat panel, nail station), loaded in the background | in the main script | 321.5 kB (97.9 kB gzip) |

The shop and profile screens load when opened. The build no longer warns about a chunk over 500 kB.

## Checks (script log, "problems: none")

- **Title before PixiJS:** with the `stage` chunk held back 3 s, the title menu was on screen at 114 ms with no canvas yet; the canvas (Mai's face, the title) appeared at 3.6 s. Scripts loaded before the stage: the runtime, `index`, `progression` only. (`vi-320-01-title-before-pixi`, `vi-320-02-title-with-pixi`)
- **Service worker:** active after the first visit; one cache `salon-besties-<build hash>` with 25 entries (the page, every built file, icons, manifest); **0 entries under /api**.
- **Offline:** with the network off, a reload opens the title (`vi-320-03-offline-title`); Start shows "Cần có mạng để đón khách…" instead of starting.
- Found and fixed on the way: the page itself was missing from the precache (Vite adds index.html after the plugin runs), and offline script loads missed the cache because of `Vary: Origin` (now matched with `ignoreVary`).
- `icon-512.png`: the app icon (placeholder Mai on pink); a maskable version keeps her in the safe zone.

Tests: `src/tests/sw.test.ts` (never /api, never other sites or non-GET, the page network-first, built files cache-first, template slots, manifest icons).
Not checked here: "Add to Home Screen" on a real Android or iPhone (owner's phone).
