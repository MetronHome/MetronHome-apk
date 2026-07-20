import { useState, useCallback, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import type { TimeSignature, Subdivision, SoundType } from "./useMetronome";

export interface Preset {
  id: string;
  name: string;
  bpm: number;
  volume: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  soundType: SoundType;
  accentFirstBeat: boolean;
  createdAt: number;
}

const STORAGE_KEY = "metronome-presets";

// crypto.randomUUID is not available in older Android WebViews (API < 33).
// Fallback to a stable-enough unique id.
function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Preferences.get({ key: STORAGE_KEY })
      .then(({ value }) => {
        if (cancelled) return;
        if (value) setPresets(JSON.parse(value));
      })
      .catch(() => {
        // ignore unavailable/corrupted storage, start with empty list
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (data: Preset[]) => {
    setPresets(data);
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(data) });
  }, []);

  const addPreset = useCallback(
    (
      name: string,
      bpm: number,
      volume: number,
      timeSignature: TimeSignature,
      subdivision: Subdivision,
      soundType: SoundType,
      accentFirstBeat: boolean,
    ) => {
      const preset: Preset = {
        id: generateId(),
        name,
        bpm,
        volume,
        timeSignature,
        subdivision,
        soundType,
        accentFirstBeat,
        createdAt: Date.now(),
      };
      const next = [...presets, preset];
      setPresets(next);
      void save(next);
    },
    [presets, save],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const next = presets.filter((p) => p.id !== id);
      setPresets(next);
      void save(next);
    },
    [presets, save],
  );

  return { presets, addPreset, deletePreset, loaded };
}
