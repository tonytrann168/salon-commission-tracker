import { parseReport } from '../../game/error-report';
import { webhookUrl } from './feedback';

/**
 * Story 032: a client error report. Validate and scrub (game/error-report.ts), log one line, and forward to the
 * FEEDBACK_WEBHOOK_URL (Discord) when set. A webhook failure never fails the request. No chat text or email can be in
 * a report: the shape allows only a message, 3 stack lines, the version and the screen path.
 */
const WEBHOOK_TIMEOUT_MS = 5000;

export async function handleClientError(
  body: unknown,
  meta: { tester?: string | null; now?: () => Date } = {},
  log: (line: string) => void = (line) => console.log(line),
  sink: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; warn?: (line: string) => void } = {},
): Promise<{ status: number; body: unknown }> {
  const parsed = parseReport(body);
  if (!parsed.ok) return { status: 400, body: { error: { code: 'invalid_request', message: parsed.message } } };
  const entry = { v: 1, at: (meta.now?.() ?? new Date()).toISOString(), tester: meta.tester ?? null, ...parsed.value };
  log(`CLIENT_ERROR ${JSON.stringify(entry)}`);
  const url = sink.env ? webhookUrl(sink.env) : null;
  if (url && sink.fetchImpl) {
    const text = [`⚠️ Client error · v${entry.version} · ${entry.path}${entry.tester ? ` · tester ${entry.tester}` : ''}`, `> ${entry.message}`, ...entry.stack.map((l) => `\`${l}\``)].join('\n').slice(0, 1900);
    try {
      const response = await sink.fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS) });
      if (!response.ok) (sink.warn ?? console.warn)(`client-error: webhook answered ${response.status}; kept in the log only`);
    } catch {
      (sink.warn ?? console.warn)('client-error: webhook unreachable; kept in the log only');
    }
  }
  return { status: 200, body: { ok: true } };
}
