import { T20_RULES, type MatchRules } from '@score-masterz/scoring';

/** Sample fixture used until screens are wired to Supabase. */
export const demoRules: MatchRules = T20_RULES;

export const demoMatch = {
  title: 'Riverside XI vs Northfield CC',
  battingTeam: 'Riverside XI',
  bowlingTeam: 'Northfield CC',
  firstInningsRuns: 158,
  firstInningsWickets: 7,
};

export const battingOrder = [
  { id: 'rx-1', name: 'A. Sharma' },
  { id: 'rx-2', name: 'K. Mensah' },
  { id: 'rx-3', name: 'D. Kaur' },
  { id: 'rx-4', name: 'L. Brooks' },
  { id: 'rx-5', name: 'O. Bennett' },
  { id: 'rx-6', name: 'F. Ali' },
  { id: 'rx-7', name: 'T. Moore' },
  { id: 'rx-8', name: 'G. Lewis' },
  { id: 'rx-9', name: 'N. Owusu' },
  { id: 'rx-10', name: 'C. Grant' },
  { id: 'rx-11', name: 'B. Hale' },
];

export const bowlingSquad = [
  { id: 'nf-1', name: 'H. Nguyen' },
  { id: 'nf-2', name: 'E. Ward' },
  { id: 'nf-3', name: 'V. Costa' },
  { id: 'nf-4', name: 'S. Ahmed' },
  { id: 'nf-5', name: 'J. Diaz' },
  { id: 'nf-11', name: 'R. Patel' },
];

