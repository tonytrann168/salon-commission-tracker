import { getLanguage, t } from '../i18n';
import { MENU_CONFIG, MENU_PRESETS, MENU_TAGS, menuItems, parseItem } from '../menu';
import type { MenuChoice, MenuItem, MenuTag } from '../menu';
import { loadSave, writeSave } from '../save';
import { el } from './dom';
import { priceBoardIcon } from './menu-icon';
import './menu-sheet.css';

/**
 * Story 044: Settings → Your salon menu: Basic / Mid / Fancy prices, or the player's own menu (English and Vietnamese
 * names, prices, what each item is; add and remove within the limits). Saved with the game (backups and the account
 * carry it). Pretend money: it is what the client pays the salon; the wallet gets the tip.
 */

/** `onConfirm` (story 054): the first-game setup: a Confirm button saves the choice and marks the menu set up. */
export function createMenuSection(options: { onConfirm?: () => void } = {}): HTMLElement {
  const section = el('section', 'results-section menu-settings');
  const limits = MENU_CONFIG.limits;
  let draft: MenuItem[] | null = null;

  const choose = (choice: MenuChoice): void => {
    writeSave({ ...loadSave(), menu: choice });
    draft = null;
    draw();
  };

  function draw(): void {
    const current = loadSave().menu ?? { preset: MENU_CONFIG.default };
    const heading = el('h2', 'menu-heading');
    heading.innerHTML = priceBoardIcon(28);
    heading.append(t('menu.sectionTitle'));
    section.replaceChildren(heading, el('p', 'setting-note', t('menu.sectionNote')));
    const presets = el('div', 'comfort-sizes menu-presets');
    presets.setAttribute('role', 'group');
    presets.setAttribute('aria-label', t('menu.sectionTitle'));
    for (const preset of [...MENU_PRESETS, 'custom'] as const) {
      const b = el('button', 'chat-button secondary', t(`menu.preset.${preset}`));
      b.type = 'button';
      b.dataset.preset = preset;
      b.setAttribute('aria-pressed', String(draft ? preset === 'custom' : current.preset === preset));
      b.addEventListener('click', () => {
        if (preset === 'custom') {
          draft = menuItems(current).map((item) => ({ ...item, name: { ...item.name } }));
          draw();
        } else choose({ preset });
      });
      presets.append(b);
    }
    section.append(presets);
    if (current.preset !== 'custom' && !draft) {
      // The chosen price set, as the client sees it.
      const list = el('ol', 'menu-list');
      menuItems(current).forEach((item, i) => {
        const row = el('li', 'menu-item');
        row.append(el('span', 'menu-number', String(i + 1)), el('span', 'menu-names', item.name[getLanguage()]), el('span', 'menu-price', `$${item.price}`));
        list.append(row);
      });
      section.append(list);
      if (options.onConfirm) section.append(confirmButton(() => true));
      return;
    }
    // The player's own menu: an editable list.
    const items = draft ?? menuItems(current).map((item) => ({ ...item, name: { ...item.name } }));
    draft = items;
    const editor = el('ol', 'menu-editor');
    items.forEach((item, i) => {
      const row = el('li', 'menu-edit-row');
      const field = (label: string, input: HTMLInputElement | HTMLSelectElement): HTMLElement => {
        const wrap = el('label', 'menu-field');
        wrap.append(el('span', '', label), input);
        return wrap;
      };
      const en = el('input');
      en.value = item.name.en;
      en.maxLength = limits.maxName;
      en.addEventListener('input', () => (item.name.en = en.value));
      const vi = el('input');
      vi.value = item.name.vi;
      vi.maxLength = limits.maxName;
      vi.addEventListener('input', () => (item.name.vi = vi.value));
      const price = el('input');
      price.type = 'number';
      price.inputMode = 'numeric';
      price.min = String(limits.minPrice);
      price.max = String(limits.maxPrice);
      price.value = String(item.price);
      price.addEventListener('input', () => (item.price = Number(price.value)));
      const kind = el('select');
      for (const tag of MENU_TAGS) {
        const option = el('option', '', t(`menu.tag.${tag}`));
        option.value = tag;
        option.selected = item.tag === tag;
        kind.append(option);
      }
      kind.addEventListener('change', () => (item.tag = kind.value as MenuTag));
      const remove = el('button', 'chat-button secondary menu-remove', t('menu.remove'));
      remove.type = 'button';
      remove.disabled = items.length <= limits.minItems;
      remove.addEventListener('click', () => {
        items.splice(i, 1);
        draw();
      });
      row.append(el('span', 'menu-number', String(i + 1)), field(t('menu.nameEn'), en), field(t('menu.nameVi'), vi), field(t('menu.price'), price), field(t('menu.kind'), kind), remove);
      editor.append(row);
    });
    const add = el('button', 'chat-button secondary', t('menu.add'));
    add.type = 'button';
    add.disabled = items.length >= limits.maxItems;
    add.addEventListener('click', () => {
      items.push({ tag: 'other', price: 10, name: { en: '', vi: '' } });
      draw();
    });
    const status = el('p', 'setting-note menu-status');
    status.setAttribute('aria-live', 'polite');
    const save = el('button', 'chat-button menu-save', t('menu.save'));
    save.type = 'button';
    const saveDraft = (): boolean => {
      // Items without a name or with a price out of range are left out; at least one must stay.
      const clean = items.map((item) => parseItem(item, limits)).filter((item): item is MenuItem => item !== null);
      if (clean.length < limits.minItems) return false;
      choose({ preset: 'custom', items: clean });
      section.querySelector('.menu-status')?.replaceChildren(t('menu.saved'));
      return true;
    };
    save.addEventListener('click', () => void saveDraft());
    section.append(editor, add, save, status);
    if (options.onConfirm) section.append(confirmButton(saveDraft));
  }

  /** Story 054: Confirm (the first-game setup): keep the choice (my own menu is saved first) and go on. */
  function confirmButton(saveFirst: () => boolean): HTMLButtonElement {
    const b = el('button', 'chat-button menu-confirm', `✓ ${t('menu.confirm')}`);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (!saveFirst()) return;
      const save = loadSave();
      writeSave({ ...save, menu: save.menu ?? { preset: MENU_CONFIG.default }, menuConfirmed: true });
      options.onConfirm?.();
    });
    return b;
  }

  draw();
  return section;
}
