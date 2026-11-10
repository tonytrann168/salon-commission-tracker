// npm run smoke:api — calls each server function once against the real Claude API and prints pass/fail.
// Reads ANTHROPIC_API_KEY from the environment or src/.env.local (never printed). Skips cleanly when there is no key.
// Each run spends a little API credit (eleven short calls).
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
const { handleClientTurn } = await vite.ssrLoadModule('/server/handlers/client-turn.ts');
const { handleTranslate } = await vite.ssrLoadModule('/server/handlers/translate.ts');
const { handleGradeAppointment } = await vite.ssrLoadModule('/server/handlers/grade-appointment.ts');
const { DEFAULT_CLIENT } = await vite.ssrLoadModule('/game/clients/default-client.ts');
const { handleBestie } = await vite.ssrLoadModule('/server/handlers/bestie.ts');
const { handleCorrections } = await vite.ssrLoadModule('/server/handlers/corrections.ts');

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
  ['bestie hint (beginner, en)', () => handleBestie({ kind: 'hint', level: 'beginner', language: 'en', memory: '', phase: 'consultation', mood: 50, transcript }, env, fetch),
    (b) => typeof b.hint === 'string', (b) => b.hint],
  ['bestie debrief (some, vi, with question)', () => handleBestie({
      kind: 'debrief', level: 'some', language: 'vi', outcome: 'completed', stars: 4, tip: 11, englishScore: 72,
      skills: { greeting: 90, consultation: 80, upsell: 40, rebooking: 85, problemHandling: 70 },
      english: { clarity: 70, politeness: 90, grammarVocabulary: 60 }, review: 'Friendly and quick. Nails look great!',
      transcript, memory: 'Last time: forgot to offer extras.', sessionNumber: 3, askQuestion: true }, env, fetch),
    (b) => typeof b.praise === 'string' && typeof b.tryNext === 'string' && typeof b.question === 'string' && typeof b.memory === 'string',
    (b) => `praise "${b.praise}" tryNext "${b.tryNext}" question "${b.question}" memory "${b.memory}"`],
  ['bestie answer (some, en)', () => handleBestie({ kind: 'answer', level: 'some', language: 'en', memory: '',
      question: 'What would you do if a client says her polish chipped after one day?', answer: 'I say sorry and fix it free.' }, env, fetch),
    (b) => typeof b.reply === 'string' && typeof b.memory === 'string', (b) => `"${b.reply}" memory "${b.memory}"`],
  ['corrections line check (beginner, vi)', () => handleCorrections({ kind: 'line', level: 'beginner', language: 'vi', phase: 'consultation',
      line: 'What color you like today?', clientLine: DEFAULT_CLIENT.openingLine }, env, fetch),
    (b) => typeof b.needsCorrection === 'boolean' && (!b.needsCorrection || (b.better && typeof b.reason === 'string')),
    (b) => b.needsCorrection ? `praise "${b.praise}" better "${b.better.en}" / "${b.better.vi}" (${b.better.topic}) reason "${b.reason}"` : 'no correction needed'],
  ['corrections review + recap (some, en)', () => handleCorrections({ kind: 'review', level: 'some', language: 'en', outcome: 'completed',
      transcript: [...transcript, { role: 'client', content: 'Pink, please.' }, { role: 'player', content: 'Okay. You want come back in 3 week?' }, { role: 'client', content: 'Sure, book me in.' }] }, env, fetch),
    (b) => Array.isArray(b.lines) && typeof b.recap === 'string' && Array.isArray(b.tryLines) && b.tryLines.length > 0,
    (b) => `${b.lines.length} lines to improve ${JSON.stringify(b.lines.map((l) => `${l.said} -> ${l.better.en}`))} recap "${b.recap}" try ${JSON.stringify(b.tryLines.map((p) => p.en))} usedWell ${JSON.stringify(b.usedWell.map((p) => p.en))}`],
  // Story 005: the review mentions the finished nails (overseer's request). Harsh words fail the low-match case.
  ['grade-appointment with nails, match 85', () => handleGradeAppointment({
      transcript: [...transcript, { role: 'client', content: 'Pale pink, short and square, please.' }, { role: 'player', content: 'Okay! All done. Do you like them?' }, { role: 'client', content: 'Yes, lovely.' }],
      outcome: 'completed', finalMood: 75, level: 'some', nails: { description: 'square shape, pale pink, no gems or stickers; 96% painted', match: 85 } }, env, fetch),
    (b) => typeof b.review === 'string' && /nail|polish|manicure|pink|colou?r|shape/i.test(b.review),
    (b) => `review "${b.review}"`],
  ['grade-appointment with nails, match 30 (gentle)', () => handleGradeAppointment({
      transcript: [...transcript, { role: 'client', content: 'Pale pink, short and square, please.' }, { role: 'player', content: 'Okay! All done.' }, { role: 'client', content: 'Hmm, okay.' }],
      outcome: 'completed', finalMood: 50, level: 'some', nails: { description: 'stiletto shape, navy, 3 gems; 60% painted', match: 30 } }, env, fetch),
    (b) => typeof b.review === 'string' && /nail|polish|manicure|colou?r|shape|stiletto|navy|gem/i.test(b.review) && !/terrible|awful|horrible|worst|disgusting|hate|ugly|stupid|useless/i.test(b.review),
    (b) => `review "${b.review}"`],
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
