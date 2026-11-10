import type { Equipped, MascotExpression } from './mascot';
import { registerSkin } from './mascot';
import { accessories, blush, glitterDots, moodExtras, mouth } from './shared';

/**
 * Mascot concepts, round 3 (owner, 2026-11-10: "I like G for original... make it original but also resemble nail art.
 * Like Duolingo: people know the owl right away"). Four G-based concepts aiming at an ICONIC mascot: one simple
 * silhouette, one signature colour (SIGNATURE below, like a brand colour), and instantly "nail art". Each skin also
 * has a one-colour logo for an app icon. Original designs; no likeness to existing characters intended.
 */

/** Mai's signature colour (coral-hot pink), used on every concept. */
export const SIGNATURE = '#ff5a87';
const SIGNATURE_DARK = '#e03c6c';
const INK = '#5a2e43';
const LINE = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`;

let uid = 0;
const nextId = (): string => `m${++uid}`;

/** The nails slot as body polish + pattern (G1 and G2 wear their polish as their whole body). */
function polish(equipped: Equipped): { base: string; pattern: 'french' | 'gradient' | 'dots' | 'glitter' | 'plain' } {
  switch (equipped.nails) {
    case 'nails-gradient':
      return { base: SIGNATURE, pattern: 'gradient' };
    case 'nails-dots':
      return { base: '#2ec4a6', pattern: 'dots' };
    case 'nails-mint':
      return { base: '#2ec4a6', pattern: 'plain' };
    case 'nails-gold-glitter':
      return { base: '#e0b44a', pattern: 'glitter' };
    case 'nails-french':
    case 'nails-pink':
    default:
      return { base: SIGNATURE, pattern: equipped.nails === 'nails-pink' ? 'plain' : 'french' };
  }
}

/** Fill for a body painted with `polish`: a gradient (needs a <defs> entry) or a flat colour. */
function bodyFill(p: ReturnType<typeof polish>, id: string): { defs: string; fill: string } {
  if (p.pattern !== 'gradient') return { defs: '', fill: p.base };
  return { defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98cf0"/><stop offset="1" stop-color="${SIGNATURE}"/></linearGradient>`, fill: `url(#${id})` };
}

/** White dots or glitter sparkles over a body area. */
function patternMarks(p: ReturnType<typeof polish>, points: [number, number][]): string {
  if (p.pattern === 'dots') return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity="0.9"/>`).join('');
  if (p.pattern === 'glitter') return points.map(([x, y]) => glitterDots(x, y) + glitterDots(x + 3, y + 3)).join('');
  return '';
}

/** Cute eyes that stay readable on a coloured body (white rims). */
function eyes(e: MascotExpression, cx: number, cy: number, dx: number, r: number): string {
  if (e === 'happy' || e === 'celebrating') {
    return [-dx, dx].map((o) => `<path d="M${cx + o - r} ${cy + 2} Q${cx + o} ${cy - r - 2} ${cx + o + r} ${cy + 2}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
  }
  const look = e === 'thinking' ? -1.5 : 0;
  return [-dx, dx]
    .map((o) => `<ellipse cx="${cx + o}" cy="${cy}" rx="${r}" ry="${r * 1.18}" fill="${INK}"/><circle cx="${cx + o + r * 0.32 + look}" cy="${cy - r * 0.42 + look}" r="${r * 0.45}" fill="#fff"/><circle cx="${cx + o - r * 0.35}" cy="${cy + r * 0.42}" r="${r * 0.2}" fill="#fff"/>`)
    .join('');
}

/** A cream face patch so the face reads on any polish colour. */
const facePatch = (cx: number, cy: number, rx: number, ry: number): string => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff4ec"/>`;

/** Floppy bunny ear hanging from (x, y) on side -1/1; perks up when happy. Painted tip in `tip`. */
function bunnyEar(x: number, y: number, side: -1 | 1, perk: boolean, fill: string, tip: string): string {
  const angle = perk ? side * 35 : side * 110;
  return `<g transform="rotate(${angle} ${x} ${y})"><ellipse cx="${x}" cy="${y - 13}" rx="7" ry="15" fill="${fill}" ${LINE}/><ellipse cx="${x}" cy="${y - 23}" rx="4.6" ry="5.5" fill="${tip}"/><path d="M${x - 2} ${y - 25} q1 -3 3 -3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>`;
}

const catEar = (pts: string, fill: string, tip: string, tipPts: string): string => `<path d="${pts}" fill="${fill}" ${LINE}/><path d="${tipPts}" fill="${tip}"/>`;

