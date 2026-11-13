import type { Account, SyncOutcome } from '../account/account';
import type { CloudError, CloudResult } from '../account/cloud';
import { ACCOUNT_CONFIG, isCode, isEmail, isPassword, maskEmail } from '../account/sync';
import type { ProgressSummary } from '../account/sync';
import { companionName } from '../companion';
import { t } from '../i18n';
import type { StringKey } from '../i18n';
import { el } from './dom';
import './feedback.css';
import './account.css';

/**
 * Story 025: Settings → Your account, the sign-in sheet (sign in, create an account, confirm the email with a code,
 * forgot password with a code), the "which progress do you keep?" choice, and the companion's one-time suggestion.
 * Codes, not links: a link would open Safari instead of the home-screen app.
 */

const button = (label: string, className = 'chat-button secondary'): HTMLButtonElement => {
  const b = el('button', className, label);
  b.type = 'button';
  return b;
};

const errorText = (error: CloudError): string => t(`account.error.${error}` as StringKey);

/** Settings section: signed out → privacy note and "Sign in"; signed in → who, Sign out, Delete account. */
export function createAccountSection(host: HTMLElement, account: Account): HTMLElement {
  const section = el('section', 'account-section');
  const status = el('p', 'setting-note');
  status.setAttribute('aria-live', 'polite');
  const draw = (): void => {
    const title = el('h2', '', t('account.title'));
    const user = account.user;
    if (!user) {
      const open = button(t('account.open'), 'chat-button');
      open.addEventListener('click', () => openSignInSheet(host, account, { onDone: draw }));
      section.replaceChildren(title, el('p', 'setting-note', t('account.note')), open, status);
      return;
    }
    const signOut = button(t('account.signOut'));
    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      await account.signOut();
      status.textContent = t('account.signedOut');
      draw();
    });
    const del = button(t('account.delete'));
    const confirmBox = el('div', 'backup-confirm');
    confirmBox.hidden = true;
    const yes = button(t('account.deleteYes'), 'chat-button');
    const no = button(t('common.back'));
    confirmBox.append(el('p', 'results-note bad', t('account.deleteConfirm')), yes, no);
    del.addEventListener('click', () => {
      confirmBox.hidden = false;
      no.focus();
    });
    no.addEventListener('click', () => {
      confirmBox.hidden = true;
    });
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      const result = await account.deleteAccount();
      yes.disabled = false;
      if (!result.ok) {
        status.textContent = errorText(result.error);
        return;
      }
      status.textContent = t('account.deleted');
      draw();
    });
    section.replaceChildren(title, el('p', '', t('account.signedInAs', { email: user.email })), el('p', 'setting-note', t('account.syncNote')), signOut, del, confirmBox, status);
  };
  draw();
  return section;
}

type Mode = 'signIn' | 'signUp' | 'confirm' | 'forgot' | 'reset';

