'use client';

import { Fragment, useState, useEffect } from 'react';
import { normalise } from '@/lib/utils';

interface Props {
  city:     string;
  onSelect: (name: string) => void;
  onBack:   () => void;
}

export default function NeighbourhoodPicker({ city, onSelect, onBack }: Props) {
  const [list,    setList]    = useState<string[] | null>(null);
  const [filter,  setFilter]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setList(null);
    fetch(`/api/neighbourhoods?city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(data => setList(data.neighbourhoods ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [city]);

  const q = normalise(filter);
  const matches = list ? (q ? list.filter(n => normalise(n).includes(q)) : list) : [];

  const sections: { letter: string; items: string[] }[] = [];
  if (!q) {
    let currentLetter = '';
    for (const n of matches) {
      const letter = n[0]?.toUpperCase() ?? '#';
      if (letter !== currentLetter) {
        currentLetter = letter;
        sections.push({ letter, items: [] });
      }
      sections[sections.length - 1].items.push(n);
    }
  }

  return (
    <div className="pickerScreen">
      <div className="nbHeader">
        <div className="nbHeaderTop">
          <button className="btnBack" onClick={onBack}>← Back</button>
          <h2 className="nbTitle">Choose a Neighbourhood</h2>
        </div>
        <div className="nbSearchWrap">
          <span className="nbSearchIcon">🔍</span>
          <input
            className="neighbourhoodSearch"
            type="text"
            placeholder="Search neighbourhoods…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="nbBody">
        <div className="nbGrid">
          {loading && (
            <p className="nbEmpty">Loading neighbourhood list…</p>
          )}
          {!loading && list !== null && matches.length === 0 && (
            <p className="nbEmpty">No neighbourhoods match your search.</p>
          )}
          {!loading && !q && sections.map(({ letter, items }) => (
            <Fragment key={letter}>
              <div className="nbSection">{letter}</div>
              {items.map(n => (
                <button key={n} className="btnNb" onClick={() => onSelect(n)}>{n}</button>
              ))}
            </Fragment>
          ))}
          {!loading && q && matches.map(n => (
            <button key={n} className="btnNb" onClick={() => onSelect(n)}>{n}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
