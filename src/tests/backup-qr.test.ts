import { describe, expect, it } from 'vitest';
import { QR_MAX_BYTES, qrMatrix, qrPath } from '../game/backup-qr';
import { makeBackup } from '../game/backup';
import { shouldCue } from '../game/corner';

/** Story 027: the backup QR and the companion's "tap me" cue. */

describe('backup QR', () => {
  it('encodes a real backup code (square, with the three finder patterns)', async () => {
    const code = await makeBackup({ 'salon.save': JSON.stringify({ version: 1, appointments: 12, wallet: 40, owned: ['rose-gold'] }), 'salon.companion.v1': '{"name":"Minh"}' });
    const m = qrMatrix(code);
    expect(m).not.toBeNull();
    const n = m!.length;
    expect(m!.every((row) => row.length === n)).toBe(true);
    // Finder patterns: dark 7×7 rings in three corners (their corner modules are dark, the next ring light).
    for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      expect(m![r]![c]).toBe(true);
      expect(m![r + 1]![c + 1]).toBe(false);
      expect(m![r + 3]![c + 3]).toBe(true);
    }
    const path = qrPath(m!);
    expect(path.size).toBe(n + 8);
    expect(path.d.split('M').length - 1).toBe(m!.flat().filter(Boolean).length);
  });

  it('says no when the code is too long for one QR code', () => {
    expect(qrMatrix('x'.repeat(QR_MAX_BYTES))).not.toBeNull();
    expect(qrMatrix('x'.repeat(QR_MAX_BYTES + 1))).toBeNull();
  });
});

describe('"tap me" cue', () => {
  it('shows until the companion corner has been opened once', () => {
    expect(shouldCue(null)).toBe(true);
    expect(shouldCue('1')).toBe(false);
  });
});
