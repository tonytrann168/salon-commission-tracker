/**
 * Owner decision (two currencies): the coin is drawn (not the 🪙 emoji, which looks different on every phone, and
 * never a $): a round gold coin with a rim and a little star. Coins buy cosmetics; tips ($) buy salon upgrades.
 */
export function coinIcon(size = 20): string {
  return `<svg class="coin-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">`
    + '<circle cx="12" cy="12" r="11" fill="#f2b632"/>'
    + '<circle cx="12" cy="12" r="11" fill="none" stroke="#c4860f" stroke-width="1.6"/>'
    + '<circle cx="12" cy="12" r="7.6" fill="#ffd45c" stroke="#d99a1c" stroke-width="1.2"/>'
    + '<path d="M12 7.3l1.35 2.75 3.03.44-2.19 2.14.52 3.02L12 14.22l-2.71 1.43.52-3.02-2.19-2.14 3.03-.44z" fill="#e39a12"/>'
    + '<path d="M6.2 8.4a7 7 0 0 1 3.4-3.2" fill="none" stroke="#fff6d6" stroke-width="1.4" stroke-linecap="round"/>'
    + '</svg>';
}
