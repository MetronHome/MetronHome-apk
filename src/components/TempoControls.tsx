interface TempoControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

export function TempoControls({ bpm, onBpmChange }: TempoControlsProps) {
  const min = 30;
  const max = 300;
  const progress = ((bpm - min) / (max - min)) * 100;

  return (
    <div className="glass p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">Tempo</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBpmChange(Math.max(30, bpm - 1))}
            className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center text-foreground hover:text-primary transition-colors active:scale-95"
          >
            −
          </button>
          <input
            type="number"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="w-14 text-center bg-muted/50 rounded-lg py-1 font-mono-display text-sm text-foreground border-0 outline-none focus:ring-1 focus:ring-primary"
            min={30}
            max={300}
          />
          <button
            onClick={() => onBpmChange(Math.min(300, bpm + 1))}
            className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center text-foreground hover:text-primary transition-colors active:scale-95"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-full"
          style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
