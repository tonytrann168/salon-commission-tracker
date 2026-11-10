import type { ClientPersona } from '../types';

/** The one hard-coded medium-difficulty client for story 001. Story 006 makes the roster data-driven. */
export const DEFAULT_CLIENT: ClientPersona = {
  id: 'dana',
  name: 'Dana',
  portraitId: 'dana',
  wants:
    'A neat, natural-looking gel manicure in a soft nude or pale pink, short square nails, for a work event on Friday. She has a firm budget of about $45 and a strict 45 minutes.',
  personality:
    'Polite but guarded and a little picky. She has been disappointed by rushed salons before, dislikes pushy upselling, and warms up when the stylist listens, asks good questions and is honest about price and timing. She gets cooler when ignored, rushed or talked over.',
  startingMood: 45,
  openingLine: "Hi. I booked a manicure for 3 o'clock. I'm kind of short on time, so I hope we can get started soon.",
  // Matches `wants`: short square nails, soft nude or pale pink, nothing flashy.
  nailRequest: { shapes: ['square'], colors: ['nude', 'pale-pink'], gradient: 'no', gems: 'none', stickers: 'none' },
};
