import { describe, expect, it } from 'vitest';
import fixJson from '../game/config/fix-requests.json';
import { FIX_CONFIG, FIX_KINDS, applyFixesToSkills, canFix, fixKindOf, fixKindsOf, fixOutcomes, offersFix, meetsRequest, openLine, openRequest, parseFixConfig, thanksLine, updateRequests } from '../game/fix-requests';
import { NAIL_COUNT, addSpill, emptyDesign, paint, paintableCells, removeAll, removeNail, decorate } from '../game/nail-art/design';
import type { NailDesign } from '../game/nail-art/design';
import { SERVICE_TALK } from '../game/service-talk';
import { handleGradeAppointment } from '../server/handlers/grade-appointment';

/** Story 048: fix requests during the service (open/fixed, the Remover, the results). */

const painted = (base: string): NailDesign => {
  let design: NailDesign = { ...emptyDesign('round'), base };
  for (let nail = 0; nail < NAIL_COUNT; nail++) design = paint(design, nail, paintableCells('round'));
  return design;
};
const skills = { greeting: 70, consultation: 70, upsell: 70, rebooking: 70, problemHandling: 60 };

describe('fix requests config', () => {
  it('parses the shipped file and every ask is a line she really says', () => {
    expect(FIX_CONFIG.fixedMood).toBeGreaterThan(0);
    const said = [...Object.values(SERVICE_TALK.lines).flat(), SERVICE_TALK.redo];
    for (const kind of FIX_KINDS) for (const line of FIX_CONFIG.asks[kind]) expect(said).toContain(line);
    expect(fixKindOf(SERVICE_TALK.redo)).toBe('colour');
    expect(fixKindOf('Can you fix that edge? It doesn\'t look even.')).toBe('edge');
    expect(fixKindOf('Ooh, that colour looks so pretty!')).toBeNull();
  });

  it('catches the same ask in her own words, and not ordinary lines', () => {
    expect(fixKindOf('Oh no, can you clean that edge a bit?')).toBe('edge');
    expect(fixKindOf('There is polish on my skin here.')).toBe('edge');
    expect(fixKindOf('Actually, could we try another colour?')).toBe('colour');
    expect(fixKindOf('Can you change the color, please?')).toBe('colour');
    for (const line of ['Is this colour going to last a few weeks?', 'Hmm, is that the same shade I picked?', 'Will it be dry before I leave?', 'They look great! How much do I owe you?']) expect(fixKindOf(line)).toBeNull();
    expect(() => parseFixConfig({ ...fixJson, patterns: { ...fixJson.patterns, edge: ['('] } })).toThrow('bad pattern');
    // Story 051: length asks, and lines that only sound like them.
    expect(fixKindOf('Can you make them a little shorter, please?')).toBe('length');
    expect(fixKindOf('Hmm, they are too long for work.')).toBe('length');
    expect(fixKindOf('Could you do them a bit longer?')).toBe('length');
    for (const line of ['How much longer is this going to take?', 'Will this colour last longer?', 'How long have you been doing nails?']) expect(fixKindOf(line)).toBeNull();
  });

  it('rejects a bad file with a clear message', () => {
    expect(() => parseFixConfig({ ...fixJson, openMood: 5 })).toThrow('fix-requests.json: "openMood"');
    expect(() => parseFixConfig({ ...fixJson, skills: { fixedFloor: 30, openCap: 60 } })).toThrow('openCap');
    expect(() => parseFixConfig({ ...fixJson, lines: { ...fixJson.lines, edge: { thanks: [], open: ['x'] } } })).toThrow('lines.edge.thanks');
  });

  it('picks her thanks and open lines from data', () => {
    expect(FIX_CONFIG.lines.edge.thanks).toContain(thanksLine('edge', () => 0));
    expect(FIX_CONFIG.lines.colour.open).toContain(openLine('colour', () => 0.99));
  });
});

describe('the Remover', () => {
  it('wipes one nail back to bare, polish, spill and decorations', () => {
    let design = addSpill(painted('red'), 1, [0, 1, 2]);
    design = decorate(design, { nail: 1, x: 0.5, y: 0.5, kind: 'gem' });
    design = decorate(design, { nail: 2, x: 0.5, y: 0.5, kind: 'gem' });
    const next = removeNail(design, 1);
    expect(next.painted[1]).toEqual([]);
    expect(next.spill[1]).toEqual([]);
    expect(next.decorations).toEqual([{ nail: 2, x: 0.5, y: 0.5, kind: 'gem' }]);
    expect(next.painted[0]).toBe(design.painted[0]);
    expect(removeNail(emptyDesign(), 0)).toEqual(emptyDesign());
  });

  it('Remove all wipes every nail and keeps the shape and colour', () => {
    const next = removeAll({ ...painted('red'), gradient: 'pink' });
    expect(next.painted.every((cells) => cells.length === 0)).toBe(true);
    expect(next).toMatchObject({ shape: 'round', base: 'red', gradient: null, decorations: [] });
  });
});

