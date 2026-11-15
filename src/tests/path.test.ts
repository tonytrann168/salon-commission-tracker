import { describe, expect, it } from 'vitest';
import pathJson from '../game/config/path.json';
import { NEW_PLAY, doneToday, recordPlayDay } from '../game/daily';
import { ROSTER } from '../game/clients/roster';
import { PATH_CONFIG, finishNode, parsePathConfig, pathNode, pathView } from '../game/path';
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
