import { haptic } from '../comfort';
import { HANGNAIL_CONFIG, trimOutcome } from '../hangnail';
import { t } from '../i18n';
import { emitSound } from '../sound-events';
import { el } from './dom';

/**
 * Story 064: the hangnail on one nail (a little skin flap at the cuticle), drawn over the station's touch layer. With
 * the Nipper chosen, hold on it steadily to trim it (a ring fills); a quick snip or a hard press slips: a tiny red dot
 * (never gory) and a First aid card: apply styptic, then a bandage. Big targets; nothing needs fast reflexes.
 */
export interface HangnailOverlayOptions {
  touch: HTMLElement;
  /** Where the nail is now (touch-layer pixels), or null when it is not on screen (the other hand). */
  box: () => { left: number; right: number; top: number; bottom: number } | null;
  nipperOn: () => boolean;
  hint: (text: string, keep?: boolean) => void;
  /** First aid's step buttons go in the tool row (null: the row goes back to its tools). */
  firstAid: (buttons: HTMLElement[] | null) => void;
  onTrim: (outcome: 'clean' | 'slip') => void;
  onFirstAid: () => void;
}

export interface HangnailOverlay {
  place(): void;
  /** The hangnail is still there (not trimmed, not slipped). */
  readonly left: boolean;
  destroy(): void;
}

export function createHangnailOverlay(options: HangnailOverlayOptions): HangnailOverlay {
  let state: 'there' | 'trimmed' | 'nicked' | 'cared' = 'there';
  const spot = el('div', 'hangnail');
  spot.setAttribute('role', 'img');
  spot.setAttribute('aria-label', t('hangnail.label'));
  spot.innerHTML =
    '<svg class="hangnail-flap" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M4 16 Q6 9 12 6 Q10 11 13 14 Q9 13 4 16 Z" fill="#f0b79a" stroke="#b46f55" stroke-width="1.2" stroke-linejoin="round"/></svg>' +
    '<span class="hangnail-ring" aria-hidden="true"></span>';
  spot.style.setProperty('--trim-ms', `${HANGNAIL_CONFIG.trimMs}ms`);
  // 064 review: a soft pulsing ring so the little flap is easy to find (until the Nipper is on, or it is trimmed).
  spot.classList.add('pulse');
  options.touch.append(spot);

  let downAt = 0;
  let pressure = 0;
  let timer = 0;
  const end = (): void => {
    window.clearTimeout(timer);
    spot.classList.remove('holding');
    downAt = 0;
  };
  const trimmed = (): void => {
    state = 'trimmed';
    end();
    spot.classList.add('gone');
    emitSound('correct');
    options.hint(t('hangnail.trimmed'));
    options.onTrim('clean');
    window.setTimeout(() => spot.remove(), 600);
  };
  const slipped = (): void => {
    state = 'nicked';
    end();
    spot.classList.add('nicked');
    spot.setAttribute('aria-label', t('hangnail.nickLabel'));
    haptic([30, 40, 30]);
    emitSound('moodDown');
    options.onTrim('slip');
    showFirstAid();
  };
  spot.addEventListener('pointerdown', (event) => {
    if (state !== 'there' || !options.nipperOn()) return;
    event.preventDefault();
    event.stopPropagation();
    downAt = performance.now();
    pressure = event.pointerType === 'mouse' ? 0 : event.pressure;
    spot.classList.add('holding');
    try {
      spot.setPointerCapture(event.pointerId);
    } catch {
      // The hold still counts while the finger stays on it.
    }
    timer = window.setTimeout(() => state === 'there' && downAt && trimmed(), HANGNAIL_CONFIG.trimMs);
  });
  spot.addEventListener('pointermove', (event) => {
    if (downAt && event.pointerType !== 'mouse') pressure = Math.max(pressure, event.pressure);
    if (downAt && pressure > HANGNAIL_CONFIG.roughPressure) slipped();
  });
  const release = (): void => {
    if (!downAt || state !== 'there') return;
    const outcome = trimOutcome(performance.now() - downAt, pressure);
    if (outcome === 'slip') slipped();
    else if (outcome === 'clean') trimmed();
    else {
      end();
      options.hint(t('hangnail.holdLonger'));
    }
  };
  spot.addEventListener('pointerup', release);
  spot.addEventListener('pointercancel', end);

  /** First aid after a slip: styptic, then a bandage, as the tool row's two steps (nothing covers the hand). */
  function showFirstAid(): void {
    const styptic = el('button', 'station-button first-aid-styptic', `<span class="tab-icon" aria-hidden="true">🧴</span><span class="tab-text">1 · ${t('hangnail.styptic')}</span>`);
    styptic.type = 'button';
    styptic.innerHTML = `<span class="tab-icon" aria-hidden="true">🧴</span><span class="tab-text">1 · ${t('hangnail.styptic')}</span>`;
    const bandage = el('button', 'station-button first-aid-bandage');
    bandage.type = 'button';
    bandage.innerHTML = `<span class="tab-icon" aria-hidden="true">🩹</span><span class="tab-text">2 · ${t('hangnail.bandage')}</span>`;
    bandage.disabled = true;
    bandage.dataset.wait = '1';
    styptic.addEventListener('click', () => {
      styptic.disabled = true;
      styptic.dataset.wait = '1';
      spot.classList.add('styptic');
      delete bandage.dataset.wait;
      bandage.disabled = false;
      bandage.focus({ preventScroll: true });
    });
    bandage.addEventListener('click', () => {
      state = 'cared';
      spot.classList.add('bandaged');
      emitSound('phraseSaved');
      options.firstAid(null);
      options.hint(t('hangnail.saySorry'), true);
      options.onFirstAid();
    });
    options.firstAid([styptic, bandage]);
    options.hint(`🩹 ${t('hangnail.firstAidHint')}`, true);
    styptic.focus({ preventScroll: true });
  }

  const place = (): void => {
    const box = options.box();
    spot.hidden = !box || state === 'trimmed';
    if (!box) return;
    // At the cuticle, on the side of the nail (a 44 px target around the little flap).
    spot.style.left = `${Math.round(box.left - 26)}px`;
    spot.style.top = `${Math.round(box.bottom - 30)}px`;
  };
  place();
  return {
    place,
    get left() {
      return state === 'there';
    },
    destroy() {
      end();
      spot.remove();
    },
  };
}
