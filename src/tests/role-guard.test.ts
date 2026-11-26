import { describe, expect, it } from 'vitest';
import { handleClientTurn } from '../server/handlers/client-turn';
import { NOT_STUCK, onClientLine } from '../game/stuck';

/**
 * Owner playtest (25 Nov, screenshot): the stylist said "Thank you sister" and the client answered "You are welcome,
 * dear. What color do you want today? Coral is my favorite." - the stylist's own question, as if the roles had
 * swapped; the game then showed it as her question waiting for an answer. The client is always the customer.
 */
const SWAPPED = 'You are welcome, dear. What color do you want today? Coral is my favorite.';
const request = {
  transcript: [
    { role: 'client', content: "Hello dear! I'd like a manicure. No hurry, I'm free all afternoon." },
    { role: 'player', content: 'Thank you sister' },
  ],
  phase: 'consultation',
  mood: 67,
  level: 'beginner',
  clientId: 'grace',
};
const turn = (reply: string) => new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'client_turn', input: { reply, moodDelta: 1, phase: 'consultation', unclearEnglish: false, rude: false } }] }), { status: 200 });

function fakeFetch(replies: string[]): { fetchImpl: typeof fetch; calls: RequestInit[] } {
  const calls: RequestInit[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    return turn(replies[Math.min(calls.length - 1, replies.length - 1)] as string);
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe('the client never speaks as the stylist (owner playtest, 25 Nov)', () => {
  it('a role-swapped reply is asked again, with the correction; the client answers as the client', async () => {
    const { fetchImpl, calls } = fakeFetch([SWAPPED, "You're welcome, dear. I'd like coral today, short and round, please."]);
    const result = await handleClientTurn(request, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl);
    expect(result.status).toBe(200);
    expect((result.body as { reply: string }).reply).toBe("You're welcome, dear. I'd like coral today, short and round, please.");
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(JSON.parse(String(calls[1]!.body)).system)).toContain('You are the CLIENT being served');
  });

  it('if she swaps again, the stylist-style sentence is dropped (never shown)', async () => {
    const { fetchImpl, calls } = fakeFetch([SWAPPED, SWAPPED]);
    const result = await handleClientTurn(request, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl);
    const reply = (result.body as { reply: string }).reply;
    expect(calls).toHaveLength(2);
    expect(reply).not.toMatch(/what colou?r do you want/i);
    expect(reply).toContain('Coral is my favorite.');
  });

  it('a normal reply goes straight through (one call); asking the stylist\'s advice is fine', async () => {
    for (const reply of ["I'd like coral, please.", 'What colour would you pick for me?', 'How much is a gel manicure?']) {
      const { fetchImpl, calls } = fakeFetch([reply]);
      const result = await handleClientTurn(request, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl);
      expect((result.body as { reply: string }).reply).toBe(reply);
      expect(calls).toHaveLength(1);
    }
  });

  it('the system prompt says who is who', async () => {
    const { fetchImpl, calls } = fakeFetch(["I'd like coral, please."]);
    await handleClientTurn(request, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl);
    const system = JSON.stringify(JSON.parse(String(calls[0]!.body)).system);
    expect(system).toContain('ROLES');
    expect(system).toContain('Never ask the stylist what colour');
  });

  it('the game never shows a stylist-style line as her question waiting for an answer', () => {
    expect(onClientLine(NOT_STUCK, SWAPPED).state.question).toBeNull();
    expect(onClientLine(NOT_STUCK, 'Short or medium nails, please?').state.question).toBe('Short or medium nails, please?');
  });
});
