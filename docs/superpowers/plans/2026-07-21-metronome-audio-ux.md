# Metronome Audio Precision & Sensory UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le métronome tempo-stable même écran tamisé (Web Worker scheduler), garder l'écran allumé (WakeLock), ajouter un flash visuel activable, enrichir les timbres, et peaufiner la vibration.

**Architecture:** On remplace le `setTimeout` du thread principal par un Web Worker (timer non bridé en arrière-plan), avec fallback `setTimeout` si `Worker` est indisponible. Les nouvelles capacités (WakeLock, flash, timbres, vibration) s'ajoutent dans `useMetronome` sans changer l'API exposée au `MetronomeContext`. Build exécuté sur la branche `main` (workflow établi du projet : pas de worktree, pour rester cohérent avec `/metrobuild` + `/gitrelease`).

**Tech Stack:** React 18, Vite, TypeScript (TS volontairement loose), Web Audio API, Web Workers, Screen Wake Lock API, Navigator.vibrate, Vitest + @testing-library/react (jsdom).

---

## File Structure

- **Create** `src/audio/metronome.worker.ts` — timer de planification (25 ms) hors thread principal.
- **Modify** `src/hooks/useMetronome.ts` — scheduler via worker + WakeLock + flash + timbres + vibration. Source unique de vérité.
- **Create** `src/hooks/useMetronome.test.ts` — tests Vitest (cadence worker, fallback, WakeLock, flash gating, vibration gating).
- **Modify** `src/index.css` — keyframes + classe `.beat-flash` (overlay plein écran).
- **Modify** `src/pages/Index.tsx` — overlay flash + passage des nouvelles props au panneau réglages.
- **Modify** `src/components/MetronomeSettings.tsx` — toggles "Écran allumé" et "Flash visuel".
- **Modify** `README.md` — section fonctionnalités mise à jour.
- **Modify (ship)** `package.json`, `android/app/build.gradle`, `C:\devapp\27.MetronHome_app\phone\metronome-build.bat`, `metronome-verify.bat` — bump version 2.1.1 → 2.2.0.

