import { haptic } from '../comfort';
import { UI_SOUNDS_CONFIG, createSoundGate, emitUiSound, kindFor, pitchFor } from '../ui-sounds';
import type { UiSoundsConfig } from '../ui-sounds';

/**
 * Story 070: one delegated listener gives every button its sound. A mouse or pen sounds on press (instant); a finger
 * sounds on release, and only if it stayed on the button and was not cancelled, so a scroll never makes a sound.
 * Button sounds are throttled (minGapMs); a primary press also gives a short haptic tick. Returns a remover.
 */
const TARGETS = 'button, input[type=checkbox], [role=switch], [data-sfx]';

export function installUiSounds(doc: Document = document, config: UiSoundsConfig = UI_SOUNDS_CONFIG, rand: () => number = Math.random): () => void {
  const gate = createSoundGate(config.minGapMs);
  let touch: { id: number; target: Element; x: number; y: number } | null = null;

  const sound = (target: Element): void => {
    const kind = kindFor(target, config);
    if (!gate(performance.now())) return;
    emitUiSound(kind, pitchFor(kind, rand(), config));
    if (kind === 'primary' && config.hapticMs > 0) haptic(config.hapticMs);
  };
  // A disabled button gets no pointer events in some browsers: its nearest enabled ancestor does, so look it up.
  const targetOf = (event: PointerEvent): Element | null => {
    const hit = (event.target as Element | null)?.closest?.(TARGETS);
    if (hit) return hit;
    const under = doc.elementFromPoint?.(event.clientX, event.clientY);
    return under?.closest?.(TARGETS) ?? null;
  };

  const onDown = (event: PointerEvent): void => {
    if (event.button > 0) return;
    const target = targetOf(event);
    if (!target) return;
    if (event.pointerType === 'touch') touch = { id: event.pointerId, target, x: event.clientX, y: event.clientY };
    else sound(target);
  };
  const onUp = (event: PointerEvent): void => {
    if (!touch || event.pointerId !== touch.id) return;
    const { target, x, y } = touch;
    touch = null;
    if (Math.hypot(event.clientX - x, event.clientY - y) > config.moveTolerancePx) return;
    const under = doc.elementFromPoint?.(event.clientX, event.clientY);
    if (under && !target.contains(under) && under !== target) return;
    sound(target);
  };
  const onCancel = (): void => {
    touch = null;
  };
  doc.addEventListener('pointerdown', onDown, { capture: true, passive: true });
  doc.addEventListener('pointerup', onUp, { capture: true, passive: true });
  doc.addEventListener('pointercancel', onCancel, { capture: true, passive: true });
  return () => {
    doc.removeEventListener('pointerdown', onDown, { capture: true });
    doc.removeEventListener('pointerup', onUp, { capture: true });
    doc.removeEventListener('pointercancel', onCancel, { capture: true });
  };
}
