// npm run build:preview — the private hosted preview, as a Vercel Build Output API folder (.vercel/output):
//   static/              the game (built with VITE_INVITE_GATE=1, so it asks for an invite code first)
//   functions/api.func/  ONE Node function (server/preview-function.ts, bundled) for every /api/* request
//   config.json          routes: noindex header everywhere, /api/* -> the function, then static files
// Vercel project: Root Directory = src, Build Command = npm run build:preview (see the owner setup README).
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, '.vercel', 'output');
await rm(out, { recursive: true, force: true });

// 1. The game, with the invite screen switched on.
process.env.VITE_INVITE_GATE = '1';
await build({ root, logLevel: 'warn', build: { outDir: join(root, 'dist'), emptyOutDir: true } });
await mkdir(join(out, 'static'), { recursive: true });
await cp(join(root, 'dist'), join(out, 'static'), { recursive: true });

// 2. The one function, bundled with everything it imports (no node_modules needed at run time).
const funcDir = join(out, 'functions', 'api.func');
await build({
  root,
  configFile: false,
  logLevel: 'warn',
  publicDir: false,
  ssr: { noExternal: true },
  build: {
    ssr: join(root, 'server', 'preview-function.ts'),
    outDir: funcDir,
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: { output: { format: 'es', entryFileNames: 'index.mjs' } },
  },
});
await writeFile(join(funcDir, 'package.json'), JSON.stringify({ type: 'module' }));
await writeFile(
  join(funcDir, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 60 }, null, 2),
);

// 3. Routes: keep it out of search engines; send /api/* to the function; everything else is a static file.
await writeFile(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: { 'X-Robots-Tag': 'noindex, nofollow' }, continue: true },
        { src: '/api/([a-z-]+)', dest: '/api?route=$1' },
        { handle: 'filesystem' },
      ],
    },
    null,
    2,
  ),
);
console.log('build:preview — .vercel/output ready (static + functions/api.func + config.json)');