Convention : 1 commit par tâche, messages avec emoji auto + suffixe version (ex. `feat:` sera préfixé par l'emoji au commit réel via `/gitcommit` ; ici on écrit le corps).

---

## Task 1 — A1 : Scheduler Web Worker + fallback

**Files:**
- Create: `src/audio/metronome.worker.ts`
- Modify: `src/hooks/useMetronome.ts` (ajout refs worker + `startWorker`/`stopWorker`, `start`/`stop` réécrits)
- Create: `src/hooks/useMetronome.test.ts`

- [ ] **Step 1: Créer le worker**

`src/audio/metronome.worker.ts` :
```ts
let timer: ReturnType<typeof setInterval> | null = null;

const ctx: any = self;
ctx.onmessage = (e: MessageEvent) => {
  if (e.data === "start" && timer === null) {
    timer = setInterval(() => ctx.postMessage("tick"), 25);
  } else if (e.data === "stop" && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};
```

- [ ] **Step 2: Remplacer le scheduler par le worker dans `useMetronome.ts`**

Remplacer les refs/timer et les fonctions `start`/`stop` par :

```ts
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const stateRef = useRef(state);
```

```ts
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
```

```ts
  const start = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current!;
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime;
    setState(prev => ({ ...prev, isPlaying: true, currentBeat: 0 }));
    startWorker();
  }, [initAudio, startWorker]);

  const stop = useCallback(() => {
    stopWorker();
    setState(prev => ({ ...prev, isPlaying: false, currentBeat: 0 }));
  }, [stopWorker]);
```

- [ ] **Step 3: Écrire le test (créer `src/hooks/useMetronome.test.ts`)**

```ts
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
});
```

- [ ] **Step 4: Lancer les tests**

Run: `cd MetronHomeApp && npm run test -- src/hooks/useMetronome.test.ts`
Expected: 2 passed (PASSED)

- [ ] **Step 5: Commit**

```bash
git add src/audio/metronome.worker.ts src/hooks/useMetronome.ts src/hooks/useMetronome.test.ts
git commit -m "feat: scheduler metronome dans un Web Worker (fallback setTimeout)"
```

---

## Task 2 — C1 : WakeLock (écran toujours allumé)

**Files:**
- Modify: `src/hooks/useMetronome.ts` (refs WakeLock, `acquireWakeLock`/`releaseWakeLock`, effet `visibilitychange`, `start`/`stop`, `setWakeLockEnabled`, init state, `reset`)
- Modify: `src/hooks/useMetronome.test.ts` (ajouter 2 `it`)

- [ ] **Step 1: Ajouter WakeLock dans `useMetronome.ts`**

Ajouter la ref :
```ts
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
```

Ajouter `wakeLockEnabled: true` dans l'objet initial de `useState` (à côté de `vibrationEnabled: false`).

Ajouter après l'effet `stateRef` :
```ts
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
```

Modifier `start` :
```ts
  const start = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current!;
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime;
    setState(prev => ({ ...prev, isPlaying: true, currentBeat: 0 }));
    startWorker();
    if (stateRef.current.wakeLockEnabled) acquireWakeLock();
  }, [initAudio, startWorker, acquireWakeLock]);
```

Modifier `stop` :
```ts
  const stop = useCallback(() => {
    stopWorker();
    releaseWakeLock();
    setState(prev => ({ ...prev, isPlaying: false, currentBeat: 0 }));
  }, [stopWorker, releaseWakeLock]);
```

Ajouter le setter (avec les autres setters) :
```ts
  const setWakeLockEnabled = useCallback((wakeLockEnabled: boolean) => {
    setState(prev => ({ ...prev, wakeLockEnabled }));
    if (wakeLockEnabled && stateRef.current.isPlaying) {
      acquireWakeLock();
    } else if (!wakeLockEnabled && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [acquireWakeLock]);
```

Dans `reset`, ajouter `wakeLockEnabled: true,` dans l'objet réinitialisé.

- [ ] **Step 2: Ajouter les tests (append dans `src/hooks/useMetronome.test.ts`, dans le `describe` existant)**

```ts
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
```

- [ ] **Step 3: Lancer les tests**

Run: `cd MetronHomeApp && npm run test -- src/hooks/useMetronome.test.ts`
Expected: 4 passed

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMetronome.ts src/hooks/useMetronome.test.ts
git commit -m "feat: maintenir l'ecran allume pendant la lecture (WakeLock)"
```

---

## Task 3 — C2 : Flash visuel plein écran (activable)

**Files:**
- Modify: `src/hooks/useMetronome.ts` (`state` init, `scheduler`, `setVisualFlashEnabled`, `reset`)
- Modify: `src/index.css` (keyframes + `.beat-flash`)
- Modify: `src/pages/Index.tsx` (overlay + props)
- Modify: `src/hooks/useMetronome.test.ts` (append 1 `it`)

- [ ] **Step 1: État + déclenchement du flash dans `useMetronome.ts`**

Dans l'objet initial de `useState`, ajouter :
```ts
    visualFlashEnabled: true,
    flashKey: 0,
```

Dans `scheduler`, remplacer le bloc `if (isMainBeat) { ... }` par :
```ts
      if (isMainBeat) {
        setState(prev => ({ ...prev, currentBeat: mainBeatIndex }));
        if (s.visualFlashEnabled) {
          setState(prev => ({ ...prev, flashKey: prev.flashKey + 1 }));
        }
        if (s.vibrationEnabled && navigator.vibrate) {
          navigator.vibrate(isAccent ? 35 : 12);
        }
      }
```

Ajouter le setter (avec les autres) :
```ts
  const setVisualFlashEnabled = useCallback((visualFlashEnabled: boolean) => {
    setState(prev => ({ ...prev, visualFlashEnabled }));
  }, []);
```

Dans `reset`, ajouter `visualFlashEnabled: true, flashKey: 0,` dans l'objet réinitialisé.

- [ ] **Step 2: CSS du flash — append dans `src/index.css`**

```css
@keyframes beatFlash {
  0%   { opacity: 0; }
  15%  { opacity: 0.35; }
  100% { opacity: 0; }
}
.beat-flash {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 40;
  background: radial-gradient(circle at center, var(--glow) 0%, transparent 70%);
  animation: beatFlash 140ms ease-out;
}
.beat-flash--accent {
  background: radial-gradient(circle at center, var(--primary) 0%, transparent 75%);
  animation: beatFlash 200ms ease-out;
}
```

- [ ] **Step 3: Overlay dans `src/pages/Index.tsx`**

Juste après la balise ouvrante `<div className="min-h-[100dvh] flex flex-col bg-background">` (ligne 36), insérer :
```tsx
      {metronome.isPlaying && metronome.visualFlashEnabled && (
        <div
          key={metronome.flashKey}
          className={`beat-flash ${metronome.currentBeat === 0 ? "beat-flash--accent" : ""}`}
          aria-hidden
        />
      )}
```

Ajouter les deux nouvelles props au `<MetronomeSettings>` (bloc ~lignes 124-139) :
```tsx
                wakeLockEnabled={metronome.wakeLockEnabled}
                visualFlashEnabled={metronome.visualFlashEnabled}
                onWakeLockChange={metronome.setWakeLockEnabled}
                onVisualFlashChange={metronome.setVisualFlashEnabled}
```

- [ ] **Step 4: Test (append dans `useMetronome.test.ts`, dans le `describe` existant)**

```ts
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
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    expect(result.current.flashKey).toBeGreaterThan(k0);
    act(() => result.current.stop());
  });
