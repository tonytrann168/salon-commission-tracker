import { t } from '../i18n';
import { el } from './dom';
import './level-picker.css';

/**
 * The hosted preview's first screen (owner, 2026-11-10): enter an invite code. The server checks it against
 * TESTER_CODES and sets a signed, httpOnly cookie; the code is never stored in the page. Only in preview builds
 * (VITE_INVITE_GATE=1); local dev skips it.
 */

/** The invite session: signed in, and whether the server says this tester's code opens every client difficulty. */
export async function getSession(): Promise<{ signedIn: boolean; unlockAll: boolean }> {
  try {
    const response = await fetch('/api/session', { credentials: 'same-origin' });
    if (!response.ok) return { signedIn: false, unlockAll: false };
    const body = (await response.json().catch(() => ({}))) as { unlockAll?: unknown };
    return { signedIn: true, unlockAll: body.unlockAll === true };
  } catch {
    return { signedIn: false, unlockAll: false };
  }
}

/** True when the browser already holds a valid invite cookie. */
export async function hasSession(): Promise<boolean> {
  return (await getSession()).signedIn;
}

/** Show the invite screen until a code works, then remove it and resolve. */
export function askForInvite(host: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const screen = el('section', 'screen invite-screen');
    screen.setAttribute('aria-labelledby', 'invite-title');
    const title = el('h1', '', t('invite.title'));
    title.id = 'invite-title';
    const form = el('form', 'invite-form');
    const label = el('label', 'help-label', t('invite.label'));
    label.htmlFor = 'invite-code';
    const input = el('input', 'help-input');
    input.id = 'invite-code';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.maxLength = 64;
    const submit = el('button', 'chat-button', t('invite.enter'));
    submit.type = 'submit';
    const status = el('p', 'invite-status');
    status.setAttribute('role', 'alert');
    form.append(label, input, submit, status);
    screen.append(title, el('p', 'setting-note', t('invite.note')), form);
    host.append(screen);
    input.focus();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (input.value.trim() === '') return;
      submit.disabled = true;
      status.textContent = '';
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: input.value }),
        });
        if (response.ok) {
          screen.remove();
          resolve();
          return;
        }
        const code = ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        status.textContent = t(code === 'bad_code' ? 'invite.wrong' : code === 'rate_limited' ? 'invite.busy' : code === 'not_configured' ? 'invite.notReady' : 'invite.trouble');
      } catch {
        status.textContent = t('invite.trouble');
      }
      submit.disabled = false;
    });
  });
}
