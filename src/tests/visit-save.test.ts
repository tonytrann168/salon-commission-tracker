import { describe, expect, it } from 'vitest';
import visitJson from '../game/config/visit-save.json';
import { VISIT_SAVE_CONFIG, parseVisitSave, parseVisitSaveConfig, visitSaveOf } from '../game/visit-save';
import type { VisitSave } from '../game/visit-save';
import { createAppointment } from '../game/appointment';
import { DEFAULT_CLIENT } from '../game/clients/default-client';
import { emptyDesign, paint } from '../game/nail-art/design';

/** Story 072 (owner: reload survival matters): a visit in progress survives a reload or a crash. */
const NOW = Date.UTC(2026, 10, 21, 12);
const transcript = [
  { role: 'client' as const, content: 'Hi! Red, please.' },
  { role: 'player' as const, content: 'Of course! Please sit down.' },
  { role: 'client' as const, content: 'Thank you!' },
];
const design = paint({ ...emptyDesign('round', 5, 'short'), base: 'red' }, 0, [1, 2, 3]);

const visit = (): VisitSave =>
  visitSaveOf(
    {
      clientId: 'grace',
      scenarioId: 'party-tonight',
      daily: true,
      pathNode: 3,
      level: 'some',
      appointment: { phase: 'service', mood: 64, transcript, moodHistory: [55, 60, 64], agreedTotal: 42 },
      service: { started: true, serviceElapsedMs: 12_000, prepDone: false, stage: 'hands', design, fixes: [], hangnailLeft: false },
    },
    NOW,
  );

describe('the saved visit', () => {
  it('reads back exactly what was saved', () => {
    expect(parseVisitSave(JSON.stringify(visit()), NOW + 60_000)).toEqual(visit());
  });

  it('is dropped safely: another version, too old, broken, finished, or nothing saved', () => {
    expect(parseVisitSave(null, NOW)).toBeNull();
    expect(parseVisitSave('{not json', NOW)).toBeNull();
    expect(parseVisitSave(JSON.stringify({ ...visit(), v: VISIT_SAVE_CONFIG.version + 1 }), NOW)).toBeNull();
    expect(parseVisitSave(JSON.stringify(visit()), NOW + (VISIT_SAVE_CONFIG.maxAgeHours * 3_600_000 + 1))).toBeNull();
    expect(parseVisitSave(JSON.stringify(visit()), NOW + (VISIT_SAVE_CONFIG.maxAgeHours * 3_600_000 - 1))).not.toBeNull();
    expect(parseVisitSave(JSON.stringify({ ...visit(), appointment: { ...visit().appointment, phase: 'done' } }), NOW)).toBeNull();
    expect(parseVisitSave(JSON.stringify({ ...visit(), appointment: { ...visit().appointment, transcript: [{ role: 'robot', content: 'x' }] } }), NOW)).toBeNull();
    expect(parseVisitSave(JSON.stringify({ ...visit(), service: { ...visit().service, design: 'oops' } }), NOW)).toBeNull();
  });

  it('reads visit-save.json and refuses bad values', () => {
    expect(parseVisitSaveConfig(visitJson)).toEqual(VISIT_SAVE_CONFIG);
    expect(VISIT_SAVE_CONFIG.maxAgeHours).toBe(24);
    expect(() => parseVisitSaveConfig({ ...visitJson, version: 0 })).toThrow('visit-save.json');
  });
});

describe('an appointment continued after a reload', () => {
  it('starts in the saved phase with the saved mood, chat and agreed total', () => {
    const saved = visit().appointment;
    const appointment = createAppointment({ client: DEFAULT_CLIENT, takeTurn: async () => ({ reply: 'ok', phase: 'service', moodDelta: 0, unclearEnglish: false, rude: false }), level: 'some', onFinished: () => undefined, restore: saved });
    const snapshot = appointment.getSnapshot();
    expect(snapshot.phase).toBe('service');
    expect(snapshot.mood).toBe(64);
    expect(snapshot.transcript).toEqual(transcript);
    expect(snapshot.moodHistory).toEqual([55, 60, 64]);
    expect(snapshot.agreedTotal).toBe(42);
    expect(snapshot.status).toBe('awaiting_player');
  });
});
