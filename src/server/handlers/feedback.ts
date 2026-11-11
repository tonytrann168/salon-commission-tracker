import { FEEDBACK_MAX_TEXT_CLIENT } from '../../game/ui/feedback-limits';
import { DIFFICULTIES, ENGLISH_LEVELS } from '../../game/types';

/**
 * Tester feedback (story 016): a 1-5 rating, optional text, optional game details, and the chat only when the tester
 * ticked "Include my conversation". Validated, then written as ONE structured log line (`FEEDBACK {...}`) that the
 * owner reads in Vercel → Logs. No database, no AI call. Never logs the invite code itself, only its id.
 */

export const FEEDBACK_MAX_TEXT = FEEDBACK_MAX_TEXT_CLIENT;
const MAX_CHAT_MESSAGES = 60;
const MAX_CHAT_CHARS = 1000;
const ID = /^[a-z0-9-]{1,40}$/;

export interface FeedbackEntry {
  v: 1;
  at: string;
  tester: string | null;
  rating: number;
  text: string;
  details: { clientId?: string; level?: string; language?: string; stars?: number; appVersion?: string; difficulty?: string } | null;
  chat: { role: 'player' | 'client'; content: string }[] | null;
}

export type FeedbackParse = { ok: true; value: Omit<FeedbackEntry, 'v' | 'at' | 'tester'> } | { ok: false; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Strictly validate the browser's feedback. Unknown fields are dropped; bad optional details are dropped one by one. */
export function parseFeedback(body: unknown): FeedbackParse {
  if (!isRecord(body)) return { ok: false, message: 'Body must be a JSON object.' };
  const rating = body.rating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: 'rating must be 1-5.' };
  const rawText = body.text ?? '';
  if (typeof rawText !== 'string' || rawText.length > FEEDBACK_MAX_TEXT) return { ok: false, message: `text must be up to ${FEEDBACK_MAX_TEXT} characters.` };
  // Control characters out (one line per entry in the logs); spacing tidied.
  const text = rawText.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  let details: FeedbackEntry['details'] = null;
  if (isRecord(body.details)) {
    const d = body.details;
    details = {
      ...(typeof d.clientId === 'string' && ID.test(d.clientId) ? { clientId: d.clientId } : {}),
      ...(ENGLISH_LEVELS.some((l) => l === d.level) ? { level: d.level as string } : {}),
      ...(d.language === 'en' || d.language === 'vi' ? { language: d.language } : {}),
      ...(typeof d.stars === 'number' && Number.isInteger(d.stars) && d.stars >= 1 && d.stars <= 5 ? { stars: d.stars } : {}),
      ...(typeof d.appVersion === 'string' && /^[0-9a-z.+-]{1,20}$/i.test(d.appVersion) ? { appVersion: d.appVersion } : {}),
      ...(DIFFICULTIES.some((x) => x === d.difficulty) ? { difficulty: d.difficulty as string } : {}),
    };
  }
  let chat: FeedbackEntry['chat'] = null;
  if (body.includeChat === true && Array.isArray(body.chat)) {
    chat = body.chat
      .slice(-MAX_CHAT_MESSAGES)
      .filter((m): m is { role: 'player' | 'client'; content: string } => isRecord(m) && (m.role === 'player' || m.role === 'client') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, MAX_CHAT_CHARS) }));
  }
  return { ok: true, value: { rating, text, details, chat } };
}

const DISCORD_MAX = 2000;
const WEBHOOK_TIMEOUT_MS = 5000;

/** One short, readable Discord message (overseer, 2026-11-10: Vercel's Hobby logs last about an hour). */
export function discordMessage(entry: FeedbackEntry): string {
  const stars = '⭐'.repeat(entry.rating) + '☆'.repeat(5 - entry.rating);
  const d = entry.details;
  const game = d
    ? [d.clientId && `client ${d.clientId}${d.difficulty ? ` (${d.difficulty})` : ''}`, d.level && `level ${d.level}`, d.language, d.stars && `${d.stars}★`, d.appVersion && `v${d.appVersion}`].filter(Boolean).join(' · ')
    : '';
  const lines = [`${stars} (${entry.rating}/5)${entry.tester ? ` · tester ${entry.tester}` : ''}`, entry.text ? `> ${entry.text}` : '> (no note)', ...(game ? [`Game: ${game}`] : [])];
  if (entry.chat && entry.chat.length > 0) lines.push('Chat:', ...entry.chat.map((m) => `${m.role === 'client' ? 'Client' : 'Tech'}: ${m.content}`));
  const text = lines.join('\n');
  return text.length <= DISCORD_MAX ? text : `${text.slice(0, DISCORD_MAX - 1)}…`;
}

/** Only an https webhook URL is used. */
export const webhookUrl = (env: Record<string, string | undefined>): string | null => {
  const raw = env.FEEDBACK_WEBHOOK_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
};

/**
 * Handle one feedback post: validate, log one line (console.log in production: Vercel captures it), and, when
 * FEEDBACK_WEBHOOK_URL is set, also post it to that (Discord-format) webhook. A webhook failure never fails the
 * player's request: it is logged as a warning (without the URL), and the log line remains.
 */
export async function handleFeedback(
  body: unknown,
  meta: { tester?: string | null; now?: () => Date } = {},
  log: (line: string) => void = (line) => console.log(line),
  sink: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; warn?: (line: string) => void } = {},
): Promise<{ status: number; body: unknown }> {
  const parsed = parseFeedback(body);
  if (!parsed.ok) return { status: 400, body: { error: { code: 'invalid_request', message: parsed.message } } };
  const entry: FeedbackEntry = { v: 1, at: (meta.now?.() ?? new Date()).toISOString(), tester: meta.tester ?? null, ...parsed.value };
  log(`FEEDBACK ${JSON.stringify(entry)}`);
  const url = sink.env ? webhookUrl(sink.env) : null;
  const warn = sink.warn ?? ((line: string) => console.warn(line));
  if (sink.env?.FEEDBACK_WEBHOOK_URL && !url) warn('feedback: FEEDBACK_WEBHOOK_URL is not an https URL; skipped');
  if (url && sink.fetchImpl) {
    try {
      const response = await sink.fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // allowed_mentions: a tester's note can never ping anyone.
        body: JSON.stringify({ content: discordMessage(entry), allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!response.ok) warn(`feedback: webhook answered ${response.status}; kept in the log only`);
    } catch {
      warn('feedback: webhook unreachable; kept in the log only');
    }
  }
  return { status: 200, body: { ok: true } };
}
