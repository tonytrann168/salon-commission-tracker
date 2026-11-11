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

/** Story 013: placeholder male companion until the designer's art: the same face with short hair and a deeper colour. */
registerSkin({
  id: 'placeholder-male',
  concept: 'Placeholder male companion: short hair, same friendly face (until the designer draws him).',
  draw(expression, equipped) {
    const hair = equipped.outfit === 'color-lavender' ? '#8a6fd6' : '#7d68c9';
    return `<path d="M18 50 Q18 16 50 14 Q82 16 82 50 L82 56 Q74 40 50 40 Q26 40 18 56 z" fill="${hair}"/>
<circle cx="50" cy="56" r="30" fill="#ffd9c2"/><circle cx="21" cy="58" r="5" fill="#ffd9c2"/><circle cx="79" cy="58" r="5" fill="#ffd9c2"/>
<path d="M22 44 Q30 22 52 22 Q76 22 80 42 Q70 30 56 32 Q48 36 38 32 Q28 34 22 44 z" fill="${hair}"/>
${eyes(expression, 50, 56, 11, 4.2)}${blush(50, 66, 18)}${mouth(expression, 50, 72, 7)}${moodExtras(expression)}${accessories(equipped, { head: [64, 22], face: [50, 56], neck: [50, 88], hand: [78, 82] })}`;
  },
});
