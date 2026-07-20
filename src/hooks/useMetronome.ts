import { useRef, useState, useCallback, useEffect } from "react";

export type SoundType = "click" | "accent" | "wood";
export type Subdivision = "quarter" | "eighth" | "triplet";
export type TimeSignature = "4/4" | "3/4" | "6/8";

interface MetronomeState {
  bpm: number;
  volume: number;
  isPlaying: boolean;
  currentBeat: number;
  soundType: SoundType;
  subdivision: Subdivision;
  timeSignature: TimeSignature;
  accentFirstBeat: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
}

const getBeatsPerMeasure = (ts: TimeSignature) => {
  switch (ts) {
    case "4/4": return 4;
    case "3/4": return 3;
    case "6/8": return 6;
  }
};

const getSubdivisionMultiplier = (sub: Subdivision) => {
  switch (sub) {
    case "quarter": return 1;
    case "eighth": return 2;
    case "triplet": return 3;
  }
};

export function useMetronome() {
  const [state, setState] = useState<MetronomeState>({
    bpm: 120,
    volume: 0.8,
    isPlaying: false,
    currentBeat: 0,
    soundType: "click",
    subdivision: "quarter",
    timeSignature: "4/4",
    accentFirstBeat: true,
    vibrationEnabled: false,
    wakeLockEnabled: true,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const stateRef = useRef(state);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // permission / batterie refusée -> ignoré
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        stateRef.current.isPlaying &&
        stateRef.current.wakeLockEnabled
      ) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [acquireWakeLock]);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const playClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = audioCtxRef.current!;
    const gain = gainRef.current!;
    const s = stateRef.current;

    gain.gain.setValueAtTime(s.volume, time);

    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.connect(envGain);
    envGain.connect(gain);

    if (isAccent && s.accentFirstBeat) {
      // Accent: higher pitch, louder
      switch (s.soundType) {
        case "click":
          osc.frequency.setValueAtTime(1200, time);
          osc.type = "sine";
          break;
        case "accent":
          osc.frequency.setValueAtTime(1500, time);
          osc.type = "triangle";
          break;
        case "wood":
          osc.frequency.setValueAtTime(800, time);
          osc.type = "square";
          break;
      }
      envGain.gain.setValueAtTime(1.0, time);
    } else {
      switch (s.soundType) {
        case "click":
          osc.frequency.setValueAtTime(800, time);
          osc.type = "sine";
          break;
        case "accent":
          osc.frequency.setValueAtTime(1000, time);
          osc.type = "triangle";
          break;
        case "wood":
          osc.frequency.setValueAtTime(600, time);
          osc.type = "square";
          break;
      }
      envGain.gain.setValueAtTime(0.6, time);
    }

    envGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current!;
    const s = stateRef.current;
    const beatsPerMeasure = getBeatsPerMeasure(s.timeSignature);
    const subdivMult = getSubdivisionMultiplier(s.subdivision);
    const secondsPerSubBeat = 60.0 / s.bpm / subdivMult;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const subBeat = currentBeatRef.current;
      const isMainBeat = subBeat % subdivMult === 0;
      const mainBeatIndex = Math.floor(subBeat / subdivMult);
      const isAccent = isMainBeat && mainBeatIndex === 0;

      playClick(nextNoteTimeRef.current, isAccent);

      if (isMainBeat) {
        setState(prev => ({ ...prev, currentBeat: mainBeatIndex }));

        // Vibration
        if (s.vibrationEnabled && navigator.vibrate) {
          navigator.vibrate(isAccent ? 30 : 15);
        }
      }

      currentBeatRef.current = (subBeat + 1) % (beatsPerMeasure * subdivMult);
      nextNoteTimeRef.current += secondsPerSubBeat;
    }
  }, [playClick]);

  const startWorker = useCallback(() => {
    try {
      workerRef.current = new Worker(
        new URL("../audio/metronome.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current.onmessage = () => scheduler();
      workerRef.current.postMessage("start");
    } catch {
      // Fallback : timer du thread principal (vieille WebView sans Worker)
      const tick = () => {
        scheduler();
        fallbackTimerRef.current = window.setTimeout(tick, 25);
      };
      tick();
    }
  }, [scheduler]);

  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage("stop");
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current!;
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime;
    setState(prev => ({ ...prev, isPlaying: true, currentBeat: 0 }));
    startWorker();
    if (stateRef.current.wakeLockEnabled) acquireWakeLock();
  }, [initAudio, startWorker, acquireWakeLock]);

  const stop = useCallback(() => {
    stopWorker();
    releaseWakeLock();
    setState(prev => ({ ...prev, isPlaying: false, currentBeat: 0 }));
  }, [stopWorker, releaseWakeLock]);

  const toggle = useCallback(() => {
    if (stateRef.current.isPlaying) stop();
    else start();
  }, [start, stop]);

  const setBpm = useCallback((bpm: number) => {
    setState(prev => ({ ...prev, bpm: Math.max(30, Math.min(300, bpm)) }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  const setSoundType = useCallback((soundType: SoundType) => {
    setState(prev => ({ ...prev, soundType }));
  }, []);

  const setSubdivision = useCallback((subdivision: Subdivision) => {
    setState(prev => ({ ...prev, subdivision }));
  }, []);

  const setTimeSignature = useCallback((timeSignature: TimeSignature) => {
    setState(prev => ({ ...prev, timeSignature }));
  }, []);

  const setAccentFirstBeat = useCallback((accentFirstBeat: boolean) => {
    setState(prev => ({ ...prev, accentFirstBeat }));
  }, []);

  const setVibrationEnabled = useCallback((vibrationEnabled: boolean) => {
    setState(prev => ({ ...prev, vibrationEnabled }));
  }, []);

  const setWakeLockEnabled = useCallback((wakeLockEnabled: boolean) => {
    setState(prev => ({ ...prev, wakeLockEnabled }));
    if (wakeLockEnabled && stateRef.current.isPlaying) {
      acquireWakeLock();
    } else if (!wakeLockEnabled && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [acquireWakeLock]);

  const reset = useCallback(() => {
    stop();
    setState({
      bpm: 120,
      volume: 0.8,
      isPlaying: false,
      currentBeat: 0,
      soundType: "click",
      subdivision: "quarter",
      timeSignature: "4/4",
      accentFirstBeat: true,
      vibrationEnabled: false,
      wakeLockEnabled: true,
    });
  }, [stop]);

  return {
    ...state,
    toggle,
    start,
    stop,
    setBpm,
    setVolume,
    setSoundType,
    setSubdivision,
    setTimeSignature,
    setAccentFirstBeat,
    setVibrationEnabled,
    setWakeLockEnabled,
    reset,
    beatsPerMeasure: getBeatsPerMeasure(state.timeSignature),
  };
}
