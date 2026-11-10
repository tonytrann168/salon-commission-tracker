import { registerSkin } from './mascot';
import { accessories, blush, eyes, moodExtras, mouth } from './shared';

/**
 * Concept A, Polish Bottle: a round pastel-pink nail polish bottle with big sparkly eyes and blush; her cap wears a
 * little bow and her brush is her wand. Hair-salon version later: a hairdryer or comb character.
 */
registerSkin({
  id: 'polish-bottle',
  concept: 'A. Polish Bottle: a round pastel-pink polish bottle with sparkly eyes; her cap wears a bow and her brush is a wand. Hair version: a hairdryer or comb character.',
  draw(expression, equipped) {
    const glass = equipped.outfit === 'color-lavender' ? '#d9c4ff' : '#ffc4da';
    const polish = equipped.outfit === 'color-lavender' ? '#b98cf0' : '#ff8fb1';
    const bounce = expression === 'celebrating' ? -4 : expression === 'happy' ? -2 : 0;
    const wandUp = expression === 'celebrating' || expression === 'happy';
    return `<g transform="translate(0 ${bounce})">
<rect x="38" y="12" width="24" height="26" rx="6" fill="#ff5c9a"/><rect x="41" y="15" width="5" height="18" rx="2.5" fill="#fff" opacity="0.45"/>
<path d="M50 14 l-8 -5 v10 z M50 14 l8 -5 v10 z" fill="#fff"/><circle cx="50" cy="14" r="2.6" fill="#ffd1e3"/>
<rect x="42" y="36" width="16" height="6" rx="2" fill="#e04f8a"/>
<rect x="20" y="40" width="60" height="54" rx="22" fill="${glass}"/>
<path d="M22 70 Q50 62 78 70 L78 76 Q78 94 58 94 L42 94 Q22 94 22 76 z" fill="${polish}" opacity="0.75"/>
<path d="M28 50 Q30 44 37 44" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
${eyes(expression, 50, 60, 11, 4.4)}${blush(50, 70, 18)}${mouth(expression, 50, 76, 6)}
<g transform="rotate(${wandUp ? -35 : 10} 80 76)"><path d="M80 76 l14 -12" stroke="#e0b44a" stroke-width="3.2" stroke-linecap="round"/><path d="M93 65 l5 -5 l2.5 2.5 l-5 5 z" fill="#ff5c9a"/>${wandUp ? '<path d="M98 58 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 z" fill="#ffd54f"/>' : ''}</g>
${moodExtras(expression)}${accessories(equipped, { head: [50, 6], face: [50, 60], neck: [50, 42], hand: [82, 88] })}</g>`;
  },
});
