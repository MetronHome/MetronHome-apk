import { useEffect, useRef } from "react";

interface BPMDisplayProps {
  bpm: number;
  isPlaying: boolean;
  currentBeat: number;
  beatsPerMeasure: number;
}

export function BPMDisplay({ bpm, isPlaying, currentBeat, beatsPerMeasure }: BPMDisplayProps) {
  const pulseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying && pulseRef.current) {
      pulseRef.current.classList.remove("pulse-beat");
      void pulseRef.current.offsetWidth;
      pulseRef.current.classList.add("pulse-beat");
    }
  }, [currentBeat, isPlaying]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pulse ring */}
      <div className="relative flex items-center justify-center">
        {isPlaying && (
          <div className="absolute w-32 h-32 rounded-full border-2 border-primary/30 animate-pulse-ring" />
        )}
        <div
          ref={pulseRef}
          className={`w-28 h-28 rounded-full glass flex items-center justify-center transition-all duration-100 ${
            isPlaying ? "glow-primary" : ""
          }`}
        >
          <span className="font-mono-display text-5xl font-bold text-primary tabular-nums">
            {bpm}
          </span>
        </div>
      </div>

      <span className="text-xs text-muted-foreground uppercase tracking-widest">BPM</span>

      {/* Beat indicators */}
      <div className="flex gap-1.5">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-100 ${
              isPlaying && currentBeat === i
                ? i === 0
                  ? "bg-primary scale-125 glow-primary"
                  : "bg-primary/80 scale-110"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
