'use client';

import dynamic from 'next/dynamic';
import type { StreetStatus } from './GameMapInner';
import type { StreetInfo } from '@/lib/streetData';

const GameMapInner = dynamic(() => import('./GameMapInner'), { ssr: false });

interface Props {
  streetInfo:    StreetInfo;
  status:        Record<string, StreetStatus>;
  onClickStreet: (name: string) => void;
  revealTarget:  string | null;
}

export default function GameMap(props: Props) {
  return <GameMapInner {...props} />;
}

export type { StreetStatus };
