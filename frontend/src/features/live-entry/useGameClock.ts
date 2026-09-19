import { useEffect, useReducer, useRef, useState } from "react";

import { periodLengthS } from "../../domain/boxScore";

interface StoredClock {
  period: number;
  remainingS: number;
  running: boolean;
  since: number | null; // epoch ms when play() was pressed, for wall-clock drift correction
}

function storageKey(gameId: string): string {
  return `basketstats_clock_${gameId}`;
}

function readStored(gameId: string): StoredClock | null {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    return raw ? (JSON.parse(raw) as StoredClock) : null;
  } catch {
    return null;
  }
}

function writeStored(gameId: string, clock: StoredClock): void {
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(clock));
  } catch {
    // Storage unavailable: the clock just won't survive a reload this session.
  }
}

function freshClock(period: number): StoredClock {
  return { period, remainingS: periodLengthS(period), running: false, since: null };
}

/** Countdown clock for the current period, persisted to localStorage (keyed by
 * game, holding the current period) so a reload mid-match doesn't reset it to
 * 10:00 — the "since" timestamp lets a running clock catch up to real
 * elapsed time on resume instead of freezing while the tab was closed.
 * Resets automatically whenever the period changes. */
export function useGameClock(gameId: string, period: number) {
  const [clock, setClock] = useState<StoredClock>(() => {
    const stored = readStored(gameId);
    return stored && stored.period === period ? stored : freshClock(period);
  });
  const previousPeriod = useRef(period);

  useEffect(() => {
    if (previousPeriod.current !== period) {
      previousPeriod.current = period;
      setClock(freshClock(period));
    }
  }, [period]);

  useEffect(() => {
    writeStored(gameId, clock);
  }, [gameId, clock]);

  // Re-render every second while running so the displayed countdown ticks
  // down live; the actual value is always derived from wall-clock time
  // below, so this timer never needs to be precise.
  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!clock.running) return;
    const id = window.setInterval(forceTick, 1000);
    return () => window.clearInterval(id);
  }, [clock.running]);

  const remainingS =
    clock.running && clock.since !== null
      ? Math.max(0, clock.remainingS - Math.floor((Date.now() - clock.since) / 1000))
      : clock.remainingS;

  // Freeze at 00:00 instead of staying nominally "running" forever, so events
  // recorded after the buzzer are stamped with a settled clock.
  useEffect(() => {
    if (clock.running && remainingS <= 0) {
      setClock((c) => ({ ...c, running: false, since: null, remainingS: 0 }));
    }
  }, [clock.running, remainingS]);

  function play() {
    if (remainingS <= 0) return;
    setClock((c) => ({ ...c, running: true, since: Date.now() }));
  }

  function pause() {
    setClock((c) => {
      if (!c.running || c.since === null) return c;
      const elapsed = Math.floor((Date.now() - c.since) / 1000);
      return { ...c, running: false, since: null, remainingS: Math.max(0, c.remainingS - elapsed) };
    });
  }

  function reset() {
    setClock(freshClock(period));
  }

  return { remainingS, running: clock.running, play, pause, reset };
}
