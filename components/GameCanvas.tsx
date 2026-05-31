'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import GameMap, { StreetStatus } from './GameMap';
import EndScreen from './EndScreen';
import DistrictPicker from './DistrictPicker';
import NeighbourhoodPicker from './NeighbourhoodPicker';
import { CFG } from '@/lib/constants';
import { MODES } from '@/lib/modes';
import { shuffle, fmt } from '@/lib/utils';
import type { StreetInfo } from '@/lib/streetData';

type Phase = 'loading' | 'mode-select' | 'district-picker' | 'neighbourhood-picker' | 'playing' | 'ended';

interface GameState {
  phase:       Phase;
  mode:        string;
  submode:     string | null;
  streetInfo:  StreetInfo;
  names:       string[];
  idx:         number;
  attempts:    number;
  correct:     number;
  wrong:       number;
  skipped:     number;
  status:      Record<string, StreetStatus>;
  blocked:     boolean;
  revealTarget: string | null;
  loadingMsg:  string;
  loadingErr:  string;
}

type Action =
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'LOAD_MSG'; msg: string }
  | { type: 'LOAD_ERR'; err: string }
  | { type: 'BEGIN_GAME'; streetInfo: StreetInfo; names: string[]; mode: string; submode: string | null }
  | { type: 'CORRECT'; name: string }
  | { type: 'WRONG'; name: string; newAttempts: number }
  | { type: 'REVEAL'; name: string }
  | { type: 'ADVANCE' }
  | { type: 'SKIP' }
  | { type: 'END' };

function init(): GameState {
  return {
    phase: 'loading',
    mode: 'easy',
    submode: null,
    streetInfo: {},
    names: [],
    idx: 0,
    attempts: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    status: {},
    blocked: false,
    revealTarget: null,
    loadingMsg: 'Fetching street data from OpenStreetMap…',
    loadingErr: '',
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'LOAD_MSG':
      return { ...state, loadingMsg: action.msg, loadingErr: '' };

    case 'LOAD_ERR':
      return { ...state, loadingErr: action.err };

    case 'BEGIN_GAME': {
      const status: Record<string, StreetStatus> = {};
      for (const n of action.names) status[n] = 'pending';
      return {
        ...state,
        phase: 'playing',
        mode: action.mode,
        submode: action.submode,
        streetInfo: action.streetInfo,
        names: action.names,
        idx: 0,
        attempts: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        status,
        blocked: false,
        revealTarget: null,
      };
    }

    case 'CORRECT': {
      const newStatus = { ...state.status, [action.name]: 'correct' as StreetStatus };
      return { ...state, status: newStatus, correct: state.correct + 1, blocked: true, idx: state.idx + 1 };
    }

    case 'WRONG': {
      return { ...state, attempts: action.newAttempts };
    }

    case 'REVEAL': {
      const newStatus = { ...state.status, [action.name]: 'wrong' as StreetStatus };
      return {
        ...state,
        status: newStatus,
        wrong: state.wrong + 1,
        blocked: true,
        idx: state.idx + 1,
        revealTarget: action.name,
      };
    }

    case 'ADVANCE':
      return {
        ...state,
        blocked: false,
        attempts: 0,
        revealTarget: null,
        phase: state.idx >= state.names.length ? 'ended' : state.phase,
      };

    case 'SKIP': {
      if (state.blocked || state.names.length - state.idx <= 1) return state;
      const names = [...state.names];
      const skipped = names.splice(state.idx, 1)[0];
      names.push(skipped);
      return { ...state, names, skipped: state.skipped + 1, attempts: 0 };
    }

    case 'END':
      return { ...state, phase: 'ended' };

    default:
      return state;
  }
}

let mainStreetInfo: StreetInfo | null = null;

