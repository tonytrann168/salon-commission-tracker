import pkg from '../package.json';
import type { Message } from './types';

/** Tester feedback (story 016): what the browser sends to /api/feedback. The server validates and logs it. */

export const APP_VERSION: string = pkg.version;

export interface FeedbackDetails {
  clientId?: string;
  difficulty?: string;
  level?: string;
  language?: string;
  stars?: number;
  appVersion?: string;
}

export interface FeedbackPost {
  rating: number;
  text: string;
  details?: FeedbackDetails;
  /** Only when the tester ticked "Include my conversation". */
  includeChat?: true;
  chat?: readonly Message[];
}

/** Build the post from the sheet's choices: details only when allowed, chat only when ticked. */
export function feedbackPost(rating: number, text: string, options: { details?: FeedbackDetails; includeDetails: boolean; chat?: readonly Message[]; includeChat: boolean }): FeedbackPost {
  return {
    rating,
    text: text.trim(),
    ...(options.includeDetails && options.details ? { details: { ...options.details, appVersion: APP_VERSION } } : {}),
    ...(options.includeChat && options.chat && options.chat.length > 0 ? { includeChat: true as const, chat: options.chat } : {}),
  };
}

export async function sendFeedback(post: FeedbackPost): Promise<'sent' | 'busy' | 'failed'> {
  try {
    const response = await fetch('/api/feedback', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(post) });
    return response.ok ? 'sent' : response.status === 429 ? 'busy' : 'failed';
  } catch {
    return 'failed';
  }
}
