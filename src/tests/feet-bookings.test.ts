import { describe, expect, it } from 'vitest';
import { PATH_CONFIG, bookedService, pathNode, parsePathConfig } from '../game/path';
import pathJson from '../game/config/path.json';
import { ROSTER } from '../game/clients/roster';
import { SCENARIOS, eligibleScenarios, feetScenario, serviceOfScenario } from '../game/scenarios';
import { DIFFICULTIES } from '../game/types';
import { MENU_CONFIG, menuPrompt, orderFor } from '../game/menu';
import { PREP_RELAX, relaxLine } from '../game/nail-art/prep';

/** Story 071 (owner: never got a pedicure or combo client): pedicure and combo bookings come reliably. */
const per = PATH_CONFIG.pattern.length;
const appointmentStops = (days: number): number[] => Array.from({ length: days * per }, (_, i) => i).filter((i) => PATH_CONFIG.pattern[i % per] === 'appointment');

describe('feet bookings on the salon path', () => {
  it('the first visits are manicures; after that each booking is a random mix (owner 11-26: no fixed rate, no daily quota)', () => {
    const stops = appointmentStops(400);
    stops.slice(0, PATH_CONFIG.feet.afterVisits).forEach((i) => expect(bookedService(i)).toBe('manicure'));
    const services = stops.slice(PATH_CONFIG.feet.afterVisits).map((i) => bookedService(i));
    // All three come up, none takes over.
    for (const service of ['manicure', 'pedicure', 'combo'] as const) {
      const share = services.filter((s) => s === service).length / services.length;
      expect(share, service).toBeGreaterThan(0.15);
      expect(share, service).toBeLessThan(0.55);
    }
    // No quota: some days have no pedicure or combo, and some have several.
    const feetPerDay = Array.from({ length: 400 }, (_, day) => stops.filter((i) => Math.floor(i / per) === day && stops.indexOf(i) >= PATH_CONFIG.feet.afterVisits).filter((i) => bookedService(i) !== 'manicure').length);
    expect(feetPerDay.slice(1).some((n) => n === 0)).toBe(true);
    expect(feetPerDay.some((n) => n >= 3)).toBe(true);
    // Stable: the day's list never changes.
    expect(stops.map((i) => bookedService(i))).toEqual(stops.map((i) => bookedService(i)));
  });

  it('day 3 (the e2e fixture) has a pedicure or combo booking', () => {
    expect(appointmentStops(3).filter((i) => i >= 2 * per).some((i) => bookedService(i) !== 'manicure')).toBe(true);
  });

  it('the path node carries its service; a lesson is never a booking', () => {
    const index = appointmentStops(5).find((i) => bookedService(i) !== 'manicure')!;
    expect(pathNode(index, ROSTER, ['easy']).service).toBe(bookedService(index));
    expect(bookedService(2)).toBe('manicure');
  });

  it('reads path.json feet and refuses bad values', () => {
    expect(parsePathConfig(pathJson).feet).toEqual(PATH_CONFIG.feet);
    expect(() => parsePathConfig({ ...pathJson, feet: { ...pathJson.feet, mix: { manicure: 0, pedicure: 0, combo: 0 } } })).toThrow('path.json');
    expect(() => parsePathConfig({ ...pathJson, feet: { ...pathJson.feet, mix: { ...pathJson.feet.mix, combo: -1 } } })).toThrow('path.json');
  });
});

describe('every client can come in for a pedicure and a combo', () => {
  it('each roster client (all unlocked) finds a pedicure scenario and a combo scenario, her own variant first', () => {
    for (const client of ROSTER) {
      const list = eligibleScenarios(client, SCENARIOS, { unlocked: [...DIFFICULTIES] });
      for (const service of ['pedicure', 'combo'] as const) {
        const pick = feetScenario(list, client.id, service, 7);
        expect(pick, `${client.id} ${service}`).not.toBeNull();
        expect(serviceOfScenario(pick!)).toBe(service);
      }
    }
    // Her own words: Rosa's booked pedicure is her spa pedicure, Kim's combo is her combo deal.
    const rosa = ROSTER.find((c) => c.id === 'rosa')!;
    for (const seed of [1, 2, 3]) expect(feetScenario(eligibleScenarios(rosa, SCENARIOS, { unlocked: [...DIFFICULTIES] }), 'rosa', 'pedicure', seed)!.id).toBe('rosa-spa-pedi');
    const kim = ROSTER.find((c) => c.id === 'kim')!;
    expect(feetScenario(eligibleScenarios(kim, SCENARIOS, { unlocked: [...DIFFICULTIES] }), 'kim', 'combo', 5)!.id).toBe('kim-combo-deal');
  });

  it('at least four pedicure and four combo scenarios, across easy, medium and hard', () => {
    const of = (service: string) => SCENARIOS.filter((s) => serviceOfScenario(s) === service);
    expect(of('pedicure').length).toBeGreaterThanOrEqual(4);
    expect(of('combo').length).toBeGreaterThanOrEqual(4);
    for (const service of ['pedicure', 'combo']) expect(new Set(of(service).map((s) => s.difficulty))).toEqual(new Set(DIFFICULTIES));
  });
});

describe('what each service includes (story 071)', () => {
  it('pedicures, spa services and combos say what they include, in English and Vietnamese, on every preset', () => {
    for (const items of Object.values(MENU_CONFIG.presets)) {
      for (const tag of ['pedicure', 'spaPedicure', 'comboClassic', 'comboGel', 'manicure', 'gelToes', 'callus', 'hotStone']) {
        const item = items.find((i) => i.tag === tag)!;
        expect(item.includes?.en, tag).toBeTruthy();
        expect(item.includes?.vi, tag).toBeTruthy();
      }
      expect(items.find((i) => i.tag === 'pedicure')!.includes!.en).toMatch(/soak.*callus.*massage.*polish/i);
      expect(items.find((i) => i.tag === 'spaPedicure')!.includes!.en).toMatch(/scrub.*mask.*massage/i);
    }
  });
  it('the client is told what her service includes and may ask about it', () => {
    const items = MENU_CONFIG.presets.mid;
    const order = orderFor({ shapes: ['round'], colors: ['red'], gradient: 'no', gems: 'none', stickers: 'none', service: 'pedicure', extras: ['spaPedicure', 'hotStone'] }, items);
    expect(order.map((l) => l.item.tag)).toEqual(['spaPedicure', 'hotStone']);
    const prompt = menuPrompt(items, order);
    expect(prompt).toContain('includes: Classic steps plus sugar scrub');
    expect(prompt).toContain('ask once what your service includes');
  });
  it('a spa step the game does not play is her relaxing line; a classic pedicure has none', () => {
    expect(relaxLine(['spaPedicure'], 0)).toEqual(PREP_RELAX.lines[0]);
    expect(relaxLine(['pedicure', 'hotStone'], 0.99)).toEqual(PREP_RELAX.lines.at(-1));
    expect(relaxLine(['pedicure', 'gelToes'], 0.5)).toBeNull();
  });
});
