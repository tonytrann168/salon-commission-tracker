import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strategyFor } from '../sw/sw-rules.js';

/** Story 018: what the service worker caches. Static built files only; never /api; never another site. */

const ORIGIN = 'https://salon-besties.vercel.app';

describe('service worker rules', () => {
  it('never touches /api (AI calls, invite sign-in, session, feedback) or non-GET requests', () => {
    for (const path of ['/api/client-turn', '/api/session', '/api/login', '/api/feedback', '/api', '/api/?route=bestie']) {
      expect(strategyFor(`${ORIGIN}${path}`, 'GET', ORIGIN), path).toBe('skip');
    }
    expect(strategyFor(`${ORIGIN}/assets/index-abc.js`, 'POST', ORIGIN)).toBe('skip');
  });

  it('never caches other sites or the worker itself', () => {
    expect(strategyFor('https://fonts.example.com/x.css', 'GET', ORIGIN)).toBe('skip');
    expect(strategyFor(`${ORIGIN}/sw.js`, 'GET', ORIGIN)).toBe('skip');
    expect(strategyFor('not a url', 'GET', ORIGIN)).toBe('skip');
  });

  it('serves the page network-first and built files, icons and the manifest from the cache', () => {
    expect(strategyFor(`${ORIGIN}/`, 'GET', ORIGIN)).toBe('network-first');
    expect(strategyFor(`${ORIGIN}/index.html`, 'GET', ORIGIN)).toBe('network-first');
    expect(strategyFor(`${ORIGIN}/assets/stage-123.js`, 'GET', ORIGIN)).toBe('cache-first');
    expect(strategyFor(`${ORIGIN}/icons/icon-192.png`, 'GET', ORIGIN)).toBe('cache-first');
    expect(strategyFor(`${ORIGIN}/manifest.webmanifest`, 'GET', ORIGIN)).toBe('cache-first');
  });

  it('the worker template has the placeholders the build fills, and the manifest lists the icons', () => {
    const template = readFileSync(join(__dirname, '../sw/sw-template.js'), 'utf8');
    for (const slot of ['__VERSION__', '__PRECACHE__', '__RULES__']) expect(template).toContain(slot);
    expect(template).toMatch(/key\.startsWith\('salon-besties-'\) && key !== CACHE/);
    const manifest = JSON.parse(readFileSync(join(__dirname, '../public/manifest.webmanifest'), 'utf8')) as { icons: { sizes: string; purpose: string }[]; display: string };
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((i) => `${i.sizes}/${i.purpose}`)).toEqual(['192x192/any', '512x512/any', '512x512/maskable']);
  });
});
