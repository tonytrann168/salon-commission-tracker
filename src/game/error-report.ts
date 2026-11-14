/**
 * Story 032: privacy-safe client error reports. Only the message (scrubbed, ≤300 characters), the top 3 stack lines
 * from the game's own files (no query strings), the app version and the screen path. Never chat text, email or
 * storage. Shared by the browser (reporter) and the server (validation).
 */

export const ERROR_REPORT_LIMITS = { message: 300, stackLines: 3, stackLine: 200, perSession: 3 } as const;

export interface ErrorReport {
  message: string;
  stack: string[];
  version: string;
  path: string;
}

/** Emails, long numbers (phones, codes) and our 6-digit codes become placeholders. */
export function scrub(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, '<email>')
    .replace(/\b(SB\d+-[0-9a-f]{12}-)[A-Za-z0-9_-]+/g, '$1<code>')
    .replace(/(?<![\w-])\d{6,}(?!\w)/g, '<number>')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim();
}

/** Stack lines from this origin only, file paths without query strings or hashes. */
export function stackTop(stack: string | undefined, origin: string): string[] {
  if (!stack) return [];
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(origin))
    .map((line) => line.split(origin).join('').replace(/\?[^:)\s]*/g, '').replace(/#[^:)\s]*/g, ''))
    .map((line) => scrub(line).slice(0, ERROR_REPORT_LIMITS.stackLine))
    .slice(0, ERROR_REPORT_LIMITS.stackLines);
}

export function buildReport(error: unknown, version: string, location: { origin: string; pathname: string }): ErrorReport {
  const e = error instanceof Error ? error : null;
  const raw = e ? `${e.name}: ${e.message}` : typeof error === 'string' ? error : 'Unknown error';
  return { message: scrub(raw).slice(0, ERROR_REPORT_LIMITS.message), stack: stackTop(e?.stack, location.origin), version: version.slice(0, 40), path: location.pathname.slice(0, 80) };
}

/** Strict server-side check: anything else is dropped. */
export function parseReport(body: unknown): { ok: true; value: ErrorReport } | { ok: false; message: string } {
  const b = body as Partial<ErrorReport> | null;
  if (!b || typeof b !== 'object') return { ok: false, message: 'body must be an object.' };
  if (typeof b.message !== 'string' || !b.message.trim() || b.message.length > ERROR_REPORT_LIMITS.message) return { ok: false, message: 'message is required (≤300 characters).' };
  if (!Array.isArray(b.stack) || b.stack.length > ERROR_REPORT_LIMITS.stackLines || !b.stack.every((l) => typeof l === 'string' && l.length <= ERROR_REPORT_LIMITS.stackLine)) return { ok: false, message: 'stack must be up to 3 short lines.' };
  if (typeof b.version !== 'string' || b.version.length > 40 || typeof b.path !== 'string' || b.path.length > 80 || !b.path.startsWith('/')) return { ok: false, message: 'version and path are required.' };
  // Scrubbed again on the server: the browser is not trusted to have done it.
  return { ok: true, value: { message: scrub(b.message), stack: b.stack.map(scrub), version: scrub(b.version), path: scrub(b.path) } };
}

/** At most `perSession` reports a page session, never the same message twice. */
export function createReportLimiter(perSession: number = ERROR_REPORT_LIMITS.perSession): (report: ErrorReport) => boolean {
  const sent = new Set<string>();
  return (report) => {
    if (sent.size >= perSession || sent.has(report.message)) return false;
    sent.add(report.message);
    return true;
  };
}