/** The sign-in sheet. `mode` picks where it opens (sign in by default). */
export function openSignInSheet(host: HTMLElement, account: Account, options: { mode?: Mode; onDone?: () => void } = {}): HTMLElement {
  const overlay = el('div', 'feedback-overlay');
  const sheet = el('section', 'feedback-sheet account-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'account-title');
  overlay.append(sheet);
  host.append(overlay);
  let email = account.memory().email;
  let timer = 0;
  const close = (): void => {
    window.clearInterval(timer);
    overlay.remove();
  };

  const field = (label: string, input: HTMLInputElement): HTMLElement => {
    const wrap = el('label', 'account-field');
    wrap.append(el('span', '', label), input);
    return wrap;
  };
  const emailInput = (): HTMLInputElement => {
    const input = el('input', 'help-input account-email');
    input.type = 'email';
    input.autocomplete = 'email';
    input.inputMode = 'email';
    input.value = email;
    input.addEventListener('input', () => (email = input.value.trim()));
    return input;
  };
  const passwordField = (label: string, autocomplete: 'current-password' | 'new-password'): { node: HTMLElement; input: HTMLInputElement } => {
    const input = el('input', 'help-input account-password-input');
    input.type = 'password';
    input.autocomplete = autocomplete;
    const eye = button('👁', 'account-eye');
    eye.setAttribute('aria-label', t('account.show'));
    eye.setAttribute('aria-pressed', 'false');
    eye.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      eye.setAttribute('aria-pressed', String(!showing));
      eye.setAttribute('aria-label', t(showing ? 'account.show' : 'account.hide'));
      eye.textContent = showing ? '👁' : '🙈';
    });
    const row = el('span', 'account-password');
    row.append(input, eye);
    const wrap = el('label', 'account-field');
    wrap.append(el('span', '', label), row, el('span', 'setting-note', t('account.passwordNote', { min: ACCOUNT_CONFIG.minPassword })));
    return { node: wrap, input };
  };
  const codeInput = (): HTMLInputElement => {
    const input = el('input', 'help-input account-code');
    input.inputMode = 'numeric';
    input.autocomplete = 'one-time-code';
    input.maxLength = 6;
    input.pattern = '[0-9]*';
    return input;
  };
  const link = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = button(label, 'account-link');
    b.addEventListener('click', onClick);
    return b;
  };
  /** "Send a new code" unlocks after resendSeconds. */
  const resendLink = (send: () => Promise<CloudResult<null>>, status: HTMLElement, wait = ACCOUNT_CONFIG.resendSeconds): HTMLButtonElement => {
    const b = button('', 'account-link account-resend');
    let left = wait;
    const tick = (): void => {
      b.disabled = left > 0;
      b.textContent = left > 0 ? t('account.resendIn', { seconds: left }) : t('account.resend');
      left -= 1;
      if (left < -1) window.clearInterval(timer);
    };
    window.clearInterval(timer);
    tick();
    if (wait > 0) timer = window.setInterval(tick, 1000);
    b.addEventListener('click', async () => {
      b.disabled = true;
      const result = await send();
      status.textContent = result.ok ? t('account.codeResent') : errorText(result.error);
      left = ACCOUNT_CONFIG.resendSeconds;
      window.clearInterval(timer);
      tick();
      timer = window.setInterval(tick, 1000);
    });
    return b;
  };
  const rememberRow = (): HTMLElement => {
    const row = el('label', 'account-remember');
    const box = el('input', 'account-remember-box');
    box.type = 'checkbox';
    box.checked = account.memory().remember;
    box.addEventListener('change', () => account.setRemember(box.checked));
    const text = el('span', 'setting-text');
    text.append(el('strong', '', t('account.remember')), el('span', 'setting-note', t('account.rememberNote')));
    row.append(box, text);
    return row;
  };
  const finish = (outcome: SyncOutcome): void => {
    close();
    options.onDone?.();
    showSyncOutcome(host, outcome);
  };
  /** Run a step with the main button busy; show friendly errors. */
  const busy = async <T>(main: HTMLButtonElement, status: HTMLElement, run: () => Promise<CloudResult<T>>, ok: (value: T) => void, onError?: (error: CloudError) => boolean): Promise<void> => {
    main.disabled = true;
    status.textContent = '';
    let result: CloudResult<T>;
    try {
      result = await run();
    } catch {
      result = { ok: false, error: 'network' };
    }
    main.disabled = false;
    if (result.ok) ok(result.value);
    else if (!onError?.(result.error)) status.textContent = errorText(result.error);
  };

  const show = (mode: Mode, wait = ACCOUNT_CONFIG.resendSeconds): void => {
    window.clearInterval(timer);
    const title = el('h2', '', t(`account.${mode}Title` as StringKey));
    title.id = 'account-title';
    const status = el('p', 'setting-note feedback-status');
    status.setAttribute('role', 'alert');
    const cancel = button(t('common.back'));
    cancel.addEventListener('click', close);
    const actions = el('div', 'feedback-actions');
    const body: HTMLElement[] = [];
    const check = (good: boolean, key: StringKey, input: HTMLInputElement): boolean => {
      if (good) return true;
      status.textContent = t(key, { min: ACCOUNT_CONFIG.minPassword });
      input.focus();
      return false;
    };

    if (mode === 'signIn' || mode === 'signUp') {
      const mail = emailInput();
      const pass = passwordField(t('account.password'), mode === 'signIn' ? 'current-password' : 'new-password');
      const main = button(t(mode === 'signIn' ? 'account.signIn' : 'account.signUp'), 'chat-button');
      main.addEventListener('click', () => {
        if (!check(isEmail(mail.value), 'account.badEmail', mail) || !check(isPassword(pass.input.value), 'account.shortPassword', pass.input)) return;
        email = mail.value.trim();
        if (mode === 'signIn') {
          void busy(main, status, () => account.signIn(email, pass.input.value), finish, (error) => {
            if (error !== 'not_confirmed') return false;
            show('confirm', 0);
            sheet.querySelector('.feedback-status')!.textContent = errorText('not_confirmed');
            return true;
          });
        } else {
          void busy(main, status, () => account.signUp(email, pass.input.value), () => show('confirm'));
        }
      });
      const hint = el('p', 'setting-note account-hint');
      hint.setAttribute('aria-live', 'polite');
      const links = el('div', 'account-links');
      if (mode === 'signIn') {
        links.append(
          link(t('account.toSignUp'), () => show('signUp')),
          link(t('account.forgot'), () => show('forgot')),
          link(t('account.whichEmail'), () => {
            const saved = account.memory().email;
            hint.textContent = saved ? t('account.emailHint', { email: maskEmail(saved) }) : t('account.noEmailHint');
          }),
        );
      } else {
        links.append(link(t('account.toSignIn'), () => show('signIn')));
      }
      body.push(el('p', 'setting-note', t('account.note')), field(t('account.email'), mail), pass.node, rememberRow(), links, hint);
      actions.append(cancel, main);
      requestAnimationFrame(() => (mail.value ? pass.input : mail).focus());
    } else if (mode === 'confirm') {
      const code = codeInput();
      const main = button(t('account.confirm'), 'chat-button');
      main.addEventListener('click', () => {
        if (!check(isCode(code.value), 'account.badCode', code)) return;
        void busy(main, status, () => account.confirmSignUp(email, code.value), finish);
      });
      body.push(el('p', '', t('account.codeSent', { email })), field(t('account.code'), code), resendLink(() => account.resendSignUpCode(email), status, wait));
      actions.append(cancel, main);
      requestAnimationFrame(() => code.focus());
    } else if (mode === 'forgot') {
      const mail = emailInput();
      const main = button(t('account.sendCode'), 'chat-button');
      main.addEventListener('click', () => {
        if (!check(isEmail(mail.value), 'account.badEmail', mail)) return;
        email = mail.value.trim();
        void busy(main, status, () => account.sendRecoveryCode(email), () => show('reset'));
      });
      body.push(el('p', 'setting-note', t('account.forgotNote')), field(t('account.email'), mail), link(t('account.toSignIn'), () => show('signIn')));
      actions.append(cancel, main);
      requestAnimationFrame(() => mail.focus());
    } else {
      const code = codeInput();
      const pass = passwordField(t('account.newPassword'), 'new-password');
      const main = button(t('account.setPassword'), 'chat-button');
      main.addEventListener('click', () => {
        if (!check(isCode(code.value), 'account.badCode', code) || !check(isPassword(pass.input.value), 'account.shortPassword', pass.input)) return;
        void busy(main, status, () => account.resetPassword(email, code.value, pass.input.value), finish);
      });
      body.push(el('p', '', t('account.codeSent', { email })), field(t('account.code'), code), pass.node, resendLink(() => account.sendRecoveryCode(email), status, wait));
      actions.append(cancel, main);
      requestAnimationFrame(() => code.focus());
    }
    sheet.replaceChildren(title, ...body, status, actions);
  };
  show(options.mode ?? 'signIn');
  return overlay;
}

