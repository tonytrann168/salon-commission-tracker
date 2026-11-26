import roleJson from './config/role-guard.json';

/**
 * Owner playtest (25 Nov): the AI client once asked the stylist "What color do you want today?" - the stylist's own
 * question, as if the roles had swapped. The client is always the customer. Shared by the server (check her reply,
 * ask again, drop the sentence) and the game (never show such a line as her question waiting for an answer). Pure;
 * config: config/role-guard.json.
 */
export interface RoleGuardConfig {
  stylistLines: RegExp[];
  correctionNote: string;
  fallbackLine: string;
}

export function parseRoleGuardConfig(raw: unknown): RoleGuardConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fail = (what: string): never => {
    throw new Error(`role-guard.json: ${what}`);
  };
  const text = (key: string): string => (typeof c[key] === 'string' && (c[key] as string).trim() ? (c[key] as string) : fail(`"${key}" must be text`));
  const stylistLines = Array.isArray(c.stylistLines) && c.stylistLines.length > 0
    ? (c.stylistLines as unknown[]).map((p, i) => {
        try {
          return new RegExp(typeof p === 'string' ? p : fail(`"stylistLines[${i}]" must be text`), 'i');
        } catch {
          return fail(`"stylistLines[${i}]" is not a valid pattern`);
        }
      })
    : fail('"stylistLines" needs patterns');
  return { stylistLines, correctionNote: text('correctionNote'), fallbackLine: text('fallbackLine') };
}

export const ROLE_GUARD_CONFIG: RoleGuardConfig = parseRoleGuardConfig(roleJson);

/** A line (or sentence) the stylist would say, not the client: a role swap. */
export const speaksAsStylist = (line: string, config: RoleGuardConfig = ROLE_GUARD_CONFIG): boolean => config.stylistLines.some((re) => re.test(line));

/** The client's reply without its stylist-style sentences (empty when nothing is left). */
export function dropStylistSentences(reply: string, config: RoleGuardConfig = ROLE_GUARD_CONFIG): string {
  const sentences = reply.match(/[^.!?]+[.!?]*/g) ?? [reply];
  return sentences
    .filter((sentence) => !speaksAsStylist(sentence, config))
    .join('')
    .trim();
}
