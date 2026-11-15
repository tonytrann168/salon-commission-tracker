import { describe, expect, it } from 'vitest';
import pathJson from '../game/config/path.json';
import { NEW_PLAY, doneToday, recordPlayDay } from '../game/daily';
import { ROSTER } from '../game/clients/roster';
import { PATH_CONFIG, askDayChoice, bookedTime, dayProgress, finishNode, parsePathConfig, pathNode, pathView, startNextDay, todaysAppointments } from '../game/path';
import { NEW_SAVE, applyAppointment } from '../game/progression';
import { parseSave } from '../game/save';

/** Story 057a: the salon path and the daily goal ring. */

describe('the salon path', () => {
  it('follows the day pattern: appointments with a set client, and a lesson of one topic', () => {
    const per = PATH_CONFIG.pattern.length;
    expect(pathNode(0, ROSTER, ['easy']).kind).toBe('appointment');
    expect(pathNode(2, ROSTER, ['easy'])).toMatchObject({ kind: 'lesson', day: 1, lesson: { topic: 'greeting' } });
    expect(pathNode(2, ROSTER, ['easy']).lesson!.phrases).toHaveLength(PATH_CONFIG.lessonPhrases);
    expect(pathNode(per + 2, ROSTER, ['easy']).lesson!.topic).toBe('consultation');
    expect(pathNode(per, ROSTER, ['easy']).day).toBe(2);
    // The same node always has the same client.
    expect(pathNode(3, ROSTER, ['easy']).client!.id).toBe(pathNode(3, ROSTER, ['easy']).client!.id);
  });

  it('day 1 is easy; later days step up within what the rank has opened', () => {
    const per = PATH_CONFIG.pattern.length;
    expect(pathNode(0, ROSTER, ['easy', 'medium', 'hard']).client!.difficulty).toBe('easy');
    expect(pathNode(per, ROSTER, ['easy', 'medium', 'hard']).client!.difficulty).toBe('medium');
    expect(pathNode(per * 5, ROSTER, ['easy', 'medium']).client!.difficulty).toBe('medium');
    expect(pathNode(per * 5, ROSTER, ['easy']).client!.difficulty).toBe('easy');
  });

  it('shows the current day: done, current, locked; finishing moves on only from the current node', () => {
    const view = pathView(2, ROSTER, ['easy']);
    expect(view.map((v) => v.state).slice(0, 4)).toEqual(['done', 'done', 'current', 'locked']);
    expect(view).toHaveLength(PATH_CONFIG.pattern.length * (1 + PATH_CONFIG.showDays));
    expect(finishNode(2, 2)).toBe(3);
    expect(finishNode(2, 0)).toBe(2);
    expect(parseSave(JSON.stringify({ version: 1, pathDone: 7 })).pathDone).toBe(7);
    expect(parseSave(JSON.stringify({ version: 1, pathDone: -1 })).pathDone).toBeUndefined();
  });

  it('refuses a bad config', () => {
    expect(() => parsePathConfig({ ...pathJson, pattern: ['lesson', 'lesson'] })).toThrow('path.json: "pattern"');
  });
});

describe('the daily goal ring', () => {
  it('counts appointments finished today, and starts again tomorrow', () => {
    const one = recordPlayDay(NEW_PLAY, '2026-11-15').play;
    const two = recordPlayDay(one, '2026-11-15').play;
    expect(doneToday(two, '2026-11-15')).toBe(2);
    expect(two.streak).toBe(1);
    expect(doneToday(two, '2026-11-16')).toBe(0);
    expect(recordPlayDay(two, '2026-11-16').play.dayCount).toBe(1);
  });
});

describe('flexible days and booked guests (story 062)', () => {
  const per = PATH_CONFIG.pattern.length;
  const clientsIn = (n: number) => PATH_CONFIG.pattern.slice(0, n).filter((k) => k === 'appointment').length;

  it('knows the day, the stops done in it and the clients served', () => {
    expect(dayProgress(0)).toEqual({ day: 1, doneInDay: 0, perDay: per, clientsDone: 0 });
    expect(dayProgress(per + 2)).toEqual({ day: 2, doneInDay: 2, perDay: per, clientsDone: clientsIn(2) });
  });

  it('asks continue-or-next only for a day left unfinished on an earlier calendar day', () => {
    expect(askDayChoice(2, '2026-11-14', '2026-11-15')).toBe(true);
    expect(askDayChoice(2, '2026-11-15', '2026-11-15')).toBe(false);
    expect(askDayChoice(per, '2026-11-14', '2026-11-15')).toBe(false);
    expect(askDayChoice(2, '', '2026-11-15')).toBe(false);
  });

  it('starts the next day with no penalty, logging how many clients were served', () => {
    expect(startNextDay(per + 2)).toEqual({ done: 2 * per, log: { day: 2, clients: clientsIn(2) } });
  });

  it("lists today's booked guests (the day's appointment stops not served yet) with their times", () => {
    const booked = todaysAppointments(1, ROSTER, ['easy']);
    expect(booked.length).toBe(PATH_CONFIG.pattern.filter((k) => k === 'appointment').length - clientsIn(1));
    expect(booked.every((b) => b.node.kind === 'appointment' && b.node.client)).toBe(true);
    expect(booked[0]!.time).toBe(bookedTime(clientsIn(1)));
    expect(bookedTime(0)).toBe(`${String(PATH_CONFIG.booked.openHour).padStart(2, '0')}:00`);
  });

  it('books a different guest for each appointment of a day (while the pool has enough)', () => {
    for (const done of [0, PATH_CONFIG.pattern.length, 3 * PATH_CONFIG.pattern.length]) {
      const ids = todaysAppointments(done, ROSTER, ['easy']).map((b) => b.node.client!.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives a booked guest a little extra XP (not on a walk-out)', () => {
    const base = { stars: 4, tip: 5, goalMet: false, walkedOut: false, skills: { greeting: 60, consultation: 60, upsell: 60, rebooking: 60, problemHandling: 60 }, englishScore: 60, difficulty: 'easy' as const, daily: false, today: '2026-11-15' };
    const walkIn = applyAppointment(NEW_SAVE, base).xpGained;
    expect(applyAppointment(NEW_SAVE, { ...base, booked: true }).xpGained).toBe(walkIn + PATH_CONFIG.booked.xp);
    expect(applyAppointment(NEW_SAVE, { ...base, booked: true, walkedOut: true }).xpGained).toBe(applyAppointment(NEW_SAVE, { ...base, walkedOut: true }).xpGained);
  });

  it('keeps the day log and the last played day in the save, dropping nonsense', () => {
    const save = parseSave(JSON.stringify({ ...NEW_SAVE, pathDayOn: '2026-11-14', pathLog: [{ day: 1, clients: 2 }, { day: 'x', clients: 1 }] }));
    expect(save.pathDayOn).toBe('2026-11-14');
    expect(save.pathLog).toEqual([{ day: 1, clients: 2 }]);
    expect(parseSave(JSON.stringify({ ...NEW_SAVE, pathDayOn: 'yesterday' })).pathDayOn).toBeUndefined();
  });
});
