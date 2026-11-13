import qrcode from 'qrcode-generator';

/**
 * Story 027: the backup code as a QR code, drawn on the device (qrcode-generator, MIT; no network). Another phone's
 * camera reads it as text: the SB1 code, ready for "Restore from code".
 */

/** The most a QR code holds in byte mode at the lowest error correction (version 40-L). */
export const QR_MAX_BYTES = 2953;

/** The QR modules (true = dark), or null when the code is too long for a QR code. */
export function qrMatrix(text: string): boolean[][] | null {
  if (new TextEncoder().encode(text).length > QR_MAX_BYTES) return null;
  try {
    const qr = qrcode(0, 'L');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    return Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, col) => qr.isDark(row, col)));
  } catch {
    return null;
  }
}

/** One SVG path for the dark modules (a quiet zone of 4 modules around). */
export function qrPath(matrix: boolean[][]): { size: number; d: string } {
  const quiet = 4;
  let d = '';
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  }));
  return { size: matrix.length + quiet * 2, d };
}
