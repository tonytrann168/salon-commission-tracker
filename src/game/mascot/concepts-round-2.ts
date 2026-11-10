import type { MascotExpression } from './mascot';
import { registerSkin } from './mascot';
import { accessories, blush, glitterDots, mouth, moodExtras, nailPolish } from './shared';

/**
 * Mascot concepts, round 2 (owner, 2026-11-10: "add more designs, for now I'm leaning C"). Four Salon Kitty variants
 * that fix C's weak spot at 56 px (stronger outline, darker inner shade, bigger face, readable eyes), plus two
 * non-cat ideas for range. Original designs; no resemblance to branded characters intended. Concept sketches only.
 */

const INK = '#5a2e43';
const LINE = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`;

/** Bigger, high-contrast eyes with two sparkles; smiling arcs when happy. */
function bigEyes(expression: MascotExpression, cx: number, cy: number, dx: number, r: number): string {
  if (expression === 'happy' || expression === 'celebrating') {
    return [-dx, dx].map((o) => `<path d="M${cx + o - r} ${cy + 2} Q${cx + o} ${cy - r - 2} ${cx + o + r} ${cy + 2}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
  }
  const look = expression === 'thinking' ? -1.6 : 0;
  return [-dx, dx]
    .map((o) => `<ellipse cx="${cx + o}" cy="${cy}" rx="${r}" ry="${r * 1.18}" fill="${INK}"/><circle cx="${cx + o + r * 0.32 + look}" cy="${cy - r * 0.42 + look}" r="${r * 0.45}" fill="#fff"/><circle cx="${cx + o - r * 0.35}" cy="${cy + r * 0.42}" r="${r * 0.2}" fill="#fff"/>`)
    .join('');
}

/** Polish colour that follows the mood (B's best idea), for C2's claw tips. */
const MOOD_POLISH: Record<MascotExpression, string> = {
  idle: '#ff5c9a',
  talking: '#ff7ab0',
  happy: '#ff9f43',
  thinking: '#9aa9ff',
  tipWaiting: '#ffd54f',
  celebrating: '#2ec4a6',
};

interface KittyLook {
  fur: string;
  shade: string;
  ear: string;
  patches?: string;
}

/** The shared kitty head and paws, with a strong outline and a darker shade so it reads at 56 px. */
function kitty(expression: MascotExpression, look: KittyLook, claws: string, glitter = false): string {
  // Painted ear tips: Mai's nails start at her ears (the `nails` slot repaints them).
  const earTips = `<path d="M20.2 20 L22 6 L29 12 z" fill="${claws}"/><path d="M79.8 20 L78 6 L71 12 z" fill="${claws}"/>`;
  return `<path d="M17 38 L22 6 L43 24 z" fill="${look.fur}" ${LINE}/><path d="M23 31 L25 15 L36 25 z" fill="${look.ear}"/>
<path d="M83 38 L78 6 L57 24 z" fill="${look.fur}" ${LINE}/><path d="M77 31 L75 15 L64 25 z" fill="${look.ear}"/>${earTips}
<circle cx="50" cy="50" r="36" fill="${look.fur}" ${LINE}/>
<path d="M18 62 Q50 92 82 62 Q80 84 50 86 Q20 84 18 62 z" fill="${look.shade}" opacity="0.55"/>
${look.patches ?? ''}
${bigEyes(expression, 50, 48, 14, 5.6)}${blush(50, 60, 22)}<path d="M47.5 57 l2.5 2.6 l2.5 -2.6 z" fill="#ff6f9a" stroke="${INK}" stroke-width="1"/>${mouth(expression, 50, 65, 5)}
<path d="M10 54 h13 M10 61 h13 M77 54 h13 M77 61 h13" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
${[30, 70].map((x) => `<ellipse cx="${x}" cy="88" rx="11" ry="7.5" fill="${look.fur}" ${LINE}/>${[-6, 0, 6].map((dx) => `<ellipse cx="${x + dx}" cy="82.5" rx="2.2" ry="2.8" fill="${claws}" stroke="${INK}" stroke-width="0.8"/>${glitter ? glitterDots(x + dx, 82.5) : ''}`).join('')}`).join('')}`;
}

