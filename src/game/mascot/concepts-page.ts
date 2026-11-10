import { MASCOT_EXPRESSIONS, renderMascot } from './index';
import type { Equipped, MascotExpression } from './index';
import { getSkin } from './mascot';
import '../ui/mai-bubble.css';

/**
 * DEV-ONLY concept page (http://localhost:5173/mascot-concepts.html, round 2: ?round=2): the three Mai mascot concepts side by side, for
 * the owner to pick A, B or C. Not part of the production build (only index.html is built).
 */

type Concept = { id: string; sample: Equipped; sampleName: string; score?: string };
const ROUND_1: Concept[] = [
  { id: 'polish-bottle', sample: { face: 'glasses-round' }, sampleName: 'round glasses (face slot)' },
  { id: 'hoa-mai', sample: { neck: 'scarf-mint' }, sampleName: 'mint scarf (neck slot)' },
  { id: 'salon-kitty', sample: { head: 'bow-pink' }, sampleName: 'pink bow (head slot)' },
];
/** Round 2 (owner leaning C): four kitty variants with more contrast at 56 px, plus two non-cat ideas. */
const ROUND_2: Concept[] = [
  { id: 'f-polish-kitty', sample: { neck: 'scarf-mint' }, sampleName: 'mint scarf (neck slot)', score: 'Cute at 56 px 5/5 · Ownable 5/5 (nobody else has a polish-bottle cat) · Dress-up 4/5 (cap = hat spot; bottle colour = outfit; paws hold items) · Salon identity 5/5. Recommended.' },
  { id: 'g-mochi-cat-bunny', sample: { head: 'bow-pink' }, sampleName: 'pink bow (head slot)', score: 'Cute at 56 px 5/5 · Ownable 4/5 (an original species) · Dress-up 5/5 (clear head, apron/outfit area, paws) · Salon identity 4/5 (painted tips, apron). Strong second.' },
  { id: 'c2-lavender-kitty', sample: { face: 'glasses-round' }, sampleName: 'round glasses (face slot)', score: 'Cute 4/5 · Ownable 2/5 (a cat) · Dress-up 4/5 · Salon identity 4/5 (mood-coloured claw tips).' },
  { id: 'c4-chibi-kitty', sample: { neck: 'scarf-mint' }, sampleName: 'mint scarf (neck slot)', score: 'Cute 5/5 · Ownable 2/5 (a cat) · Dress-up 3/5 (tiny body, little outfit room) · Salon identity 4/5 (hugs a bottle).' },
  { id: 'c1-peach-kitty', sample: { head: 'bow-pink' }, sampleName: 'pink bow (head slot)', score: 'Cute 4/5 · Ownable 2/5 (a cat) · Dress-up 4/5 (apron = outfit) · Salon identity 3/5.' },
  { id: 'c3-calico-kitty', sample: { held: 'brush-gold' }, sampleName: 'gold brush (held slot)', score: 'Cute 4/5 · Ownable 3/5 (calico + nail file) · Dress-up 4/5 · Salon identity 3/5.' },
  { id: 'd-bunny', sample: { head: 'bow-pink' }, sampleName: 'pink bow (head slot)', score: 'Cute 4/5 · Ownable 2/5 · Dress-up 4/5 (ears fight with hats) · Salon identity 2/5.' },
  { id: 'e-mochi', sample: { face: 'glasses-round' }, sampleName: 'round glasses (face slot)', score: 'Cute at 56 px 5/5 · Ownable 3/5 · Dress-up 3/5 (no paws to hold items) · Salon identity 3/5 (polish-cap hat).' },
];
const ROUND = new URLSearchParams(location.search).get('round') === '2' ? 2 : 1;
const CONCEPTS = ROUND === 2 ? ROUND_2 : ROUND_1;

const LABELS: Record<MascotExpression, string> = {
  idle: 'idle',
  talking: 'talking',
  happy: 'happy / proud',
  thinking: 'thinking (hint)',
  tipWaiting: 'tip waiting',
  celebrating: 'celebrating (level-up)',
};

