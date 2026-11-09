// npm run smoke:api — calls each server function once against the real Claude API and prints pass/fail.
// Reads ANTHROPIC_API_KEY from the environment or src/.env.local (never printed). Skips cleanly when there is no key.
// Each run spends a little API credit (four short calls).
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, loadEnv } from 'vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const env = { ...loadEnv('development', root, ''), ...process.env };
if (!env.ANTHROPIC_API_KEY) {
  console.log('smoke:api SKIPPED — no ANTHROPIC_API_KEY (set it in src/.env.local or the environment).');
  process.exit(0);
}

const vite = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const { handleClientTurn } = await vite.ssrLoadModule('/api/client-turn.ts');
const { handleTranslate } = await vite.ssrLoadModule('/api/translate.ts');
const { handleGradeAppointment } = await vite.ssrLoadModule('/api/grade-appointment.ts');
const { DEFAULT_CLIENT } = await vite.ssrLoadModule('/game/clients/default-client.ts');

const transcript = [
  { role: 'client', content: DEFAULT_CLIENT.openingLine },
  { role: 'player', content: 'Hello! Welcome. Sit here please. What color you like today?' },
];
const checks = [
  ['client-turn (beginner)', () => handleClientTurn({ transcript, phase: 'consultation', mood: 45, level: 'beginner' }, env, fetch),
    (b) => typeof b.reply === 'string' && typeof b.moodDelta === 'number' && typeof b.unclearEnglish === 'boolean' && typeof b.rude === 'boolean',
    (b) => `"${b.reply}" mood ${b.moodDelta >= 0 ? '+' : ''}${b.moodDelta} unclear=${b.unclearEnglish} rude=${b.rude}`],
  ['translate en-to-vi', () => handleTranslate({ text: DEFAULT_CLIENT.openingLine, direction: 'en-to-vi' }, env, fetch),
    (b) => typeof b.translation === 'string', (b) => b.translation],
  ['translate vi-to-en (beginner)', () => handleTranslate({ text: 'Chị muốn sơn màu gì hôm nay?', direction: 'vi-to-en', level: 'beginner' }, env, fetch),
    (b) => typeof b.translation === 'string', (b) => b.translation],
  ['grade-appointment', () => handleGradeAppointment({
      transcript: [...transcript, { role: 'client', content: 'Pink, please.' }, { role: 'player', content: 'Okay! Thank you. You want come back in 3 weeks?' }, { role: 'client', content: 'Yes, book me in.' }],
      outcome: 'completed', finalMood: 70, level: 'some' }, env, fetch),
    (b) => b.skills && b.english && typeof b.review === 'string',
    (b) => `skills ${JSON.stringify(b.skills)} english ${JSON.stringify(b.english)} review "${b.review}"`],
];

let failed = 0;
for (const [name, run, valid, describe] of checks) {
  const started = Date.now();
  let result;
  try {
    result = await run();
  } catch (error) {
    result = { status: 0, body: { error: { code: 'exception', message: String(error?.message ?? error) } } };
  }
  const ms = Date.now() - started;
  const ok = result.status === 200 && valid(result.body);
  if (!ok) failed++;
  const detail = ok ? describe(result.body) : JSON.stringify(result.body?.error ?? result.body);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${ms} ms)  ${detail}`);
}
await vite.close();
console.log(failed === 0 ? `smoke:api — all ${checks.length} passed` : `smoke:api — ${failed} of ${checks.length} FAILED`);
process.exit(failed === 0 ? 0 : 1);