const brush = (x: number, y: number, up: boolean): string =>
  `<g transform="rotate(${up ? -30 : 0} ${x} ${y})"><path d="M${x} ${y} l12 -16" stroke="#c9952e" stroke-width="3.4" stroke-linecap="round"/><path d="M${x + 11} ${y - 15} l4 -6 l3.4 2.4 l-4 6 z" fill="#ff5c9a" stroke="${INK}" stroke-width="1"/></g>`;

const cheer = (e: MascotExpression): boolean => e === 'happy' || e === 'celebrating';

registerSkin({
  id: 'c1-peach-kitty',
  concept: 'C1. Peach Kitty: warm peach-and-cream fur with a strong outline, a pink salon apron and a polish brush.',
  draw(e, equipped) {
    const fur = equipped.outfit === 'color-lavender' ? '#e2d4ff' : '#ffd3b4';
    return `${(() => { const n = nailPolish(equipped, '#ff5c9a'); return kitty(e, { fur, shade: '#f2a983', ear: '#ff8fa8' }, n.color, n.glitter); })()}
<path d="M30 74 Q50 70 70 74 L66 94 Q50 97 34 94 z" fill="#ff8fb1" ${LINE}/><rect x="44" y="80" width="12" height="7" rx="2" fill="#ffd1e3" stroke="${INK}" stroke-width="1.2"/><path d="M30 74 Q20 66 26 60 M70 74 Q80 66 74 60" stroke="#ff8fb1" stroke-width="3" fill="none"/>
${brush(76, 86, cheer(e))}${moodExtras(e)}${accessories(equipped, { head: [50, 15], face: [50, 48], neck: [50, 72], hand: [84, 80] })}`;
  },
});

registerSkin({
  id: 'c2-lavender-kitty',
  concept: 'C2. Lavender Kitty: soft lilac fur, a mint scarf, and glossy painted claw tips whose colour changes with her mood.',
  draw(e, equipped) {
    return `${(() => { const n = nailPolish(equipped, MOOD_POLISH[e]); return kitty(e, { fur: '#dccbff', shade: '#a98ae8', ear: '#ff9fc4' }, n.color, n.glitter); })()}
<path d="M24 72 Q50 82 76 72 l0 7 Q50 90 24 79 z" fill="#7ad7c3" ${LINE}/><path d="M62 80 l5 14 l8 -3 l-4 -13 z" fill="#4fbfa6" ${LINE}/>
${moodExtras(e)}${accessories(equipped, { head: [50, 15], face: [50, 48], neck: [50, 70], hand: [84, 80] })}`;
  },
});

registerSkin({
  id: 'c3-calico-kitty',
  concept: 'C3. Calico Kitty: cream fur with soft orange and brown patches, a tiny bow, and a nail file for a wand.',
  draw(e, equipped) {
    const fur = equipped.outfit === 'color-lavender' ? '#ece2ff' : '#fff2df';
    const patches = `<path d="M17 38 L22 6 L43 24 Q30 30 26 44 Q20 44 17 38 z" fill="#f4a259" opacity="0.9"/><path d="M34 36 Q22 40 24 56 Q30 64 40 56 Q44 44 34 36 z" fill="#f4a259" opacity="0.85"/><path d="M83 38 L78 6 L57 24 Q70 28 74 40 z" fill="#8d6e63" opacity="0.85"/><path d="M70 70 Q82 64 84 54 Q86 70 74 78 z" fill="#8d6e63" opacity="0.7"/>`;
    const fileUp = cheer(e);
    return `${(() => { const n = nailPolish(equipped, '#ff5c9a'); return kitty(e, { fur, shade: '#e6c9a8', ear: '#ffb3cf', patches }, n.color, n.glitter); })()}
<path d="M60 14 l-9 -5 v10 z M60 14 l9 -5 v10 z" fill="#ff5c9a" ${LINE.replace('2.6', '1.4')}/><circle cx="60" cy="14" r="2.6" fill="#ffd1e3" stroke="${INK}" stroke-width="1"/>
<g transform="rotate(${fileUp ? -40 : -10} 76 86)"><rect x="74" y="58" width="6" height="30" rx="3" fill="#e7b3d6" ${LINE.replace('2.6', '1.6')}/>${[64, 70, 76, 82].map((y) => `<path d="M75 ${y} h4" stroke="#b77fa5" stroke-width="1"/>`).join('')}${fileUp ? '<path d="M77 50 l1.6 3.6 l3.6 1.6 l-3.6 1.6 l-1.6 3.6 l-1.6 -3.6 l-3.6 -1.6 l3.6 -1.6 z" fill="#ffd54f"/>' : ''}</g>
${moodExtras(e)}${accessories(equipped, { head: [38, 15], face: [50, 48], neck: [50, 72], hand: [84, 80] })}`;
  },
});