describe('open or fixed', () => {
  it('an edge fix needs the player to act, and then clean skin on every nail', () => {
    const messy = addSpill(painted('red'), 0, Array.from({ length: 30 }, (_, i) => i));
    const request = openRequest('edge', messy);
    expect(meetsRequest(request, painted('red'))).toBe(false);
    expect(meetsRequest({ ...request, acted: true }, messy)).toBe(false);
    expect(meetsRequest({ ...request, acted: true }, painted('red'))).toBe(true);
  });

  it('a colour fix needs a different colour, painted', () => {
    const request = openRequest('colour', painted('red'));
    expect(request.fromBase).toBe('red');
    expect(meetsRequest(request, painted('red'))).toBe(false);
    expect(meetsRequest(request, { ...removeAll(painted('red')), base: 'pale-pink' })).toBe(false);
    expect(meetsRequest(request, painted('pale-pink'))).toBe(true);
  });

  it('updateRequests marks the met ones fixed once and remembers the action', () => {
    const start = [openRequest('edge', painted('red')), openRequest('colour', painted('red'))];
    const first = updateRequests(start, painted('red'), true);
    expect(first.fixed.map((f) => f.kind)).toEqual(['edge']);
    const second = updateRequests(first.requests, painted('pale-pink'), false);
    expect(second.fixed.map((f) => f.kind)).toEqual(['colour']);
    expect(updateRequests(second.requests, painted('pale-pink'), true).fixed).toEqual([]);
    expect(fixOutcomes(second.requests)).toEqual([{ kind: 'edge', fixed: true }, { kind: 'colour', fixed: true }]);
  });
});

describe('problem handling and the grader', () => {
  it('a fix done lifts problem handling to the floor; one left open caps it', () => {
    expect(applyFixesToSkills(skills, [{ kind: 'edge', fixed: true }]).problemHandling).toBe(FIX_CONFIG.skills.fixedFloor);
    expect(applyFixesToSkills({ ...skills, problemHandling: 95 }, [{ kind: 'edge', fixed: false }]).problemHandling).toBe(FIX_CONFIG.skills.openCap);
    expect(applyFixesToSkills(skills, [])).toBe(skills);
  });

  it('the grader hears which fixes were done (unknown kinds dropped)', async () => {
    let sent = '';
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = String(init.body);
      return new Response(JSON.stringify({ content: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    const transcript = [{ role: 'client', content: 'Hi' }, { role: 'player', content: 'Hello!' }];
    await handleGradeAppointment({ transcript, outcome: 'completed', finalMood: 60, level: 'some', clientId: 'grace', nails: { description: 'round, red', match: 80, fixes: [{ kind: 'edge', fixed: false }, { kind: 'hack', fixed: true }] } }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(sent).toContain('asked to fix an uneven edge: it was NOT fixed');
    expect(sent).not.toContain('hack');
  });
});

describe('a length fix (story 051)', () => {
  it('knows the way she wants it, needs the length to move that way, and is impossible past the ends', () => {
    const medium = { ...painted('red'), length: 'medium' as const };
    const shorter = openRequest('length', medium, 'Can you make them a little shorter, please?');
    expect(shorter).toMatchObject({ fromLength: 'medium', direction: 'shorter' });
    expect(meetsRequest(shorter, medium)).toBe(false);
    expect(meetsRequest(shorter, { ...medium, length: 'long' })).toBe(false);
    expect(meetsRequest(shorter, { ...medium, length: 'short' })).toBe(true);
    const longer = openRequest('length', medium, 'Could you do them a bit longer?');
    expect(longer.direction).toBe('longer');
    expect(meetsRequest(longer, { ...medium, length: 'long' })).toBe(true);
    expect(canFix(openRequest('length', painted('red'), 'a little shorter'))).toBe(false);
    expect(canFix(openRequest('length', { ...medium, length: 'long' }, 'a bit longer'), ['short', 'medium', 'long'])).toBe(false);
    expect(canFix(openRequest('edge', medium))).toBe(true);
  });
});


describe('a fix asked after Done (story 058)', () => {
  it("finds both requests in the owner's playtest line: polish on her skin (edge) and a colour that is not what she asked", () => {
    const grace = 'There is some polish on my skin near one nail… and it is a bit more red than coral.';
    expect(fixKindsOf(grace)).toEqual(['edge', 'colour']);
    expect(fixKindsOf("Hmm, this isn't quite the shade I asked for.")).toEqual(['colour']);
    expect(fixKindsOf('They look lovely, thank you!')).toEqual([]);
    expect(fixKindsOf('That will be forty dollars.')).toEqual([]);
  });

  it('hears the player offering to fix it, in English and Vietnamese', () => {
    for (const line of ['Let me fix it for you.', "I'll fix that right away!", 'I can clean that up for you.', 'Để em sửa lại cho chị nha.', 'Em sửa liền nha chị.']) expect(offersFix(line)).toBe(true);
    for (const line of ['That is forty dollars, please.', 'Thank you! See you next time.', 'Would you like to book again?']) expect(offersFix(line)).toBe(false);
  });
});
