import { getLanguage, t } from '../i18n';
import { NAIL_ART_CONFIG, paletteColor } from '../nail-art/design';
import { buy, shopItems } from '../progression';
import type { ProgressSave, ShopItem } from '../progression';
import { emitSound } from '../sound-events';
import { el } from './dom';
import './level-picker.css';
import './progression.css';

/**
 * The shop (story 007): spend tips on new polishes (they appear in the nail station) and station upgrades. Tips come
 * only from appointments; nothing here is sold for money.
 */
export function createShopScreen(host: HTMLElement, options: { load: () => ProgressSave; save: (save: ProgressSave) => void; onBack: () => void }): HTMLElement {
  const lang = getLanguage();
  const screen = el('section', 'screen shop');
  screen.setAttribute('aria-labelledby', 'shop-title');
  const title = el('h1', '', t('shop.title'));
  title.id = 'shop-title';
  const wallet = el('p', 'shop-wallet');
  wallet.setAttribute('aria-live', 'polite');
  const polishes = el('section', 'results-section');
  const upgrades = el('section', 'results-section');
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', options.onBack);

  const row = (item: ShopItem, save: ProgressSave): HTMLElement => {
    const owned = save.owned.includes(item.id);
    const node = el('div', owned ? 'shop-item owned' : 'shop-item');
    const words = el('span', 'shop-words');
    let name: string;
    if (item.kind === 'polish') {
      const colour = paletteColor(item.id, NAIL_ART_CONFIG);
      name = colour?.name[lang] ?? item.id;
      const swatch = el('span', 'shop-swatch');
      swatch.style.background = colour?.hex ?? '#ccc';
      swatch.setAttribute('aria-hidden', 'true');
      node.append(swatch);
      words.append(el('strong', '', name));
    } else {
      name = item.name[lang];
      node.append(el('span', 'shop-icon', item.icon));
      words.append(el('strong', '', name), el('span', 'shop-about', item.about[lang]));
    }
    const action = el('button', 'shop-buy', owned ? t('shop.owned') : t('shop.price', { dollars: item.price }));
    action.type = 'button';
    action.disabled = owned || save.wallet < item.price;
    action.setAttribute('aria-label', owned ? t('shop.ownedAria', { name }) : t('shop.buyAria', { name, dollars: item.price }));
    action.addEventListener('click', () => {
      const result = buy(options.load(), item.id);
      if (!result.ok) return;
      options.save(result.save);
      emitSound('tip');
      draw(t('shop.bought', { name }));
    });
    node.append(words, action);
    return node;
  };

  function draw(message?: string): void {
    const save = options.load();
    wallet.textContent = message ? `${message} ${t('shop.wallet', { dollars: save.wallet })}` : t('shop.wallet', { dollars: save.wallet });
    const items = shopItems();
    polishes.replaceChildren(el('h2', '', t('shop.polishes')), el('p', 'learning-reason', t('shop.polishesNote')), ...items.filter((i) => i.kind === 'polish').map((i) => row(i, save)));
    upgrades.replaceChildren(el('h2', '', t('shop.upgrades')), ...items.filter((i) => i.kind === 'upgrade').map((i) => row(i, save)));
  }
  draw();

  screen.append(title, wallet, el('p', 'learning-reason', t('shop.earnNote')), polishes, upgrades, back);
  host.appendChild(screen);
  return screen;
}