registerSkin({
  id: 'c4-chibi-kitty',
  concept: 'C4. Chibi Kitty: an extra-round head on a tiny body (sticker style), big sparkly eyes, hugging a polish bottle.',
  draw(e, equipped) {
    const fur = equipped.outfit === 'color-lavender' ? '#e2d4ff' : '#fff0e4';
    const hop = e === 'celebrating' ? -4 : 0;
    return `<g transform="translate(0 ${hop})"><ellipse cx="50" cy="88" rx="17" ry="10" fill="${fur}" ${LINE}/>
<path d="M14 34 L18 2 L40 20 z" fill="${fur}" ${LINE}/><path d="M20 27 L21 11 L33 21 z" fill="#ff9fc4"/>
<path d="M86 34 L82 2 L60 20 z" fill="${fur}" ${LINE}/><path d="M80 27 L79 11 L67 21 z" fill="#ff9fc4"/>
<circle cx="50" cy="46" r="40" fill="${fur}" ${LINE}/><path d="M14 56 Q50 88 86 56 Q84 78 50 82 Q16 78 14 56 z" fill="#f0c7a8" opacity="0.5"/>
${bigEyes(e, 50, 44, 16, 7.2)}${e === 'happy' || e === 'celebrating' ? '' : '<circle cx="38" cy="40" r="1.4" fill="#fff"/><circle cx="66" cy="40" r="1.4" fill="#fff"/>'}${blush(50, 58, 25)}<path d="M47.5 55 l2.5 2.6 l2.5 -2.6 z" fill="#ff6f9a" stroke="${INK}" stroke-width="1"/>${mouth(e, 50, 63, 5)}
<rect x="42" y="70" width="16" height="20" rx="6" fill="#ff8fb1" ${LINE.replace('2.6', '1.8')}/><rect x="45" y="64" width="10" height="8" rx="2" fill="#e04f8a" stroke="${INK}" stroke-width="1.4"/><path d="M45 74 v10" stroke="#fff" stroke-width="2" opacity="0.7" stroke-linecap="round"/>
<ellipse cx="38" cy="80" rx="7" ry="5.5" fill="${fur}" ${LINE.replace('2.6', '1.8')}/><ellipse cx="62" cy="80" rx="7" ry="5.5" fill="${fur}" ${LINE.replace('2.6', '1.8')}/>
${(() => { const n = nailPolish(equipped, '#ff5c9a'); return [35, 39, 43, 57, 61, 65].map((x) => `<ellipse cx="${x}" cy="76" rx="1.6" ry="2" fill="${n.color}" stroke="${INK}" stroke-width="0.6"/>${n.glitter ? glitterDots(x, 76) : ''}`).join('') + `<path d="M17 18 L18 2 L24 7 z" fill="${n.color}"/><path d="M83 18 L82 2 L76 7 z" fill="${n.color}"/>`; })()}
${moodExtras(e)}${accessories(equipped, { head: [50, 9], face: [50, 44], neck: [50, 70], hand: [80, 84] })}</g>`;
  },
});

registerSkin({
  id: 'd-bunny',
  concept: 'D. Bunny Manicurist: long ears that perk up or droop with her mood, holding a polish brush.',
  draw(e, equipped) {
    const fur = equipped.outfit === 'color-lavender' ? '#e2d4ff' : '#fff7fb';
    const ear = (side: -1 | 1): string => {
      const perk = e === 'happy' || e === 'celebrating' || e === 'talking' || (e === 'tipWaiting' && side === 1);
      const droop = e === 'thinking' && side === 1;
      const angle = droop ? side * 70 : perk ? side * 6 : side * 18;
      const x = 50 + side * 12;
      return `<g transform="rotate(${angle} ${x} 34)"><ellipse cx="${x}" cy="14" rx="9" ry="22" fill="${fur}" ${LINE}/><ellipse cx="${x}" cy="15" rx="4.5" ry="16" fill="#ffb3cf"/></g>`;
    };
    return `${ear(-1)}${ear(1)}<circle cx="50" cy="58" r="32" fill="${fur}" ${LINE}/><path d="M22 70 Q50 96 78 70 Q74 88 50 90 Q26 88 22 70 z" fill="#f3d3e0" opacity="0.7"/>
${bigEyes(e, 50, 56, 13, 5.2)}${blush(50, 67, 20)}<ellipse cx="50" cy="64" rx="3" ry="2.2" fill="#ff6f9a" stroke="${INK}" stroke-width="1"/>${mouth(e, 50, 71, 4.5)}
${brush(74, 88, cheer(e))}${moodExtras(e)}${accessories(equipped, { head: [50, 30], face: [50, 56], neck: [50, 86], hand: [82, 82] })}`;
  },
});

