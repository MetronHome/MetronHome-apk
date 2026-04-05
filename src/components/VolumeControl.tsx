import { Volume2 } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (v: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const progress = volume * 100;

  return (
    <div className="glass p-3">
      <div className="flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="flex-1"
          style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
        />
        <span className="text-xs font-mono-display text-muted-foreground w-10 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
