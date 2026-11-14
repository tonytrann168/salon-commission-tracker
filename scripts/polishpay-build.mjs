// PolishPay: copy ONLY the public pages into polishpay-dist/, so the PolishPay Vercel project serves nothing else from
// this repository (not src/, docs/, design/, production/ or assets/). NOT WIRED UP YET: it changes nothing until the
// owner sets, in the PolishPay Vercel project, Build Command = `node scripts/polishpay-build.mjs` and Output
// Directory = `polishpay-dist`. Then the root .vercelignore no longer needs to list src/, which today breaks the game
// project's git builds (Vercel applies the repository-root .vercelignore to every project in the repo).
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const PAGES = ['index.html', 'app.html', 'legal.html'];
const OUT = 'polishpay-dist';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const page of PAGES) {
  if (!existsSync(page)) throw new Error(`polishpay-build: ${page} is missing`);
  copyFileSync(page, `${OUT}/${page}`);
}
console.log(`polishpay-build: ${PAGES.length} pages → ${OUT}/`);