registerSkin({
  id: 'e-mochi',
  concept: 'E. Mochi Hamster: a round mochi body with chubby cheeks and a polish-cap hat. Very simple shapes that read well at 56 px.',
  draw(e, equipped) {
    const body = equipped.outfit === 'color-lavender' ? '#e6dbff' : '#fff5e6';
    const squish = e === 'celebrating' ? 'scale(1.04 0.96)' : e === 'happy' ? 'scale(1.02 0.98)' : '';
    return `<g transform="translate(50 62) ${squish} translate(-50 -62)"><circle cx="26" cy="32" r="8" fill="${body}" ${LINE}/><circle cx="26" cy="32" r="4" fill="#ffb3cf"/><circle cx="74" cy="32" r="8" fill="${body}" ${LINE}/><circle cx="74" cy="32" r="4" fill="#ffb3cf"/>
<ellipse cx="50" cy="62" rx="40" ry="33" fill="${body}" ${LINE}/><ellipse cx="50" cy="80" rx="26" ry="12" fill="#f6dcc0" opacity="0.8"/>
${bigEyes(e, 50, 58, 15, 5.4)}<ellipse cx="27" cy="68" rx="9" ry="6.5" fill="#ff9fbe" opacity="0.75"/><ellipse cx="73" cy="68" rx="9" ry="6.5" fill="#ff9fbe" opacity="0.75"/><path d="M48 64 l2 2 l2 -2 z" fill="#ff6f9a"/>${mouth(e, 50, 70, 4.5)}
<g transform="rotate(${e === 'thinking' ? 14 : -8} 50 26)"><rect x="40" y="10" width="20" height="18" rx="5" fill="#ff5c9a" ${LINE.replace('2.6', '2')}/><rect x="43" y="13" width="4" height="12" rx="2" fill="#fff" opacity="0.5"/><rect x="36" y="26" width="28" height="5" rx="2.5" fill="#e04f8a" stroke="${INK}" stroke-width="1.6"/></g></g>
${moodExtras(e)}${accessories(equipped, { head: [50, 8], face: [50, 58], neck: [50, 88], hand: [86, 84] })}`;
  },
});

registerSkin({
  id: 'f-polish-kitty',
  concept: 'F. Polish Kitty (cat × polish bottle): a round cat whose body is a glossy polish bottle; the bottle cap is her little hat; ear tips and claw tips painted like nails. Cute like C, but nobody else has her.',
  draw(e, equipped) {
    const n = nailPolish(equipped, '#ff5c9a');
    const glass = equipped.outfit === 'color-lavender' ? '#d9c4ff' : '#ffc4da';
    const fur = '#fff1e8';
    const hop = e === 'celebrating' ? -4 : 0;
    return `<g transform="translate(0 ${hop})">
<rect x="22" y="56" width="56" height="40" rx="18" fill="${glass}" ${LINE}/><path d="M24 78 Q50 70 76 78 L76 82 Q76 96 58 96 L42 96 Q24 96 24 82 z" fill="${n.color}" opacity="0.8"/><path d="M30 64 Q31 60 36 60" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.85"/>
<path d="M20 30 L24 4 L40 20 z" fill="${fur}" ${LINE}/><path d="M80 30 L76 4 L60 20 z" fill="${fur}" ${LINE}/><path d="M22.4 15 L24 4 L30 9 z" fill="${n.color}"/><path d="M77.6 15 L76 4 L70 9 z" fill="${n.color}"/>
<circle cx="50" cy="40" r="28" fill="${fur}" ${LINE}/><path d="M34 26 Q38 20 46 20" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
<rect x="40" y="2" width="20" height="16" rx="5" fill="#ff5c9a" ${LINE.replace('2.6', '2')}/><rect x="43" y="5" width="4" height="10" rx="2" fill="#fff" opacity="0.5"/>
${bigEyes(e, 50, 40, 12, 5)}${blush(50, 50, 18)}<path d="M48 47 l2 2.2 l2 -2.2 z" fill="#ff6f9a" stroke="${INK}" stroke-width="0.9"/>${mouth(e, 50, 55, 4.5)}
${[30, 70].map((x) => `<ellipse cx="${x}" cy="72" rx="8" ry="6" fill="${fur}" ${LINE.replace('2.6', '1.8')}/>${[-4, 0, 4].map((dx) => `<ellipse cx="${x + dx}" cy="67.5" rx="1.7" ry="2.2" fill="${n.color}" stroke="${INK}" stroke-width="0.7"/>${n.glitter ? glitterDots(x + dx, 67.5) : ''}`).join('')}`).join('')}
${moodExtras(e)}${accessories(equipped, { head: [50, 1], face: [50, 40], neck: [50, 60], hand: [80, 72] })}</g>`;
  },
});

