'use client';

import { CITIES } from '@/lib/cities';

interface Props {
  city:     string;
  onSelect: (city: string) => void;
}

const cityList = Object.values(CITIES);

export default function CitySwitcher({ city, onSelect }: Props) {
  const active = CITIES[city];

  // Single city: render a static pill with no interaction.
  if (cityList.length <= 1) {
    return (
      <div className="cityPill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        {active?.displayName ?? city}
      </div>
    );
  }

  // Multiple cities: dropdown.
  return (
    <div className="citySwitcher">
      <svg className="citySwitcherPin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      <select
        className="citySwitcherSelect"
        value={city}
        onChange={e => onSelect(e.target.value)}
        aria-label="Switch city"
      >
        {cityList.map(c => (
          <option key={c.id} value={c.id}>{c.displayName}</option>
        ))}
      </select>
    </div>
  );
}
