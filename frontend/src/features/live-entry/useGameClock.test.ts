import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGameClock } from "./useGameClock";

describe("useGameClock", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at the FIBA period length, 10 minutes in regulation and 5 in overtime", () => {
    const regulation = renderHook(() => useGameClock("game-1", 1));
    expect(regulation.result.current.remainingS).toBe(600);

    const overtime = renderHook(() => useGameClock("game-2", 5));
    expect(overtime.result.current.remainingS).toBe(300);
  });

  it("counts down only while running", () => {
    const { result } = renderHook(() => useGameClock("game-1", 1));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current.remainingS).toBe(600);
    expect(result.current.running).toBe(false);

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(result.current.running).toBe(true);
    expect(result.current.remainingS).toBe(588);
  });

  it("freezes the elapsed time on pause", () => {
    const { result } = renderHook(() => useGameClock("game-1", 1));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    act(() => result.current.pause());
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.running).toBe(false);
    expect(result.current.remainingS).toBe(570);
  });

  it("resumes at the right time after a reload mid-period", () => {
    const first = renderHook(() => useGameClock("game-1", 1));
    act(() => first.result.current.play());
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    act(() => first.result.current.pause());
    first.unmount();

    const reloaded = renderHook(() => useGameClock("game-1", 1));
    expect(reloaded.result.current.remainingS).toBe(580);
  });

  it("resets to a full period, and starts fresh when the period changes", () => {
    const { result, rerender } = renderHook(({ period }) => useGameClock("game-1", period), {
      initialProps: { period: 1 },
    });

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(45_000);
    });
    act(() => result.current.reset());
    expect(result.current.remainingS).toBe(600);
    expect(result.current.running).toBe(false);

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(45_000);
    });
    rerender({ period: 2 });
    expect(result.current.remainingS).toBe(600);
    expect(result.current.running).toBe(false);
  });

  it("stops at zero instead of running past the buzzer", () => {
    const { result } = renderHook(() => useGameClock("game-1", 1));

    act(() => result.current.play());
    act(() => {
      vi.advanceTimersByTime(700_000);
    });

    expect(result.current.remainingS).toBe(0);
    expect(result.current.running).toBe(false);
  });
});
