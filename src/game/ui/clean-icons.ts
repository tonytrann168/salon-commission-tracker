/**
 * 054 fix (overseer): the clean-up buttons show the same drawn tools as the finger does: a cotton pad for Clean and
 * Rub, a cotton swab for Clean edges.
 */
export const cottonPadIcon = (size = 22): string =>
  `<svg class="cotton-pad-icon" viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true"><circle cx="30" cy="30" r="26" fill="#fffdfa" stroke="#bfb2a6" stroke-width="3"/><circle cx="30" cy="30" r="17" fill="none" stroke="#e3d6ca" stroke-width="3" stroke-dasharray="4 5"/><circle cx="30" cy="30" r="7" fill="none" stroke="#e3d6ca" stroke-width="3" stroke-dasharray="3 4"/></svg>`;

export const cottonSwabIcon = (size = 22): string =>
  `<svg class="cotton-swab-icon" viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true"><g transform="rotate(-40 30 30)"><rect x="27" y="10" width="6" height="40" rx="3" fill="#7ec8e3"/><ellipse cx="30" cy="9" rx="8" ry="9" fill="#fffdfa" stroke="#bfb2a6" stroke-width="2.5"/><ellipse cx="30" cy="51" rx="8" ry="9" fill="#fffdfa" stroke="#bfb2a6" stroke-width="2.5"/></g></svg>`;
