import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMetronome } from "./useMetronome";

function createFakeAudioContext() {
  const ctx: any = {
    currentTime: 0,
    state: "running",
    resume: vi.fn(() => Promise.resolve()),
    destination: {},
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
    createOscillator: () => ({
      frequency: { setValueAtTime: vi.fn() },
      type: "",
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
  };
  return ctx;
}

let capturedWorker: any = null;
class FakeWorker {
  onmessage: ((e: any) => void) | null = null;
  postMessage(data: string) {
    capturedWorker = this;
    if (data === "start") this.onmessage?.({} as MessageEvent);
  }
  terminate() {
    capturedWorker = null;
  }
}

beforeEach(() => {
  capturedWorker = null;
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useMetronome — A1 scheduler", () => {
  it("schedules clicks across the lookahead window via the worker", () => {
    const ctx = createFakeAudioContext();
    let oscStarts = 0;
    ctx.createOscillator = () => ({
      frequency: { setValueAtTime: vi.fn() },
      type: "",
      connect: vi.fn(),
      start: vi.fn(() => { oscStarts++; }),
      stop: vi.fn(),
    });
    vi.stubGlobal("AudioContext", function () { return ctx; });

    const { result } = renderHook(() => useMetronome());
    act(() => result.current.start());
    const afterFirst = oscStarts;

    ctx.currentTime = 1.0;
    act(() => capturedWorker.onmessage?.({} as MessageEvent));

    expect(afterFirst).toBeGreaterThanOrEqual(1);
    expect(oscStarts).toBeGreaterThan(afterFirst);
    act(() => result.current.stop());
  });

  it("falls back to a timer and does not throw when Worker is undefined", () => {
    vi.stubGlobal("Worker", undefined);
    vi.stubGlobal("AudioContext", function () { return createFakeAudioContext(); });
    const { result } = renderHook(() => useMetronome());
    expect(() => act(() => result.current.start())).not.toThrow();
    act(() => result.current.stop());
  });

  it("does not throw when wakeLock API is absent", () => {
    vi.stubGlobal("AudioContext", function () { return createFakeAudioContext(); });
    const { result } = renderHook(() => useMetronome());
    expect(() => act(() => result.current.start())).not.toThrow();
    expect(() => act(() => result.current.setWakeLockEnabled(false))).not.toThrow();
    act(() => result.current.stop());
  });

  it("requests the screen wake lock on start when enabled", async () => {
    const request = vi.fn(() => Promise.resolve({ release: vi.fn(() => Promise.resolve()) }));
    (navigator as any).wakeLock = { request };
    vi.stubGlobal("AudioContext", function () { return createFakeAudioContext(); });
    const { result } = renderHook(() => useMetronome());
    await act(async () => { result.current.start(); });
    expect(request).toHaveBeenCalledWith("screen");
    act(() => result.current.stop());
  });

  it("increments flashKey on main beats only when visualFlashEnabled is true", () => {
    const ctx = createFakeAudioContext();
    vi.stubGlobal("AudioContext", function () { return ctx; });
    const { result } = renderHook(() => useMetronome());
    act(() => result.current.setVisualFlashEnabled(false));
    act(() => result.current.start());
    const k0 = result.current.flashKey;
    ctx.currentTime = 1.0;
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    expect(result.current.flashKey).toBe(k0);
    act(() => result.current.setVisualFlashEnabled(true));
    ctx.currentTime = 2.0;
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    expect(result.current.flashKey).toBeGreaterThan(k0);
    act(() => result.current.stop());
  });

  it("plays a click (oscillator start) for both accent and non-accent beats", () => {
    const ctx = createFakeAudioContext();
    let oscStarts = 0;
    ctx.createOscillator = () => ({
      frequency: { setValueAtTime: vi.fn() },
      type: "",
      connect: vi.fn(),
      start: vi.fn(() => { oscStarts++; }),
      stop: vi.fn(),
    });
    vi.stubGlobal("AudioContext", function () { return ctx; });
    const { result } = renderHook(() => useMetronome());
    act(() => result.current.start());
    expect(oscStarts).toBeGreaterThanOrEqual(1);
    act(() => result.current.stop());
  });

  it("vibrates only when vibrationEnabled is true", () => {
    const vibrate = vi.fn();
    (navigator as any).vibrate = vibrate;
    const ctx = createFakeAudioContext();
    vi.stubGlobal("AudioContext", function () { return ctx; });
    const { result } = renderHook(() => useMetronome());
    act(() => result.current.setVibrationEnabled(false));
    act(() => result.current.start());
    ctx.currentTime = 1.0;
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    expect(vibrate).not.toHaveBeenCalled();
    act(() => result.current.setVibrationEnabled(true));
    ctx.currentTime = 2.0;
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    expect(vibrate).toHaveBeenCalled();
    act(() => result.current.stop());
  });
});
