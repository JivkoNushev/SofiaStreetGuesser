import type { HighwayType } from './constants';

export interface ModeConfig {
  label:    string;
  highways: Set<HighwayType>;
  max:      number;
}

export const MODES: Record<string, ModeConfig> = {
  easy: {
    label:    'Easy',
    highways: new Set(['trunk', 'primary', 'secondary', 'tertiary', 'residential']),
    max:      25,
  },
  normal: {
    label:    'Normal',
    highways: new Set(['trunk', 'primary', 'secondary']),
    max:      50,
  },
  hard: {
    label:    'Hard',
    highways: new Set(['trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street']),
    max:      150,
  },
};

export const VALID_MODES = new Set([...Object.keys(MODES), 'district', 'neighbourhood']);