const style = document.createElement('style');
style.textContent = `
body { margin: 0; padding: 16px; background: #fff4f8; color: #3b2a33; font-family: system-ui, sans-serif; }
h1 { font-size: 22px; margin: 0 0 4px; } .lede { margin: 0 0 16px; color: #8a6575; }
.concept { background: #fff; border-radius: 20px; padding: 16px; margin-bottom: 16px; }
.concept h2 { margin: 0 0 4px; font-size: 20px; } .concept p { margin: 0 0 12px; color: #5b4a53; line-height: 1.4; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 13px; color: #5b4a53; text-align: center; }
.cell .mascot { background: #fff4f8; border-radius: 16px; }
.score { margin: 14px 0 0; padding: 10px 12px; background: #f3e8ff; border-radius: 12px; font-weight: 600; color: #5b2d91; }
.row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 20px; margin-top: 16px; }
.fake-bubble { position: relative; width: 60px; height: 60px; padding: 2px; border-radius: 50%; background: #fff; box-shadow: 0 2px 10px rgba(59,42,51,.25); }
.fake-bubble .mascot { display: block; border-radius: 50%; overflow: hidden; background: #fff4f8; }
.fake-bubble .mai-badge { position: absolute; top: -4px; right: -4px; }
.strip { position: relative; width: 320px; height: 96px; background: #ffe6f0; border-radius: 12px; }
.strip .fake-bubble { position: absolute; right: 12px; bottom: 8px; }
`;
document.head.append(style);

const root = document.getElementById('concepts') as HTMLElement;
const title = document.createElement('h1');
title.textContent = ROUND === 2 ? 'Mai mascot concepts, round 2' : 'Mai mascot concepts';
const lede = document.createElement('p');
lede.className = 'lede';
lede.textContent = ROUND === 2 ? 'Owner: cute, personal, easy to customize, not just a cat. Hybrids F and G first, then kitty variants C1-C4 (more contrast at 56 px) and non-cat ideas D, E. Each scored on: cute at 56 px · ownable · dress-up friendly · nail-salon identity. "Do Mai\'s nails": the nails row shows three polish colours (her own ear and claw tips). Round 1: ?round=1.' : 'Owner: pick A, B or C (or a mix). Each is a swappable skin; the bubble in the game uses whichever is picked. Round 2: ?round=2.';
root.append(title, lede);

const cell = (node: HTMLElement, label: string): HTMLElement => {
  const box = document.createElement('div');
  box.className = 'cell';
  const caption = document.createElement('span');
  caption.textContent = label;
  box.append(node, caption);
  return box;
};

const bubble = (skinId: string, expression: MascotExpression, badge: number): HTMLElement => {
  const wrap = document.createElement('span');
  wrap.className = 'fake-bubble';
  wrap.append(renderMascot(expression, 56, { skinId }));
  if (badge > 0) {
    const dot = document.createElement('span');
    dot.className = 'mai-badge';
    dot.textContent = String(badge);
    wrap.append(dot);
  }
  return wrap;
};

for (const concept of CONCEPTS) {
  const { id, sample, sampleName } = concept;
  const section = document.createElement('section');
  section.className = 'concept';
  section.id = id;
  const [heading, ...rest] = getSkin(id).concept.split(': ');
  const h2 = document.createElement('h2');
  h2.textContent = heading ?? id;
  const p = document.createElement('p');
  p.textContent = rest.join(': ');
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(...MASCOT_EXPRESSIONS.map((expression) => cell(renderMascot(expression, 110, { skinId: id }), LABELS[expression])));

  const row = document.createElement('div');
  row.className = 'row';
  const strip = document.createElement('div');
  strip.className = 'strip';
  strip.append(bubble(id, 'tipWaiting', 1));
  row.append(
    cell(bubble(id, 'idle', 0), 'bubble, 56 px'),
    cell(bubble(id, 'tipWaiting', 2), 'bubble, tip waiting (badge)'),
    cell(strip, 'in the chat strip (320 px)'),
    cell(renderMascot('talking', 160, { skinId: id }), 'panel size, 160 px'),
    cell(renderMascot('happy', 120, { skinId: id, equipped: sample }), `sample accessory: ${sampleName}`),
    cell(renderMascot('happy', 120, { skinId: id, equipped: { head: 'bow-pink', face: 'glasses-round', neck: 'scarf-mint', held: 'brush-gold', outfit: 'color-lavender', nails: 'nails-mint' } }), 'all 6 slots (dress-up test)'),
  );
  const extras: HTMLElement[] = [];
  if (ROUND === 2) {
    const nails = document.createElement('div');
    nails.className = 'row';
    nails.append(
      ...(['nails-pink', 'nails-mint', 'nails-gold-glitter'] as const).map((nailsId) =>
        cell(renderMascot('happy', 100, { skinId: id, equipped: { nails: nailsId } }), `do Mai's nails: ${nailsId.replace('nails-', '').replace('-', ' ')}`),
      ),
    );
    extras.push(nails);
  }
  const score = document.createElement('p');
  score.className = 'score';
  if (concept.score) score.textContent = concept.score;
  section.append(h2, p, grid, row, ...extras, ...(concept.score ? [score] : []));
  root.append(section);
}
