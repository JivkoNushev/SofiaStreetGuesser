import type { HighwayType } from './constants';

export const BOULEVARD_RE = /^(бул[.\s]|булевард|boulevard|bul[.\s])/i;

export interface ModeConfig {
  label:       string;
  highways:    Set<HighwayType>;
  nameFilter?: (name: string) => boolean;
  max:         number;
}

export const MODES: Record<string, ModeConfig> = {
  easy: {
    label:      'Easy',
    highways:   new Set(['trunk', 'primary', 'secondary', 'tertiary', 'residential']),
    nameFilter: (name: string) => BOULEVARD_RE.test(name),
    max:        25,
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

export const DISTRICTS = [
  'Банкя', 'Витоша', 'Връбница', 'Възраждане', 'Изгрев',
  'Илинден', 'Искър', 'Красна поляна', 'Красно село', 'Кремиковци',
  'Лозенец', 'Люлин', 'Младост', 'Надежда', 'Нови Искър',
  'Оборище', 'Овча купел', 'Панчарево', 'Подуяне', 'Сердика',
  'Слатина', 'Средец', 'Студентски', 'Триадица',
];
