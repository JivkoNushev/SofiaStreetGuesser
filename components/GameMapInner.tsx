'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ST, TILE_URL, TILE_ATTRIBUTION } from '@/lib/constants';
import type { StreetInfo } from '@/lib/streetData';

export type StreetStatus = 'pending' | 'correct' | 'wrong';

interface Props {
  streetInfo:    StreetInfo;
  status:        Record<string, StreetStatus>;
  onClickStreet: (name: string) => void;
  revealTarget:  string | null;
}

export default function GameMapInner({ streetInfo, status, onClickStreet, revealTarget }: Props) {
  const mapRef          = useRef<L.Map | null>(null);
  const layersRef       = useRef<Record<string, L.Polyline>>({});
  const clickRef        = useRef(onClickStreet);
  const statusRef       = useRef(status);
  const prevStatusRef   = useRef<Record<string, StreetStatus>>({});
  const hoveredRef      = useRef<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep callbacks/state current without recreating polylines
  useEffect(() => { clickRef.current  = onClickStreet; });
  useEffect(() => { statusRef.current = status; });

  // initialize map once
  useEffect(() => {
    // No hardcoded center/zoom — fitBounds after polylines load positions the map.
    const map = L.map('ssg-map');
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // rebuild polylines when streetInfo changes (new game)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    hoveredRef.current = null;
    Object.values(layersRef.current).forEach(l => l.remove());
    layersRef.current = {};
    prevStatusRef.current = {};

    const setStreetHover = (name: string | null) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      const prev = hoveredRef.current;
      if (prev && prev !== name && statusRef.current[prev] === 'pending') {
        layersRef.current[prev]?.setStyle(ST.idle);
      }

      hoveredRef.current = name;

      if (name && statusRef.current[name] === 'pending') {
        layersRef.current[name]?.setStyle(ST.hover);
        map.getContainer().style.cursor = 'pointer';
      } else {
        map.getContainer().style.cursor = '';
      }
    };

    for (const name of Object.keys(streetInfo)) {
      const { coords } = streetInfo[name];
      if (coords.length === 0) continue;

      const pl = L.polyline(coords as [number, number][][], { ...ST.idle, interactive: true }).addTo(map);
      pl.on('mouseover', () => setStreetHover(name));
      pl.on('mouseout', () => {
        hoverTimeoutRef.current = setTimeout(() => setStreetHover(null), 10);
      });
      pl.on('click', (e) => { L.DomEvent.stopPropagation(e); clickRef.current(name); });
      layersRef.current[name] = pl;
    }

    // Fit to the loaded street geometry — works for any city, no hardcoded coordinates.
    const allLayers = Object.values(layersRef.current);
    if (allLayers.length > 0) {
      try {
        const bounds = L.featureGroup(allLayers).getBounds();
        if (bounds.isValid()) {
          const pad = window.innerWidth < 1000 ? [20, 20] : [40, 40];
          map.fitBounds(bounds, { padding: pad as [number, number] });
        }
      } catch {}
    }
  }, [streetInfo]);

  // update polyline styles when status changes
  useEffect(() => {
    for (const [name, s] of Object.entries(status)) {
      if (prevStatusRef.current[name] === s) continue;
      prevStatusRef.current[name] = s;
      const pl = layersRef.current[name];
      if (!pl) continue;

      if (s === 'correct') {
        pl.setStyle(ST.correct);
        pl.bindTooltip(name, { sticky: true, className: 'map-tip', direction: 'top', offset: [0, -4] });
      } else if (s === 'wrong') {
        pl.setStyle(ST.wrong);
        pl.bindTooltip(name, { sticky: true, className: 'map-tip', direction: 'top', offset: [0, -4] });
      }
    }
  }, [status]);

  // fly to revealed street when out of attempts
  useEffect(() => {
    if (!revealTarget) return;
    const map = mapRef.current;
    if (!map) return;
    const pl = layersRef.current[revealTarget];
    if (!pl) return;
    try {
      const bounds = pl.getBounds();
      const pad = window.innerWidth < 1000 ? [20, 20] : [80, 80];
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: pad as [number, number], duration: 1.3 });
    } catch {}
  }, [revealTarget]);

  return <div id="ssg-map" style={{ width: '100%', height: '100%' }} />;
}
