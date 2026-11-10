import { registerSkin } from './mascot';
import { accessories, blush, eyes, moodExtras, mouth } from './shared';

/** Placeholder Mai until the owner picks a concept: the lavender-haired face from story 009, simplified. */
registerSkin({
  id: 'placeholder',
  concept: 'Placeholder: the lavender-haired bestie face (until the owner picks A, B or C).',
  draw(expression, equipped) {
    const hair = equipped.outfit === 'color-lavender' ? '#9d7be0' : '#b98cf0';
    return `<circle cx="50" cy="52" r="40" fill="${hair}"/><rect x="14" y="52" width="16" height="34" rx="8" fill="${hair}"/><rect x="70" y="52" width="16" height="34" rx="8" fill="${hair}"/>
<circle cx="50" cy="56" r="30" fill="#ffd9c2"/><path d="M20 46 Q50 18 80 46 Q66 34 50 36 Q34 34 20 46 z" fill="${hair}"/>
${eyes(expression, 50, 56, 11, 4.2)}${blush(50, 66, 18)}${mouth(expression, 50, 72, 7)}${moodExtras(expression)}${accessories(equipped, { head: [64, 26], face: [50, 56], neck: [50, 84], hand: [78, 82] })}`;
  },
});
