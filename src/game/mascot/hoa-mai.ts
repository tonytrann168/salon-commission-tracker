import type { MascotExpression } from './mascot';
import { registerSkin } from './mascot';
import { accessories, blush, eyes, moodExtras, mouth } from './shared';

/**
 * Concept B, Hoa Mai blossom: a yellow apricot blossom (hoa mai, the Tết flower, her name) with a face in the centre.
 * Each of the five petals is a glossy painted nail tip, and the polish colour follows her mood. Hair version later:
 * petals become curls.
 */
const PETAL_COLOR: Record<MascotExpression, string> = {
  idle: '#ffd54f',
  talking: '#ffca3a',
  happy: '#ffb347',
  thinking: '#e8dc9a',
  tipWaiting: '#ffb3cf',
  celebrating: '#ff8fb1',
};

registerSkin({
  id: 'hoa-mai',
  concept: 'B. Hoa Mai blossom: a yellow Tết apricot blossom with a face; each petal is a glossy painted nail tip whose colour follows her mood. Hair version: petals become curls.',
  draw(expression, equipped) {
    const color = equipped.outfit === 'color-lavender' ? '#c9a8ff' : PETAL_COLOR[expression];
    const spin = expression === 'celebrating' ? 18 : 0;
    const petals = [0, 72, 144, 216, 288]
      .map((angle) => `<g transform="rotate(${angle + spin} 50 52)"><path d="M50 50 C36 40 36 14 50 8 C64 14 64 40 50 50 z" fill="${color}" stroke="#e6a817" stroke-width="1.2"/><path d="M50 9 C58 13 59 20 58 24 C52 22 46 22 42 24 C41 20 42 13 50 9 z" fill="#ff5c9a" opacity="0.85"/><path d="M46 15 q2 -3 5 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.85"/></g>`)
      .join('');
    return `${petals}<circle cx="50" cy="52" r="21" fill="#fff4c2" stroke="#f0b429" stroke-width="2"/>
${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${50 + 23 * Math.cos((a * Math.PI) / 180)}" cy="${52 + 23 * Math.sin((a * Math.PI) / 180)}" r="1.6" fill="#e07b00"/>`).join('')}
${eyes(expression, 50, 50, 8, 3.6)}${blush(50, 58, 13)}${mouth(expression, 50, 63, 5)}
${moodExtras(expression)}${accessories(equipped, { head: [50, 24], face: [50, 50], neck: [50, 76], hand: [80, 84] })}`;
  },
});
