import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTapTempo } from "./useTapTempo";

describe("useTapTempo", () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not report a BPM on the first tap", () => {
    const onBpmChange = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    act(() => result.current.tap());

    expect(onBpmChange).not.toHaveBeenCalled();
  });

  it("computes 120 BPM from taps spaced 500ms apart", () => {
    const onBpmChange = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    act(() => result.current.tap());
    now = 500;
    act(() => result.current.tap());

    expect(onBpmChange).toHaveBeenLastCalledWith(120);
  });

  it("resets the sequence when a tap comes after more than 2 seconds", () => {
    const onBpmChange = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    act(() => result.current.tap());
    now = 500;
    act(() => result.current.tap()); // 120 BPM reported
    now = 3000; // > 2s gap -> sequence reset, treated as a fresh first tap
    act(() => result.current.tap());

    // No new BPM reported after the reset (only one call, from the 120 BPM tap)
    expect(onBpmChange).toHaveBeenCalledTimes(1);
    expect(onBpmChange).toHaveBeenLastCalledWith(120);
  });
});
