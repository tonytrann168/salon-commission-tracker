import { registerSkin } from './mascot';
import { accessories, blush, eyes, moodExtras, mouth } from './shared';

/**
 * Concept C, Salon Kitty: a tiny round cat with painted pink paw-beans and nail tips, holding a polish brush.
 * Hair version later: the same cat with a comb or scissors (the easiest swap).
 */
registerSkin({
  id: 'salon-kitty',
  concept: 'C. Salon Kitty: a tiny round cat with pink paw-beans and painted nail tips, holding a polish brush. Hair version: the same cat with a comb or scissors.',
  draw(expression, equipped) {
    const fur = equipped.outfit === 'color-lavender' ? '#e6dafc' : '#fff1e6';
    const inner = '#ffb3cf';
    const tailUp = expression === 'happy' || expression === 'celebrating';
    const brushLift = expression === 'celebrating' ? -10 : 0;
    return `<path d="M76 ${tailUp ? 70 : 84} Q96 ${tailUp ? 50 : 84} 88 ${tailUp ? 34 : 66}" stroke="${fur}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M76 ${tailUp ? 70 : 84} Q96 ${tailUp ? 50 : 84} 88 ${tailUp ? 34 : 66}" stroke="#e8c9b5" stroke-width="1.2" fill="none"/>
<path d="M22 34 L28 8 L44 26 z" fill="${fur}" stroke="#e8c9b5" stroke-width="1.5"/><path d="M27 30 L30 16 L38 26 z" fill="${inner}"/>
<path d="M78 34 L72 8 L56 26 z" fill="${fur}" stroke="#e8c9b5" stroke-width="1.5"/><path d="M73 30 L70 16 L62 26 z" fill="${inner}"/>
<circle cx="50" cy="52" r="33" fill="${fur}" stroke="#e8c9b5" stroke-width="1.5"/>
${eyes(expression, 50, 50, 12, 4.4)}${blush(50, 60, 20)}<path d="M48 58 l2 2 l2 -2 z" fill="#ff8fb1"/>${mouth(expression, 50, 66, 5)}
<path d="M18 56 h12 M18 62 h12 M70 56 h12 M70 62 h12" stroke="#d9b8a6" stroke-width="1.2" stroke-linecap="round"/>
<g><ellipse cx="34" cy="86" rx="10" ry="7" fill="${fur}" stroke="#e8c9b5" stroke-width="1.2"/><circle cx="34" cy="87" r="2.6" fill="${inner}"/>${[28, 34, 40].map((x) => `<ellipse cx="${x}" cy="80.5" rx="1.8" ry="2.4" fill="#ff5c9a"/>`).join('')}</g>
<g transform="translate(0 ${brushLift})"><ellipse cx="66" cy="86" rx="10" ry="7" fill="${fur}" stroke="#e8c9b5" stroke-width="1.2"/><circle cx="66" cy="87" r="2.6" fill="${inner}"/>${[60, 66, 72].map((x) => `<ellipse cx="${x}" cy="80.5" rx="1.8" ry="2.4" fill="#ff5c9a"/>`).join('')}
<path d="M70 84 l12 -16" stroke="#e0b44a" stroke-width="3" stroke-linecap="round"/><path d="M81 69 l4 -6 l3 2 l-4 6 z" fill="#ff5c9a"/></g>
${moodExtras(expression)}${accessories(equipped, { head: [50, 22], face: [50, 50], neck: [50, 82], hand: [86, 70] })}`;
  },
});
