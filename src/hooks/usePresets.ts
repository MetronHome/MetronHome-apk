import { useState, useCallback, useEffect } from "react";
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

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPresets(JSON.parse(stored));
    } catch {}
  }, []);

  const save = useCallback((data: Preset[]) => {
    setPresets(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        id: crypto.randomUUID(),
        name,
        bpm,
        volume,
        timeSignature,
        subdivision,
        soundType,
        accentFirstBeat,
        createdAt: Date.now(),
      };
      save([...presets, preset]);
    },
    [presets, save],
  );

  const deletePreset = useCallback(
    (id: string) => {
      save(presets.filter((p) => p.id !== id));
    },
    [presets, save],
  );

  return { presets, addPreset, deletePreset };
}
