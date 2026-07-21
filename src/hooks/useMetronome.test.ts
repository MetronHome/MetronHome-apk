/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
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

  it("does not throw when Worker is undefined", () => {
    vi.stubGlobal("Worker", undefined);
    vi.stubGlobal("AudioContext", function () { return createFakeAudioContext(); });
    const { result } = renderHook(() => useMetronome());
    expect(() => act(() => result.current.start())).not.toThrow();
    act(() => result.current.stop());
  });

  it("plays a click with distinct accent/non-accent frequencies (1500/1000 Hz) for the default sound", () => {
    const ctx = createFakeAudioContext();
    const freqCalls: Array<{ freq: number }> = [];
    ctx.createOscillator = () => ({
      frequency: { setValueAtTime: vi.fn((f: number) => { freqCalls.push({ freq: f }); }) },
      type: "",
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    });
    vi.stubGlobal("AudioContext", function () { return ctx; });
    const { result } = renderHook(() => useMetronome());
    act(() => result.current.start());
    ctx.currentTime = 1.0;
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    act(() => result.current.stop());

    expect(freqCalls.some(c => c.freq === 1500)).toBe(true);
    expect(freqCalls.some(c => c.freq === 1000)).toBe(true);
  });
});
