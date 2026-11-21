import { getLanguage, t } from '../i18n';
import { comboSaving, menuGroups } from '../menu';
import type { MenuItem } from '../menu';
import { el } from './dom';
import { serviceIcon } from './service-icon';

/**
 * Story 063: the salon menu in its groups (Manicure, Pedicure, Nail enhancements, Add-ons), each item with its number,
 * a small drawn icon, its name (and the Vietnamese name under it in Vietnamese mode) and its price (add-ons "+$").
 */
export function menuList(items: readonly MenuItem[], ordered: ReadonlySet<number> = new Set(), bothNames = false): HTMLElement {
  const box = el('div', 'menu-groups');
  for (const group of menuGroups(items)) {
    box.append(el('h3', 'menu-group-title', t(`menu.group.${group.category}`)));
    const list = el('ol', 'menu-list');
    for (const { number, item } of group.lines) {
      const row = el('li', ordered.has(number) ? 'menu-item ordered' : 'menu-item');
      row.dataset.tag = item.tag;
      const icon = el('span', 'menu-icon');
      icon.innerHTML = serviceIcon(item.tag, 28);
      const names = el('span', 'menu-names');
      const lang = getLanguage();
      if (bothNames) {
        names.append(el('strong', '', item.name.en));
        if (lang === 'vi' && item.name.vi !== item.name.en) names.append(el('small', '', item.name.vi));
      } else names.append(el('span', '', item.name[lang]));
      // Story 071: what the service includes, under its name.
      if (item.includes) names.append(el('small', 'menu-includes', item.includes[getLanguage()]));
      // Story 069: a combo shows what it saves against the two services separately.
      const saving = comboSaving(item, items);
      if (saving && saving > 0) names.append(el('small', 'menu-saving', t('menu.comboSaving', { dollars: saving })));
      row.append(el('span', 'menu-number', String(number)), icon, names, el('span', 'menu-price', `${group.category === 'addons' ? '+' : ''}$${item.price}`));
      list.append(row);
    }
    box.append(list);
  }
  return box;
}
