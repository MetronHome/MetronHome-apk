import { useState } from "react";
import { Plus, Trash2, Bookmark } from "lucide-react";
import type { Preset } from "@/hooks/usePresets";

interface PresetManagerProps {
  presets: Preset[];
  currentBpm: number;
  currentVolume: number;
  onAdd: (name: string, bpm: number, volume: number) => void;
  onDelete: (id: string) => void;
  onLoad: (preset: Preset) => void;
}

export function PresetManager({
  presets,
  currentBpm,
  currentVolume,
  onAdd,
  onDelete,
  onLoad,
}: PresetManagerProps) {
  const [name, setName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), currentBpm, currentVolume);
    setName("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Bookmark className="w-4 h-4" /> Presets
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAdd && (
        <div className="glass p-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            placeholder="Nom du preset..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
          >
            Sauver
          </button>
        </div>
      )}

      {presets.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Aucun preset. Créez-en un !
        </p>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="glass p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors group"
              onClick={() => onLoad(preset)}
            >
              <div>
                <div className="text-sm font-medium text-foreground">{preset.name}</div>
                <div className="text-xs text-muted-foreground">
                  {preset.bpm} BPM · {Math.round(preset.volume * 100)}%
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(preset.id);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
