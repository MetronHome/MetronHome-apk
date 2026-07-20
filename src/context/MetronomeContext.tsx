import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useMetronome } from "@/hooks/useMetronome";

type MetronomeApi = ReturnType<typeof useMetronome>;

const MetronomeContext = createContext<MetronomeApi | null>(null);

export function MetronomeProvider({ children }: { children: ReactNode }) {
  const metronome = useMetronome();
  return (
    <MetronomeContext.Provider value={metronome}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronomeContext(): MetronomeApi {
  const ctx = useContext(MetronomeContext);
  if (!ctx) {
    throw new Error("useMetronomeContext must be used within a MetronomeProvider");
  }
  return ctx;
}
