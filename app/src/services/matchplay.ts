import { MatchScore } from '../models';

/**
 * Canonical 18-hole matchplay margins. A match ends as soon as the leading
 * margin exceeds the holes remaining; "1up"/"2up" are the only "went the
 * distance" results that are mathematically reachable (any bigger undecided
 * margin would already have clinched the match before the 18th hole). "9&8"
 * and "10&8" both land at 8 holes remaining because that's the earliest
 * point either margin is reachable — only 10 holes have been played.
 */
export const MATCH_SCORE_OPTIONS: MatchScore[] = [
  '1up', '2up', '2&1', '3&2', '4&3', '5&4', '6&5', '7&6', '8&7', '9&8', '10&8',
];
