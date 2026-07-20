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

  const readFromStorage = useCallback(async (): Promise<Preset[]> => {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Preset[]) : [];
    } catch {
      // corrupted/unavailable storage: start fresh rather than crashing
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    readFromStorage()
      .then((data) => {
        if (cancelled) return;
        setPresets(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [readFromStorage]);

  const save = useCallback(async (data: Preset[]) => {
    setPresets(data);
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(data) });
  }, []);

  const addPreset = useCallback(
    async (
      name: string,
      bpm: number,
      volume: number,
      timeSignature: TimeSignature,
      subdivision: Subdivision,
      soundType: SoundType,
      accentFirstBeat: boolean,
    ) => {
      // Read fresh from storage first to avoid losing concurrent writes
      const current = await readFromStorage();
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
      await save([...current, preset]);
    },
    [readFromStorage, save],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const current = await readFromStorage();
      await save(current.filter((p) => p.id !== id));
    },
    [readFromStorage, save],
  );

  return { presets, addPreset, deletePreset, loaded };
}
