export const CFG = {
  center:      [42.6977, 23.3219] as [number, number],
  zoom:        13,
  maxAttempts: 3,
};

export const HIERARCHY = [
  'trunk', 'primary', 'secondary', 'tertiary',
  'residential', 'unclassified', 'living_street',
] as const;

export type HighwayType = typeof HIERARCHY[number];

export const ST = {
  idle:    { color: '#4338ca', weight: 4, opacity: 0.55 },
  hover:   { color: '#7c3aed', weight: 6, opacity: 1 },
  correct: { color: '#16a34a', weight: 5, opacity: 1 },
  wrong:   { color: '#dc2626', weight: 5, opacity: 1 },
  flash:   { color: '#dc2626', weight: 4, opacity: 0.8 },
} as const;

export const OVERPASS = 'https://overpass-api.de/api/interpreter';

export const MAIN_QUERY = `[out:json][timeout:60];
(way["highway"~"^(trunk|primary|secondary|tertiary|residential)$"]["name"](42.63,23.25,42.74,23.43););
out geom;`;

export const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';

export const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';
