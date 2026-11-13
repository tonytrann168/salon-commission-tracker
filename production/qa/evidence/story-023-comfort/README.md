# Story 023 evidence — Comfort & accessibility

Chromium (Playwright), 320×568, en and vi.

| File | Shows |
|------|-------|
| `*-320-01-comfort-settings` | Settings → Comfort: text size (Smaller / Normal / Larger), Reduce motion, Vibration, High contrast; Larger and High contrast chosen |
| `*-320-02-chat-large-text` | An appointment with larger text and high contrast: bigger chat text, dark outlines on bubbles and buttons; Send still on screen, chat area 244 px |

Checked ("problems: none"): `<html data-text="large" data-contrast="high">` right after choosing; no sideways scroll; the settings are kept after a reload.
Reduced motion: `data-motion="reduce"` (from the phone or the toggle) stops every CSS animation and transition and hides confetti; the text reveal and the talking portraits use the same check (`prefersReducedMotion()`). Vibration: a short buzz on Done and on celebration cards (`navigator.vibrate`, where the phone supports it; iPhone Safari does not).
Tests: `src/tests/comfort.test.ts` (damaged save → defaults; attributes; phone or toggle → reduced motion; save, apply, and the check the animating code uses).
