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

## After the overseer's review of f5795f2: a deploy while the game is open

Risk: the title from build A is open, build B deploys (its service worker deletes A's cache, and the new deployment no longer serves A's hashed files), the player taps Start → `import('stage-<A>.js')` 404s.

- `game/stale-build.ts`: a failed lazy load (Vite's `vite:preloadError`, a rejected `import()` for the stage, shop or profile, or a module-load error while PixiJS starts) shows "New version! Reloading…" / "Có bản mới! Đang tải lại…" and reloads **once**. Saves are already on the device (written on every change), so nothing is lost.
- Loop guard: a session flag; a second failure within 60 s shows "The game couldn't load. Please close it and open it again." and does not reload. Offline it says a connection is needed instead. The flag clears once a stage really starts.
- **Found by the browser check and fixed:** when the preload error is cancelled, the import can still resolve on the page that is reloading, and that cleared the flag → an endless reload loop. Now nothing clears the flag once a reload has started, and only a stage that really starts counts as a good load. The regression test failed before the fix and passes after.
- Browser check (`vite preview`, the stage chunk answering 404): exactly one reload, then the "couldn't load" note, no loop; after a good load the flag is cleared (`vi-320-05-new-version` shows the screen after the guarded reload).
- Loading title: a plain "Salon Besties" in the page's HTML, behind the canvas, so it shows until PixiJS draws (`vi-320-04-loading-title`, the stage held back 2.5 s).
- Not done (optional item 2): keeping the previous cache until no tab uses it. The reload covers the risk; ask if wanted.

Tests: `src/tests/stale-build.test.ts` (6): a rejected import → note + one reload; no loop within 60 s; the regression above; the flag clears after a good load; offline and no session storage never reload; which errors count as a missing chunk.