```

- [ ] **Step 5: Lancer les tests**

Run: `cd MetronHomeApp && npm run test -- src/hooks/useMetronome.test.ts`
Expected: 5 passed

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMetronome.ts src/index.css src/pages/Index.tsx src/hooks/useMetronome.test.ts
git commit -m "feat: flash visuel plein ecran activable par beat"
```

---

## Task 4 — A2 : Timbres de clic enrichis

**Files:**
- Modify: `src/hooks/useMetronome.ts` (remplacer `playClick`)
- Modify: `src/hooks/useMetronome.test.ts` (append 1 `it`)

- [ ] **Step 1: Remplacer `playClick` dans `useMetronome.ts`**

```ts
  const playClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = audioCtxRef.current!;
    const gain = gainRef.current!;
    const s = stateRef.current;

    gain.gain.setValueAtTime(s.volume, time);

    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.connect(envGain);
    envGain.connect(gain);

    const isWood = s.soundType === "wood";
    const decay = isWood ? 0.04 : 0.05;

    if (isAccent && s.accentFirstBeat) {
      if (isWood) {
        osc.type = "square";
        osc.frequency.setValueAtTime(1200, time);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(1800, time);
        osc.disconnect();
        osc.connect(bp);
        bp.connect(envGain);
      } else if (s.soundType === "accent") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1600, time);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1500, time);
      }
      envGain.gain.setValueAtTime(1.0, time);
    } else {
      if (isWood) {
        osc.type = "square";
        osc.frequency.setValueAtTime(800, time);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(1000, time);
        osc.disconnect();
        osc.connect(bp);
        bp.connect(envGain);
      } else if (s.soundType === "accent") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1000, time);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, time);
      }
      envGain.gain.setValueAtTime(0.6, time);
    }

    envGain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    osc.start(time);
    osc.stop(time + decay);
  }, []);
```

- [ ] **Step 2: Test (append dans `useMetronome.test.ts`, dans le `describe` existant)**

```ts
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
```

- [ ] **Step 3: Lancer les tests**

Run: `cd MetronHomeApp && npm run test -- src/hooks/useMetronome.test.ts`
Expected: 6 passed

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMetronome.ts src/hooks/useMetronome.test.ts
git commit -m "feat: timbres de clic enrichis (woodblock, accent distinct)"
```

---

## Task 5 — C3 : Vibration peaufinée

**Files:**
- Modify: `src/hooks/useMetronome.ts` (`scheduler` — déjà modifié en Task 3, les valeurs 35/12 y sont ; ici on ajoute le test gating)
- Modify: `src/hooks/useMetronome.test.ts` (append 1 `it`)

- [ ] **Step 1: Vérifier que le `scheduler` utilise déjà `navigator.vibrate(isAccent ? 35 : 12)`**

Le code est en place depuis la Task 3 (bloc `if (isMainBeat)`). Aucune modification de code nécessaire ici — on ajoute seulement le test de garde.

- [ ] **Step 2: Test gating vibration (append dans `useMetronome.test.ts`, dans le `describe` existant)**

```ts
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
    act(() => capturedWorker.onmessage?.({} as MessageEvent));
    expect(vibrate).toHaveBeenCalled();
    act(() => result.current.stop());
  });