registerSkin({
  id: 'g-mochi-cat-bunny',
  concept: 'G. Mochi Cat-Bunny (an original species): a squishy round mochi body with short cat ears plus small droopy bunny ears; ear tips and paw tips painted like glossy nails; a tiny apron. Simple shapes read very well at 56 px.',
  draw(e, equipped) {
    const n = nailPolish(equipped, '#ff5c9a');
    const body = equipped.outfit === 'color-lavender' ? '#e6dbff' : '#fff6ee';
    const perk = e === 'happy' || e === 'celebrating';
    const squish = e === 'celebrating' ? 'scale(1.05 0.95)' : '';
    return `<g transform="translate(50 60) ${squish} translate(-50 -60)">
<g transform="rotate(${perk ? -25 : -55} 24 40)"><ellipse cx="14" cy="40" rx="6" ry="13" fill="${body}" ${LINE}/><ellipse cx="14" cy="${perk ? 30 : 30}" rx="3.4" ry="4" fill="${n.color}"/></g>
<g transform="rotate(${perk ? 25 : 55} 76 40)"><ellipse cx="86" cy="40" rx="6" ry="13" fill="${body}" ${LINE}/><ellipse cx="86" cy="30" rx="3.4" ry="4" fill="${n.color}"/></g>
<path d="M28 34 L32 14 L44 28 z" fill="${body}" ${LINE}/><path d="M72 34 L68 14 L56 28 z" fill="${body}" ${LINE}/><path d="M30.6 22 L32 14 L37 19 z" fill="${n.color}"/><path d="M69.4 22 L68 14 L63 19 z" fill="${n.color}"/>
<ellipse cx="50" cy="60" rx="38" ry="33" fill="${body}" ${LINE}/>
<path d="M32 74 Q50 70 68 74 L65 92 Q50 95 35 92 z" fill="#ffd1e3" ${LINE.replace('2.6', '1.8')}/><path d="M44 80 h12" stroke="${INK}" stroke-width="1.2"/>
${bigEyes(e, 50, 55, 14, 5.6)}<ellipse cx="27" cy="65" rx="8" ry="5.5" fill="#ff9fbe" opacity="0.75"/><ellipse cx="73" cy="65" rx="8" ry="5.5" fill="#ff9fbe" opacity="0.75"/><path d="M48 61 l2 2 l2 -2 z" fill="#ff6f9a"/>${mouth(e, 50, 67, 4.5)}
${[22, 78].map((x) => `<ellipse cx="${x}" cy="80" rx="6.5" ry="5" fill="${body}" ${LINE.replace('2.6', '1.8')}/>${[-3, 0, 3].map((dx) => `<ellipse cx="${x + dx}" cy="76.5" rx="1.4" ry="1.8" fill="${n.color}" stroke="${INK}" stroke-width="0.6"/>${n.glitter ? glitterDots(x + dx, 76.5) : ''}`).join('')}`).join('')}</g>
${moodExtras(e)}${accessories(equipped, { head: [50, 24], face: [50, 55], neck: [50, 76], hand: [84, 78] })}`;
  },
});
