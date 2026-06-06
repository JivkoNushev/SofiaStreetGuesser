'use client';

import { Fragment, useState } from 'react';
import { DISTRICTS } from '@/lib/modes';
import { normalise } from '@/lib/utils';

interface Props {
  onSelect: (name: string) => void;
  onBack:   () => void;
}

export default function DistrictPicker({ onSelect, onBack }: Props) {
  const [filter, setFilter] = useState('');

  const sorted = [...DISTRICTS].sort((a, b) => a.localeCompare(b, 'bg'));
  const q = normalise(filter);
  const matches = q ? sorted.filter(d => normalise(d).includes(q)) : sorted;

  const sections: { letter: string; items: string[] }[] = [];
  if (!q) {
    let currentLetter = '';
    for (const d of matches) {
      const letter = d[0].toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        sections.push({ letter, items: [] });
      }
      sections[sections.length - 1].items.push(d);
    }
  }

  return (
    <div className="pickerScreen">
      <div className="nbHeader">
        <div className="nbHeaderTop">
          <button className="btnBack" onClick={onBack}>← Back</button>
          <h2 className="nbTitle">Choose a District</h2>
        </div>
        <div className="nbSearchWrap">
          <span className="nbSearchIcon">🔍</span>
          <input
            className="neighbourhoodSearch"
            type="text"
            placeholder="Search districts…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="districtBody">
        <div className="districtGrid">
          {matches.length === 0 && (
            <p className="nbEmpty">No districts match your search.</p>
          )}
          {!q && sections.map(({ letter, items }) => (
            <Fragment key={letter}>
              <div className="nbSection">{letter}</div>
              {items.map(d => (
                <button key={d} className="btnDistrict" onClick={() => onSelect(d)}>
                  {d}
                </button>
              ))}
            </Fragment>
          ))}
          {q && matches.map(d => (
            <button key={d} className="btnDistrict" onClick={() => onSelect(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
