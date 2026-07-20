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
