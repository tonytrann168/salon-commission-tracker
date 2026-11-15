/**
 * Story 054: the salon menu's own icon: a little price board on an easel (a real "menu on the wall"), drawn in code,
 * used everywhere the menu appears (home, the chat, the sheet, Settings, the first-game setup).
 */
export function priceBoardIcon(size = 22): string {
  return `<svg class="price-board-icon" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <path d="M9 26 L6 31 M23 26 L26 31" stroke="#8a5a3c" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="3" y="4" width="26" height="22" rx="3" fill="#8a5a3c"/>
    <rect x="5.5" y="6.5" width="21" height="17" rx="1.5" fill="#2f3b36"/>
    <circle cx="9" cy="10.5" r="1.4" fill="#ffd1e3"/><rect x="11.5" y="9.6" width="8" height="1.8" rx="0.9" fill="#f4efe6"/><text x="21.3" y="12" font-size="5" font-weight="700" fill="#ffd23f" font-family="system-ui, sans-serif">$</text>
    <circle cx="9" cy="15" r="1.4" fill="#ffd1e3"/><rect x="11.5" y="14.1" width="6.5" height="1.8" rx="0.9" fill="#f4efe6"/><text x="21.3" y="16.5" font-size="5" font-weight="700" fill="#ffd23f" font-family="system-ui, sans-serif">$</text>
    <circle cx="9" cy="19.5" r="1.4" fill="#ffd1e3"/><rect x="11.5" y="18.6" width="7.5" height="1.8" rx="0.9" fill="#f4efe6"/><text x="21.3" y="21" font-size="5" font-weight="700" fill="#ffd23f" font-family="system-ui, sans-serif">$</text>
    <path d="M13 4 L16 1.5 L19 4" fill="none" stroke="#8a5a3c" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}
