import { describe, expect, it } from 'vitest';
import { PATH_CONFIG, bookedService, pathNode, parsePathConfig } from '../game/path';
import pathJson from '../game/config/path.json';
import { ROSTER } from '../game/clients/roster';
import { SCENARIOS, eligibleScenarios, feetScenario, serviceOfScenario } from '../game/scenarios';
import { DIFFICULTIES } from '../game/types';

/** Story 071 (owner: never got a pedicure or combo client): pedicure and combo bookings come reliably. */
const per = PATH_CONFIG.pattern.length;
const appointmentStops = (days: number): number[] => Array.from({ length: days * per }, (_, i) => i).filter((i) => PATH_CONFIG.pattern[i % per] === 'appointment');

describe('feet bookings on the salon path', () => {
  it('none before the player has had afterVisits visits; then every day has at least one pedicure or combo', () => {
    const stops = appointmentStops(60);
    stops.slice(0, PATH_CONFIG.feet.afterVisits).forEach((i) => expect(bookedService(i)).toBe('manicure'));
    for (let day = 0; day < 60; day++) {
      const today = stops.filter((i) => Math.floor(i / per) === day && stops.indexOf(i) >= PATH_CONFIG.feet.afterVisits);
      if (today.length === 0) continue;
      expect(today.some((i) => bookedService(i) !== 'manicure'), `day ${day + 1}`).toBe(true);
    }
  });

  it('is about 25-30% of visits overall, with both pedicures and combos', () => {
    const stops = appointmentStops(400).slice(PATH_CONFIG.feet.afterVisits);
    const services = stops.map((i) => bookedService(i));
    const feet = services.filter((s) => s !== 'manicure').length / services.length;
    expect(feet).toBeGreaterThanOrEqual(0.25);
    expect(feet).toBeLessThanOrEqual(0.32);
    expect(services.filter((s) => s === 'combo').length).toBeGreaterThan(services.length * 0.07);
    expect(services.filter((s) => s === 'pedicure').length).toBeGreaterThan(services.length * 0.12);
  });

  it('the path node carries its service; a lesson is never a booking', () => {
    const index = appointmentStops(5).find((i) => bookedService(i) !== 'manicure')!;
    expect(pathNode(index, ROSTER, ['easy']).service).toBe(bookedService(index));
    expect(bookedService(2)).toBe('manicure');
  });

  it('reads path.json feet and refuses bad values', () => {
    expect(parsePathConfig(pathJson).feet).toEqual(PATH_CONFIG.feet);
    expect(() => parsePathConfig({ ...pathJson, feet: { ...pathJson.feet, extraChance: 2 } })).toThrow('path.json');
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