```

- [ ] **Step 3: Lancer les tests**

Run: `cd MetronHomeApp && npm run test -- src/hooks/useMetronome.test.ts`
Expected: 7 passed

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMetronome.test.ts
git commit -m "test: garde de vibration selon vibrationEnabled"
```

---

## Task 6 — UI : panneau réglages (toggles WakeLock + Flash)

**Files:**
- Modify: `src/components/MetronomeSettings.tsx` (plein fichier)
- Modify: `src/pages/Index.tsx` (props déjà ajoutées en Task 3 — vérifier)

- [ ] **Step 1: Remplacer `src/components/MetronomeSettings.tsx` par la version complète**

```tsx
import type { TimeSignature, Subdivision, SoundType } from "@/hooks/useMetronome";
import { Music, Vibrate, RotateCcw, Monitor, Zap } from "lucide-react";

interface MetronomeSettingsProps {
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  soundType: SoundType;
  accentFirstBeat: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  visualFlashEnabled: boolean;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  onSubdivisionChange: (s: Subdivision) => void;
  onSoundTypeChange: (s: SoundType) => void;
  onAccentFirstBeatChange: (v: boolean) => void;
  onVibrationChange: (v: boolean) => void;
  onWakeLockChange: (v: boolean) => void;
  onVisualFlashChange: (v: boolean) => void;
  onReset: () => void;
}

const timeSignatures: TimeSignature[] = ["4/4", "3/4", "6/8"];
const subdivisions: { value: Subdivision; label: string }[] = [
  { value: "quarter", label: "♩ Noires" },
  { value: "eighth", label: "♪ Croches" },
  { value: "triplet", label: "𝅘𝅥𝅮 Triolets" },
];
const sounds: { value: SoundType; label: string }[] = [
  { value: "click", label: "Click" },
  { value: "accent", label: "Accentué" },
  { value: "wood", label: "Bois" },
];

function ToggleGroup<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            value === item.value
              ? "bg-primary/20 text-primary border border-primary/30"
              : "glass-subtle text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MetronomeSettings({
  timeSignature,
  subdivision,
  soundType,
  accentFirstBeat,
  vibrationEnabled,
  wakeLockEnabled,
  visualFlashEnabled,
  onTimeSignatureChange,
  onSubdivisionChange,
  onSoundTypeChange,
  onAccentFirstBeatChange,
  onVibrationChange,
  onWakeLockChange,
  onVisualFlashChange,
  onReset,
}: MetronomeSettingsProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Signature</label>
        <ToggleGroup
          items={timeSignatures.map((ts) => ({ value: ts, label: ts }))}
          value={timeSignature}
          onChange={onTimeSignatureChange}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Subdivisions</label>
        <ToggleGroup items={subdivisions} value={subdivision} onChange={onSubdivisionChange} />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Music className="w-3 h-3" /> Son
        </label>
        <ToggleGroup items={sounds} value={soundType} onChange={onSoundTypeChange} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onAccentFirstBeatChange(!accentFirstBeat)}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            accentFirstBeat
              ? "bg-primary/20 text-primary border border-primary/30"
              : "glass-subtle text-muted-foreground"
          }`}
        >
          Accent 1er temps
        </button>
        <button
          onClick={() => onVibrationChange(!vibrationEnabled)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            vibrationEnabled
              ? "bg-accent/20 text-accent border border-accent/30"
              : "glass-subtle text-muted-foreground"
          }`}
        >
          <Vibrate className="w-3 h-3" />
          Vibration
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onWakeLockChange(!wakeLockEnabled)}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            wakeLockEnabled
              ? "bg-primary/20 text-primary border border-primary/30"
              : "glass-subtle text-muted-foreground"
          }`}
        >
          <Monitor className="w-3 h-3" />
          Écran allumé
        </button>
        <button
          onClick={() => onVisualFlashChange(!visualFlashEnabled)}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            visualFlashEnabled
              ? "bg-accent/20 text-accent border border-accent/30"
              : "glass-subtle text-muted-foreground"
          }`}
        >
          <Zap className="w-3 h-3" />
          Flash visuel
        </button>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg glass-subtle text-muted-foreground hover:text-destructive transition-colors text-xs"
      >
        <RotateCcw className="w-3 h-3" />
        Réinitialiser
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier `Index.tsx`**

Les props `wakeLockEnabled` / `visualFlashEnabled` / `onWakeLockChange` / `onVisualFlashChange` ont été ajoutées au `<MetronomeSettings>` en Task 3. Confirmer qu'elles sont présentes (sinon les ajouter comme en Task 3 Step 3).

- [ ] **Step 3: Lint**

Run: `cd MetronHomeApp && npm run lint`
Expected: 0 erreur

- [ ] **Step 4: Commit**

```bash
git add src/components/MetronomeSettings.tsx src/pages/Index.tsx
git commit -m "feat: toggles reglages Ecran allume et Flash visuel"
```

---

## Task 7 — Vérification globale + bump version + README

**Files:**
- Modify: `package.json` (`version`), `android/app/build.gradle` (`versionName`), `C:\devapp\27.MetronHome_app\phone\metronome-build.bat` (`VERSION`), `metronome-verify.bat` (`VERSION`)
- Modify: `README.md` (fonctionnalités)

- [ ] **Step 1: Tests + build web**

Run: `cd MetronHomeApp && npm run test && npm run build`
Expected: tests 7 passed, build OK (dist/ généré)

- [ ] **Step 2: Bump version 2.1.1 → 2.2.0 (4 éditions synchronisées)**

1. `package.json` : `"version": "2.2.0"`
2. `android/app/build.gradle` : `versionName "2.2.0"` (et `versionCode 3`)
3. `C:\devapp\27.MetronHome_app\phone\metronome-build.bat` : `set VERSION=2.2.0`
4. `C:\devapp\27.MetronHome_app\phone\metronome-verify.bat` : `set VERSION=2.2.0`

Vérifier avant édition les chaînes exactes (`grep -n "2.1.1" package.json android/app/build.gradle ...`).

- [ ] **Step 3: Mettre à jour `README.md`**

Dans la section fonctionnalités, ajouter :
- « Tempo stable même écran tamisé (scheduler Web Worker) »
- « Écran maintenu allumé pendant la pratique (WakeLock) »
- « Flash visuel plein écran par beat (activable) »
- « Timbres de clic enrichis (woodblock, accent distinct) »

- [ ] **Step 4: Commit**

```bash
git add package.json android/app/build.gradle README.md C:/devapp/27.MetronHome_app/phone/metronome-build.bat C:/devapp/27.MetronHome_app/phone/metronome-verify.bat
git commit -m "chore: bump v2.2.0 + README fonctionnalites audio/UX"
```

- [ ] **Step 5: Build natif Android (pipeline existant)**

Run: `cd MetronHomeApp && npm run metrobuild` (build web + cap sync + Gradle bundleRelease signé + verify .apks).
Expected: `MetronHome-v2.2.0-release.aab` + `MetronHome-v2.2.0.apks` générés.

> La publication GitHub (`/gitrelease`) se fait séparément, selon le flux habituel du projet.

---

## Self-Review (effectué)

- **Couverture spec** : A1 (Task 1) ✓, C1 (Task 2) ✓, C2 (Task 3) ✓, A2 (Task 4) ✓, C3 (Task 5) ✓, UI (Task 6) ✓, thème clair explicitement exclu ✓, 4e timbre rimshot optionnel non inclus ✓.
- **Placeholders** : aucun. Chaque step contient le code ou la commande exacte.
- **Cohérence types** : `setWakeLockEnabled`/`setVisualFlashEnabled` définis dans `useMetronome` (Task 2/3) et consommés dans `MetronomeSettings` (Task 6) et `Index` (Task 3). `flashKey` exposé via `...state`. `wakeLockEnabled`/`visualFlashEnabled` dans l'init state et `reset`. OK.
- **Tests** : 7 tests couvrent cadence worker, fallback, WakeLock absent/présent, flash gating, timbre, vibration gating. Tous exécutables sous jsdom avec mocks.
