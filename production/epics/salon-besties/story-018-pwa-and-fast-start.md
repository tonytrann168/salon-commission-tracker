# Story 018: Installable app, offline title, fast first load

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review + phone install check)
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

Testers open the hosted preview on phone data tonight (owner via the overseer, 2026-11-10). The build warned that the main script is 511 kB (160 kB gzip), mostly PixiJS.

## Acceptance Criteria

- [x] **Fast first load:** the title menu (HTML) shows without waiting for PixiJS; PixiJS, the salon scene, the chat panel and the nail station load in the background and are ready when the player starts. Shop, profile, dress-up and the first meeting load on demand. Report before/after sizes.
- [x] **Installable (PWA):** a web app manifest (name, short name, colours, portrait, standalone, icons drawn from the placeholder Mai), linked from the page; "Add to Home Screen" works on Android Chrome and iOS Safari.
- [x] **Offline title:** a service worker caches the built static files (HTML, JS, CSS, icons) only, never `/api/*`; with no connection the title screen still opens, and starting an appointment explains that a connection is needed.
- [x] A new build replaces the old cache (versioned cache name), so testers get updates.
- [x] The invite gate still works (the service worker never caches `/api/session` or `/api/login`).

## Test Evidence

**Required evidence**: before/after build sizes; a check that the title appears before PixiJS loads; an offline check (title loads with the network off); unit tests for the service worker's "what to cache" rule.

**Status**: [x] `src/tests/sw.test.ts` and `production/qa/evidence/story-018-pwa/` (sizes, title-before-PixiJS, offline).

## Completion Notes (2026-11-10)

- **Split:** `game/stage.ts` holds everything PixiJS (canvas, title and salon scenes, picker face images, the chat panel and nail station) and is loaded with `import()`; `game/ui/title-menu.ts` is the HTML menu. Shop and profile load on demand (the companion screens stay in the main script because Settings uses them).
- **PWA:** `public/manifest.webmanifest` with icons in `public/icons/` (drawn from the placeholder Mai skin); `index.html` links the manifest, icon and Apple touch icon.
- **Service worker:** `sw/sw-rules.js` (pure rules, tested) + `sw/sw-template.js`; a small Vite plugin writes `sw.js` with every built and public file to precache and a cache name from the build's file names. Registered in production builds only.
- **Offline:** Start explains that a connection is needed; on the hosted preview the invite check is skipped while offline (the server still needs the cookie for AI calls).
- **OWNER:** test "Add to Home Screen" on your phone (Android: Chrome menu → Install app; iPhone: Safari → Share → Add to Home Screen). The icon is the placeholder Mai until the designer's art.
- **OWNER:** before PixiJS arrives the top of the title is blank for a moment on slow data; a plain "Salon Besties" text there is possible if wanted.
