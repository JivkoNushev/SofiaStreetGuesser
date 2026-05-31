'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CFG, ST, TILE_URL, TILE_ATTRIBUTION } from '@/lib/constants';
import type { StreetInfo } from '@/lib/streetData';

export type StreetStatus = 'pending' | 'correct' | 'wrong';

interface Props {
  streetInfo:    StreetInfo;
  status:        Record<string, StreetStatus>;
  onClickStreet: (name: string) => void;
  revealTarget:  string | null;
}

export default function GameMapInner({ streetInfo, status, onClickStreet, revealTarget }: Props) {
  const mapRef        = useRef<L.Map | null>(null);
  const layersRef     = useRef<Record<string, L.Polyline[]>>({});
  const clickRef      = useRef(onClickStreet);
  const statusRef     = useRef(status);
  const prevStatusRef = useRef<Record<string, StreetStatus>>({});

  // keep callbacks/state current without recreating polylines
  useEffect(() => { clickRef.current  = onClickStreet; });
  useEffect(() => { statusRef.current = status; });

  // initialize map once
  useEffect(() => {
    const map = L.map('ssg-map', { center: CFG.center, zoom: CFG.zoom });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // rebuild polylines when streetInfo changes (new game)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // remove existing polylines
    Object.values(layersRef.current).flat().forEach(l => l.remove());
    layersRef.current = {};
    prevStatusRef.current = {};

    for (const name of Object.keys(streetInfo)) {
      layersRef.current[name] = [];
      for (const coords of streetInfo[name].coords) {
        const pl = L.polyline(coords as [number, number][], { ...ST.idle, interactive: true }).addTo(map);
        pl.on('mouseover', () => {
          if (statusRef.current[name] === 'pending') {
            pl.setStyle(ST.hover);
            map.getContainer().style.cursor = 'pointer';
          }
        });
        pl.on('mouseout', () => {
          map.getContainer().style.cursor = '';
          if (statusRef.current[name] === 'pending') pl.setStyle(ST.idle);
        });
        pl.on('click', (e) => { L.DomEvent.stopPropagation(e); clickRef.current(name); });
        layersRef.current[name].push(pl);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetInfo]);

  // update polyline styles when status changes
  useEffect(() => {
    for (const [name, s] of Object.entries(status)) {
      if (prevStatusRef.current[name] === s) continue;
      prevStatusRef.current[name] = s;
      const pls = layersRef.current[name] ?? [];
      if (s === 'correct') {
        pls.forEach(pl => {
          pl.setStyle(ST.correct);
          pl.bindTooltip(name, { sticky: true, className: 'map-tip', direction: 'top', offset: [0, -4] });
        });
      } else if (s === 'wrong') {
        pls.forEach(pl => {
          pl.setStyle(ST.wrong);
          pl.bindTooltip(name, { sticky: true, className: 'map-tip', direction: 'top', offset: [0, -4] });
        });
      }
    }
  }, [status]);

  // flash wrong guess on a pending street
  useEffect(() => {
    // handled via external flash signal — see GameCanvas
  }, []);

  // fly to revealed street when out of attempts
  useEffect(() => {
    if (!revealTarget) return;
    const map = mapRef.current;
    if (!map) return;
    const pls = layersRef.current[revealTarget] ?? [];
    if (pls.length === 0) return;
    try {
      const bounds = L.featureGroup(pls).getBounds();
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [80, 80], duration: 1.3 });
    } catch {}
  }, [revealTarget]);

  return <div id="ssg-map" style={{ width: '100%', height: '100%' }} />;
}