const summaryText = (s: ProgressSummary): string => t('account.summary', { appointments: s.appointments, xp: s.xp, tips: s.tips });

/** After signing in (or at start): a short note, or the "which progress do you keep?" choice. */
export function showSyncOutcome(host: HTMLElement, outcome: SyncOutcome): void {
  if (outcome.kind === 'ok') return;
  if (outcome.kind === 'error') {
    const note = el('p', 'app-note', t('account.syncError'));
    note.setAttribute('role', 'status');
    host.append(note);
    window.setTimeout(() => note.remove(), 4000);
    return;
  }
  const overlay = el('div', 'feedback-overlay');
  const sheet = el('section', 'feedback-sheet account-keep-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'keep-title');
  const title = el('h2', '', t('account.keepTitle'));
  title.id = 'keep-title';
  const choice = (label: string, s: ProgressSummary, run: () => void): HTMLButtonElement => {
    const b = button('', 'chat-button secondary');
    b.append(el('strong', '', label), el('small', '', summaryText(s)));
    b.addEventListener('click', run);
    return b;
  };
  const status = el('p', 'setting-note feedback-status');
  status.setAttribute('role', 'alert');
  const keep = el('div', 'account-keep');
  keep.append(
    choice(t('account.keepDevice'), outcome.device, async () => {
      const ok = await outcome.keepDevice();
      if (ok) overlay.remove();
      else status.textContent = t('account.syncError');
    }),
    choice(t('account.keepCloud'), outcome.cloud, () => outcome.keepCloud()),
  );
  sheet.append(title, el('p', 'setting-note', t('account.keepNote')), keep, el('p', 'results-note bad', t('account.keepWarning')), status);
  overlay.append(sheet);
  host.append(overlay);
}

/** The companion's one-time suggestion on the title, after a few appointments, while signed out. */
export function accountNudge(host: HTMLElement, account: Account, appointments: number): HTMLElement | null {
  const memory = account.memory();
  if (account.user || memory.nudged || appointments < ACCOUNT_CONFIG.nudgeAfterAppointments) return null;
  account.markNudged();
  const box = el('div', 'bestie-bubble account-nudge');
  box.setAttribute('role', 'status');
  const later = button(t('account.nudgeLater'));
  const go = button(t('account.nudgeGo'), 'chat-button');
  later.addEventListener('click', () => box.remove());
  go.addEventListener('click', () => {
    box.remove();
    openSignInSheet(host, account, { mode: 'signUp' });
  });
  const actions = el('div', 'feedback-actions');
  actions.append(later, go);
  box.append(el('p', '', t('account.nudge', { name: companionName() })), actions);
  return box;
}
