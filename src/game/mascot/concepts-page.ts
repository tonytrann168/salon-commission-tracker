import { MASCOT_EXPRESSIONS, renderMascot } from './index';
import type { Equipped, MascotExpression } from './index';
import { getSkin } from './mascot';
import '../ui/mai-bubble.css';

/**
 * DEV-ONLY concept page (http://localhost:5173/mascot-concepts.html): the three Mai mascot concepts side by side, for
 * the owner to pick A, B or C. Not part of the production build (only index.html is built).
 */

const CONCEPTS: { id: string; sample: Equipped; sampleName: string }[] = [
  { id: 'polish-bottle', sample: { face: 'glasses-round' }, sampleName: 'round glasses (face slot)' },
  { id: 'hoa-mai', sample: { neck: 'scarf-mint' }, sampleName: 'mint scarf (neck slot)' },
  { id: 'salon-kitty', sample: { head: 'bow-pink' }, sampleName: 'pink bow (head slot)' },
];

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
title.textContent = 'Mai mascot concepts';
const lede = document.createElement('p');
lede.className = 'lede';
lede.textContent = 'Owner: pick A, B or C (or a mix). Each is a swappable skin; the bubble in the game uses whichever is picked.';
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

for (const { id, sample, sampleName } of CONCEPTS) {
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
    cell(renderMascot('happy', 120, { skinId: id, equipped: { head: 'bow-pink', face: 'glasses-round', neck: 'scarf-mint', held: 'brush-gold', outfit: 'color-lavender' } }), 'all 5 slots (dress-up test)'),
  );
  section.append(h2, p, grid, row);
  root.append(section);
}
