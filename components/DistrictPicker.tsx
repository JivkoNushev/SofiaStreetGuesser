'use client';

import { Fragment } from 'react';
import { DISTRICTS } from '@/lib/modes';

interface Props {
  onSelect: (name: string) => void;
  onBack:   () => void;
}

export default function DistrictPicker({ onSelect, onBack }: Props) {
  const sorted = [...DISTRICTS].sort((a, b) => a.localeCompare(b, 'bg'));

  const sections: { letter: string; items: string[] }[] = [];
  let currentLetter = '';
  for (const d of sorted) {
    const letter = d[0].toUpperCase();
    if (letter !== currentLetter) {
      currentLetter = letter;
      sections.push({ letter, items: [] });
    }
    sections[sections.length - 1].items.push(d);
  }

  return (
    <div className="pickerScreen">
      <div className="districtHeader">
        <button className="btnBack" onClick={onBack}>← Back</button>
        <span className="districtTitle">Choose a District</span>
      </div>
      <div className="districtBody">
        <div className="districtGrid">
          {sections.map(({ letter, items }) => (
            <Fragment key={letter}>
              <div className="nbSection">{letter}</div>
              {items.map(d => (
                <button key={d} className="btnDistrict" onClick={() => onSelect(d)}>
                  {d}
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
