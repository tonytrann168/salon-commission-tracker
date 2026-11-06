# Salon Besties — game code

Design: `../design/game-brief.md` (one-page brief; the whole design at `minimal` rigor).
Config: `../project.yaml`.

## Technology Stack
- **Engine**: none — web stack. Vite 8.3 + TypeScript 7.0, PixiJS 8.22 for canvas (salon scene, nail art station), DOM/CSS for chat and menus.
- **Tests**: Vitest 5.1 (`npm test`), files in `tests/`.
- **Platform**: phone-first installable web app (PWA, portrait). iOS/Android via Capacitor later.
- **AI**: Claude runs clients, bestie and scoring; a separate voice service for speech. All AI calls go through a server function — never put API keys in client code.
- **Later**: Rive for animated client/bestie faces.

## Commands (run in this folder)
- `npm run dev` — dev server · `npm run build` — type-check + production build · `npm test` — tests

## Notes
- This folder is separate from PolishPay (repo root, deployed by Vercel). Don't import across the two; `.vercelignore` keeps `src/` out of PolishPay's deploy.
- Visible changes are done only after the game has been launched and a screenshot saved in `../production/qa/evidence/`.