const cheer = (e: MascotExpression): boolean => e === 'happy' || e === 'celebrating';

// G1 Almond Mochi: her body IS an almond-shaped manicured nail; the French tip is her crown.
const ALMOND = 'M50 8 C68 8 82 30 83 54 C84 80 70 95 50 95 C30 95 16 80 17 54 C18 30 32 8 50 8 Z';
registerSkin({
  id: 'g1-almond-mochi',
  concept: 'G1. Almond Mochi: her whole body is an almond-shaped manicured nail with a glossy streak; a French-tip white band is her crown; cat ears plus floppy bunny ears. Her body colour IS her polish, so nail art is her outfit.',
  draw(e, equipped) {
    const p = polish(equipped);
    const id = nextId();
    const body = bodyFill(p, `${id}g`);
    const hop = e === 'celebrating' ? -3 : 0;
    return `<defs>${body.defs}<clipPath id="${id}c"><path d="${ALMOND}"/></clipPath></defs><g transform="translate(0 ${hop})">
${bunnyEar(22, 44, -1, cheer(e), '#fff4ec', SIGNATURE)}${bunnyEar(78, 44, 1, cheer(e), '#fff4ec', SIGNATURE)}
${catEar('M30 26 L28 6 L44 16 z', '#fff', SIGNATURE_DARK, 'M29.4 14 L28 6 L35 10.5 z')}${catEar('M70 26 L72 6 L56 16 z', '#fff', SIGNATURE_DARK, 'M70.6 14 L72 6 L65 10.5 z')}
<path d="${ALMOND}" fill="${body.fill}" ${LINE}/>
<g clip-path="url(#${id}c)"><path d="M10 0 H90 V27 Q50 36 10 27 Z" fill="#fffaf5"/>${patternMarks(p, [[30, 74], [70, 72], [42, 86], [60, 86], [24, 58], [76, 58]])}</g>
<path d="M17 54 C18 30 32 8 50 8" fill="none" stroke="none"/><path d="M27 40 Q28 30 35 26" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.85"/>
<path d="M10 27 Q50 36 90 27" fill="none" stroke="${INK}" stroke-width="1.6" clip-path="url(#${id}c)"/>
${facePatch(50, 60, 22, 18)}${eyes(e, 50, 57, 11, 5)}${blush(50, 66, 17)}${mouth(e, 50, 70, 4.5)}
${[30, 70].map((x) => `<ellipse cx="${x}" cy="88" rx="7" ry="5.5" fill="#fff4ec" ${LINE.replace('2.6', '1.8')}/>${[-3, 0, 3].map((dx) => `<ellipse cx="${x + dx}" cy="84" rx="1.5" ry="1.9" fill="${SIGNATURE}" stroke="${INK}" stroke-width="0.6"/>`).join('')}`).join('')}
${moodExtras(e)}${accessories(equipped, { head: [50, 4], face: [50, 57], neck: [50, 78], hand: [80, 84] })}</g>`;
  },
  logo(fg, bg) {
    return `<g transform="rotate(110 22 44)"><ellipse cx="22" cy="31" rx="7" ry="15" fill="${fg}"/></g><g transform="rotate(-110 78 44)"><ellipse cx="78" cy="31" rx="7" ry="15" fill="${fg}"/></g>
<path d="M30 26 L28 6 L44 16 z M70 26 L72 6 L56 16 z" fill="${fg}"/><path d="${ALMOND}" fill="${fg}"/>
<path d="M14 27 Q50 36 86 27" stroke="${bg}" stroke-width="3" fill="none"/><ellipse cx="39" cy="57" rx="4.5" ry="5.5" fill="${bg}"/><ellipse cx="61" cy="57" rx="4.5" ry="5.5" fill="${bg}"/><path d="M45 68 Q50 73 55 68" stroke="${bg}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },
});

// G2 Gel Drop: a glossy drop of gel polish with cat-bunny ears and a polish-brush tail.
const DROP = 'M50 6 C60 22 84 42 84 64 C84 84 69 96 50 96 C31 96 16 84 16 64 C16 42 40 22 50 6 Z';
registerSkin({
  id: 'g2-gel-drop',
  concept: 'G2. Gel Drop: a glossy drop of gel polish with a mirror-shine highlight, cat-bunny ears, and a polish-brush tail. Her body is her polish.',
  draw(e, equipped) {
    const p = polish(equipped);
    const id = nextId();
    const body = bodyFill(p, `${id}g`);
    const tailUp = cheer(e);
    return `<defs>${body.defs}<clipPath id="${id}c"><path d="${DROP}"/></clipPath></defs>
<g transform="rotate(${tailUp ? -25 : 0} 78 84)"><path d="M78 84 Q94 82 94 66" stroke="#c9952e" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M90 66 l4 -8 l4 8 q-4 3 -8 0 z" fill="${p.base}" stroke="${INK}" stroke-width="1.2"/></g>
${bunnyEar(22, 54, -1, cheer(e), p.base, '#fff4ec')}${bunnyEar(78, 54, 1, cheer(e), p.base, '#fff4ec')}
${catEar('M33 34 L28 16 L44 26 z', p.base, '#fff4ec', 'M29.2 21 L28 16 L33 19 z')}${catEar('M67 34 L72 16 L56 26 z', p.base, '#fff4ec', 'M70.8 21 L72 16 L67 19 z')}
<path d="${DROP}" fill="${body.fill}" ${LINE}/>
<g clip-path="url(#${id}c)">${patternMarks(p, [[30, 80], [70, 80], [50, 88], [24, 64], [76, 64]])}${p.pattern === 'french' ? '<path d="M10 0 H90 V30 Q50 22 10 30 Z" fill="#fffaf5"/>' : ''}</g>
<path d="M30 52 Q31 38 42 30" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.9"/><circle cx="27" cy="62" r="2.4" fill="#fff" opacity="0.9"/>
${facePatch(50, 68, 22, 17)}${eyes(e, 50, 65, 11, 5)}${blush(50, 74, 17)}${mouth(e, 50, 78, 4.5)}
${moodExtras(e)}${accessories(equipped, { head: [50, 10], face: [50, 65], neck: [50, 88], hand: [82, 88] })}`;
  },
  logo(fg, bg) {
    return `<path d="M78 84 Q94 82 94 66" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M90 66 l4 -8 l4 8 q-4 3 -8 0 z" fill="${fg}"/>
<path d="M33 34 L28 16 L44 26 z M67 34 L72 16 L56 26 z" fill="${fg}"/><path d="${DROP}" fill="${fg}"/>
<path d="M30 52 Q31 38 42 30" stroke="${bg}" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="39" cy="65" rx="4.5" ry="5.5" fill="${bg}"/><ellipse cx="61" cy="65" rx="4.5" ry="5.5" fill="${bg}"/><path d="M45 76 Q50 81 55 76" stroke="${bg}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },
});

// G3 Moon Mochi: a round mochi whose face sits in a big nail half-moon (lunula); stiletto-nail ear tips.
registerSkin({
  id: 'g3-moon-mochi',
  concept: 'G3. Moon Mochi: a round mochi painted in her signature polish, with a big nail half-moon (lunula) arc framing her face, and stiletto-nail ear tips.',
  draw(e, equipped) {
    const p = polish(equipped);
    const id = nextId();
    const body = bodyFill(p, `${id}g`);
    const stiletto = (side: -1 | 1): string => {
      const x = 50 + side * 22;
      const tilt = cheer(e) ? side * 4 : e === 'thinking' && side === 1 ? 24 : side * 12;
      return `<g transform="rotate(${tilt} ${x} 30)"><path d="M${x - 9} 32 Q${x - 7} 12 ${x} 0 Q${x + 7} 12 ${x + 9} 32 Z" fill="${body.fill}" ${LINE}/><path d="M${x - 3} 22 Q${x - 2} 12 ${x} 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.85"/></g>`;
    };
    return `<defs>${body.defs}<clipPath id="${id}c"><circle cx="50" cy="58" r="37"/></clipPath></defs>
${stiletto(-1)}${stiletto(1)}
<circle cx="50" cy="58" r="37" fill="${body.fill}" ${LINE}/>
<g clip-path="url(#${id}c)">${patternMarks(p, [[22, 44], [78, 44], [50, 26], [30, 30], [70, 30]])}<path d="M8 98 Q8 44 50 40 Q92 44 92 98 Z" fill="#fff4ec"/></g>
<path d="M14 80 Q16 44 50 40 Q84 44 86 80" fill="none" stroke="${INK}" stroke-width="1.8"/>
<path d="M24 40 Q28 30 38 26" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.85"/>
${eyes(e, 50, 60, 12, 5.2)}${blush(50, 70, 19)}${mouth(e, 50, 75, 4.5)}
${[28, 72].map((x) => `${[-3, 0, 3].map((dx) => `<ellipse cx="${x + dx}" cy="90" rx="1.6" ry="2" fill="${p.base}" stroke="${INK}" stroke-width="0.6"/>`).join('')}`).join('')}
${moodExtras(e)}${accessories(equipped, { head: [50, 22], face: [50, 60], neck: [50, 90], hand: [84, 86] })}`;
  },
  logo(fg, bg) {
    return `<g transform="rotate(-12 28 30)"><path d="M19 32 Q21 12 28 0 Q35 12 37 32 Z" fill="${fg}"/></g><g transform="rotate(12 72 30)"><path d="M63 32 Q65 12 72 0 Q79 12 81 32 Z" fill="${fg}"/></g>
<circle cx="50" cy="58" r="37" fill="${fg}"/><path d="M14 80 Q16 44 50 40 Q84 44 86 80" fill="none" stroke="${bg}" stroke-width="3"/><ellipse cx="38" cy="60" rx="4.6" ry="5.6" fill="${bg}"/><ellipse cx="62" cy="60" rx="4.6" ry="5.6" fill="${bg}"/><path d="M45 72 Q50 77 55 72" stroke="${bg}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },
});

// G4 G refined: the squishy mochi cat-bunny, no face-mask apron (a tiny tool pouch on the belly), floppy bunny ears
// you can see, and glossy painted ear tips in her signature colour as her trademark.
registerSkin({
  id: 'g4-mochi-refined',
  concept: 'G4. Mochi Cat-Bunny, refined: the squishy cat-bunny with clearly visible floppy bunny ears, glossy signature-pink ear and paw tips (her trademark), and a tiny tool pouch low on her belly instead of the apron.',
  draw(e, equipped) {
    const p = polish(equipped);
    const tip = p.base;
    const body = equipped.outfit === 'color-lavender' ? '#e6dbff' : '#fff6ee';
    const squish = e === 'celebrating' ? 'scale(1.05 0.95)' : '';
    return `<g transform="translate(50 60) ${squish} translate(-50 -60)">
${bunnyEar(20, 46, -1, cheer(e), body, tip)}${bunnyEar(80, 46, 1, cheer(e), body, tip)}
${catEar('M30 34 L32 10 L46 26 z', body, tip, 'M31 19 L32 10 L37 15 z')}${catEar('M70 34 L68 10 L54 26 z', body, tip, 'M69 19 L68 10 L63 15 z')}
<ellipse cx="50" cy="60" rx="37" ry="33" fill="${body}" ${LINE}/>
${eyes(e, 50, 55, 14, 5.6)}<ellipse cx="28" cy="65" rx="7.5" ry="5" fill="#ff9fbe" opacity="0.75"/><ellipse cx="72" cy="65" rx="7.5" ry="5" fill="#ff9fbe" opacity="0.75"/><path d="M48 61 l2 2 l2 -2 z" fill="#ff6f9a"/>${mouth(e, 50, 67, 4.5)}
<rect x="42" y="80" width="16" height="10" rx="4" fill="${SIGNATURE}" stroke="${INK}" stroke-width="1.6"/><path d="M53 80 l3 -8" stroke="#c9952e" stroke-width="2.2" stroke-linecap="round"/><path d="M55 73 l1.5 -3 l2 1 l-1.5 3 z" fill="${tip}"/>
${[22, 78].map((x) => `<ellipse cx="${x}" cy="80" rx="6.5" ry="5" fill="${body}" ${LINE.replace('2.6', '1.8')}/>${[-3, 0, 3].map((dx) => `<ellipse cx="${x + dx}" cy="76.5" rx="1.5" ry="1.9" fill="${tip}" stroke="${INK}" stroke-width="0.6"/>${p.pattern === 'glitter' ? glitterDots(x + dx, 76.5) : ''}`).join('')}`).join('')}</g>
${moodExtras(e)}${accessories(equipped, { head: [50, 24], face: [50, 55], neck: [50, 74], hand: [84, 78] })}`;
  },
  logo(fg, bg) {
    return `<g transform="rotate(-110 20 46)"><ellipse cx="20" cy="33" rx="7" ry="15" fill="${fg}"/></g><g transform="rotate(110 80 46)"><ellipse cx="80" cy="33" rx="7" ry="15" fill="${fg}"/></g>
<path d="M30 34 L32 10 L46 26 z M70 34 L68 10 L54 26 z" fill="${fg}"/><ellipse cx="50" cy="60" rx="37" ry="33" fill="${fg}"/>
<ellipse cx="36" cy="55" rx="4.8" ry="5.8" fill="${bg}"/><ellipse cx="64" cy="55" rx="4.8" ry="5.8" fill="${bg}"/><path d="M45 66 Q50 71 55 66" stroke="${bg}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },
});