export default function GameCanvas() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const [toast, setToast] = useState<{ msg: string; kind: 'c' | 'w'; key: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0Ref     = useRef<number>(0);

  const showToast = useCallback((msg: string, kind: 'c' | 'w') => {
    setToast({ msg, kind, key: Date.now() });
  }, []);

  // Load main street data on mount
  useEffect(() => {
    if (mainStreetInfo) {
      dispatch({ type: 'SET_PHASE', phase: 'mode-select' });
      return;
    }
    (async () => {
      dispatch({ type: 'LOAD_MSG', msg: 'Fetching street data from OpenStreetMap…' });
      try {
        const res = await fetch('/api/streets?mode=main');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        mainStreetInfo = json.streets;
        dispatch({ type: 'SET_PHASE', phase: 'mode-select' });
      } catch (err: unknown) {
        dispatch({ type: 'LOAD_ERR', err: `Error: ${err instanceof Error ? err.message : 'Network error'}` });
      }
    })();
  }, []);

  // Timer
  useEffect(() => {
    if (state.phase === 'playing') {
      t0Ref.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(Date.now() - t0Ref.current), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.phase, state.names]);

  // advance check — when idx reaches names.length, end the game
  useEffect(() => {
    if (state.phase === 'playing' && state.idx >= state.names.length && state.names.length > 0) {
      dispatch({ type: 'END' });
    }
  }, [state.idx, state.names.length, state.phase]);

  const startMode = useCallback((mode: string) => {
    if (!mainStreetInfo) return;
    const cfg  = MODES[mode];
    const all  = Object.entries(mainStreetInfo)
      .filter(([n, info]) => cfg.highways.has(info.bestHighway as never) && (!cfg.nameFilter || cfg.nameFilter(n)));
    const names = shuffle(all.map(([n]) => n)).slice(0, cfg.max);
    // only pass the selected streets to the map — not all of mainStreetInfo
    const selectedStreetInfo: StreetInfo = {};
    for (const name of names) selectedStreetInfo[name] = mainStreetInfo[name];
    dispatch({ type: 'BEGIN_GAME', streetInfo: selectedStreetInfo, names, mode, submode: null });
  }, []);

  const startDistrictMode = useCallback(async (districtName: string) => {
    dispatch({ type: 'SET_PHASE', phase: 'loading' });
    dispatch({ type: 'LOAD_MSG', msg: `Fetching streets in ${districtName}…` });
    try {
      const res = await fetch(`/api/streets?mode=district&name=${encodeURIComponent(districtName)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { streets } = await res.json();
      const names = shuffle(Object.keys(streets));
      dispatch({ type: 'BEGIN_GAME', streetInfo: streets, names, mode: 'district', submode: districtName });
    } catch {
      dispatch({ type: 'LOAD_ERR', err: `Could not load "${districtName}" — please try again` });
      setTimeout(() => dispatch({ type: 'SET_PHASE', phase: 'district-picker' }), 2000);
    }
  }, []);

  const startNeighbourhoodMode = useCallback(async (name: string) => {
    dispatch({ type: 'SET_PHASE', phase: 'loading' });
    dispatch({ type: 'LOAD_MSG', msg: `Fetching streets in ${name}…` });
    try {
      const res = await fetch(`/api/streets?mode=neighbourhood&name=${encodeURIComponent(name)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('No streets found');
        throw new Error(`HTTP ${res.status}`);
      }
      const { streets } = await res.json();
      const names = shuffle(Object.keys(streets));
      dispatch({ type: 'BEGIN_GAME', streetInfo: streets, names, mode: 'neighbourhood', submode: name });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      dispatch({ type: 'LOAD_ERR', err: msg === 'No streets found' ? `No streets found in ${name}` : `Could not load "${name}"` });
      setTimeout(() => dispatch({ type: 'SET_PHASE', phase: 'neighbourhood-picker' }), 2000);
    }
  }, []);

  const handleClickStreet = useCallback((name: string) => {
    if (state.blocked || state.idx >= state.names.length) return;
    const target = state.names[state.idx];

    if (name === target) {
      dispatch({ type: 'CORRECT', name });
      showToast('✓  Correct!', 'c');
      setTimeout(() => dispatch({ type: 'ADVANCE' }), 750);
    } else {
      const newAttempts = state.attempts + 1;
      dispatch({ type: 'WRONG', name, newAttempts });

      // flash the clicked wrong polyline — just a visual, handled by a temp status trick
      if (newAttempts >= CFG.maxAttempts) {
        dispatch({ type: 'REVEAL', name: target });
        showToast('✗  Time\'s up — revealing street', 'w');
        setTimeout(() => dispatch({ type: 'ADVANCE' }), 2700);
      } else {
        const left = CFG.maxAttempts - newAttempts;
        showToast(`✗  Wrong!  ${left} attempt${left > 1 ? 's' : ''} left`, 'w');
      }
    }
  }, [state.blocked, state.idx, state.names, state.attempts, showToast]);

  const handleSkip = useCallback(() => {
    if (state.blocked || state.names.length - state.idx <= 1) return;
    dispatch({ type: 'SKIP' });
  }, [state.blocked, state.idx, state.names.length]);

  const modeLabel = state.mode === 'district' || state.mode === 'neighbourhood'
    ? (state.submode ?? state.mode)
    : (MODES[state.mode]?.label ?? state.mode);

  const accuracy = state.names.length > 0
    ? Math.round((state.correct / state.names.length) * 100)
    : 0;

  if (state.phase === 'loading') {
    return (
      <div className="loadingScreen">
        <div className="loadingInner">
          <span className="loadingIcon">🗺️</span>
          <h1>Sofia Street Guesser</h1>
          <p className="loadingSub">How well do you know the streets of Sofia?</p>
          {state.loadingErr ? (
            <p className="loadingStatus" style={{ color: '#f87171' }}>{state.loadingErr}</p>
          ) : (
            <>
              <div className="spinner" />
              <p className="loadingStatus">{state.loadingMsg}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'mode-select') {
    const info = mainStreetInfo ?? {};
    const counts = { easy: 0, normal: 0, hard: 0 };
    for (const [n, { bestHighway }] of Object.entries(info)) {
      for (const [mode, cfg] of Object.entries(MODES)) {
        if (cfg.highways.has(bestHighway as never) && (!cfg.nameFilter || cfg.nameFilter(n))) {
          counts[mode as keyof typeof counts]++;
        }
      }
    }
    return (
      <div className="modeScreen">
        <div className="modeInner">
          <span className="modeLogo">🗺️</span>
          <h1>Sofia Street Guesser</h1>
          <p className="modeSub">How well do you know the streets of Sofia?</p>
          <div className="modeCards">
            <button className="modeCard cardEasy" onClick={() => startMode('easy')}>
              <span className="modeBadge badgeEasy">Easy</span>
              <span className="modeCardIcon">🌱</span>
              <div className="modeCardName">Easy</div>
              <div className="modeCardDesc">Major boulevards only</div>
              <span className="modeCardCount">{Math.min(counts.easy, MODES.easy.max)} streets</span>
            </button>
            <button className="modeCard cardNormal" onClick={() => startMode('normal')}>
              <span className="modeBadge badgeNormal">Normal</span>
              <span className="modeCardIcon">🏙️</span>
              <div className="modeCardName">Normal</div>
              <div className="modeCardDesc">Major & secondary roads</div>
              <span className="modeCardCount">{Math.min(counts.normal, MODES.normal.max)} streets</span>
            </button>
            <button className="modeCard cardHard" onClick={() => startMode('hard')}>
              <span className="modeBadge badgeHard">Hard</span>
              <span className="modeCardIcon">🔥</span>
              <div className="modeCardName">Hard</div>
              <div className="modeCardDesc">All named streets</div>
              <span className="modeCardCount">{Math.min(counts.hard, MODES.hard.max)} streets</span>
            </button>
            <button
              className="modeCard cardDistrict"
              onClick={() => dispatch({ type: 'SET_PHASE', phase: 'district-picker' })}
            >
              <span className="modeBadge badgeDistrict">District</span>
              <span className="modeCardIcon">🏛️</span>
              <div className="modeCardName">District</div>
              <div className="modeCardDesc">All streets in one district</div>
              <span className="modeCardCount">24 districts</span>
            </button>
            <button
              className="modeCard cardNeighbourhood"
              onClick={() => dispatch({ type: 'SET_PHASE', phase: 'neighbourhood-picker' })}
            >
              <span className="modeBadge badgeNeighbourhood">Neighbourhood</span>
              <span className="modeCardIcon">🏘️</span>
              <div className="modeCardName">Neighbourhood</div>
              <div className="modeCardDesc">All streets in one neighbourhood</div>
              <span className="modeCardCount">100+ neighbourhoods</span>
            </button>
          </div>
          <div className="modePrivacy">
            <Link href="/privacy">Privacy Policy</Link>
            {' · '}
            <Link href="/leaderboard">Leaderboard</Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'district-picker') {
    return (
      <DistrictPicker
        onSelect={startDistrictMode}
        onBack={() => dispatch({ type: 'SET_PHASE', phase: 'mode-select' })}
      />
    );
  }

  if (state.phase === 'neighbourhood-picker') {
    return (
      <NeighbourhoodPicker
        onSelect={startNeighbourhoodMode}
        onBack={() => dispatch({ type: 'SET_PHASE', phase: 'mode-select' })}
      />
    );
  }

  const currentName = state.names[state.idx] ?? '';
  const isSkipDisabled = state.names.length - state.idx <= 1 || state.blocked;

  return (
    <div className="gameScreen">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="titleRow">
            <span className="gameTitle">Sofia Street Guesser</span>
            <span className={`modePill ${state.mode}`}>{modeLabel}</span>
          </div>
          <div className="hud">
            <div className="hudCell">
              <span className="hudLabel">Time</span>
              <span className="hudVal mono">{fmt(elapsed)}</span>
            </div>
            <div className="hudSep" />
            <div className="hudCell">
              <span className="hudLabel">Correct</span>
              <span className="hudVal correctCol">{state.correct}</span>
            </div>
            <div className="hudSep" />
            <div className="hudCell">
              <span className="hudLabel">Wrong</span>
              <span className="hudVal wrongCol">{state.wrong}</span>
            </div>
          </div>
          <button className="btnQuit" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'mode-select' })}>
            ← Quit
          </button>
          <button className="btnRestart" onClick={() => {
            if (state.mode === 'district') startDistrictMode(state.submode!);
            else if (state.mode === 'neighbourhood') startNeighbourhoodMode(state.submode!);
            else startMode(state.mode);
          }}>
            ↺ Restart
          </button>
        </div>

        {/* Target */}
        <div className="targetSection">
          <div className="targetEyebrow">Find this street</div>
          <div className="targetName">{currentName}</div>
          <div className="attemptsRow">
            <span className="attLabel">Attempts:</span>
            {Array.from({ length: CFG.maxAttempts }, (_, i) => (
              <span key={i} className={`dot${i < state.attempts ? ' used' : ''}`} />
            ))}
          </div>
          <button className="btnSkip" onClick={handleSkip} disabled={isSkipDisabled}>
            Skip →
          </button>
        </div>

        {/* Progress */}
        <div className="progSection">
          <div className="progInfo">
            <span>{state.idx} / {state.names.length}</span>
            <span>{accuracy}% accurate</span>
          </div>
          <div className="progTrack">
            <div
              className="progFill"
              style={{ width: state.names.length ? `${(state.idx / state.names.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Street list */}
        <div className="listSection">
          <div className="listHdr">Streets</div>
          <div className="streetList">
            {state.names.map((name, i) => {
              let cls = 'si future';
              if (i < state.idx) cls = `si ${state.status[name] === 'correct' ? 'correct' : 'wrong'}`;
              else if (i === state.idx) cls = 'si current';
              return (
                <div key={name} className={cls} id={`si-${i}`}>
                  {i <= state.idx ? name : '?'}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Map */}
      <div className="mapWrap">
        <GameMap
          streetInfo={state.streetInfo}
          status={state.status}
          onClickStreet={handleClickStreet}
          revealTarget={state.revealTarget}
        />
        <div className="hintBar">Click on the highlighted street to guess</div>
        {toast && (
          <div key={toast.key} className={`toast show ${toast.kind}`}>
            {toast.msg}
          </div>
        )}
      </div>

      {/* End screen overlay */}
      {state.phase === 'ended' && (
        <EndScreen
          mode={state.mode}
          submode={state.submode}
          correct={state.correct}
          wrong={state.wrong}
          skipped={state.skipped}
          total={state.names.length}
          durationMs={elapsed}
          onPlayAgain={() => {
            if (state.mode === 'district') startDistrictMode(state.submode!);
            else if (state.mode === 'neighbourhood') startNeighbourhoodMode(state.submode!);
            else startMode(state.mode);
          }}
          onQuit={() => dispatch({ type: 'SET_PHASE', phase: 'mode-select' })}
        />
      )}
    </div>
  );
}
