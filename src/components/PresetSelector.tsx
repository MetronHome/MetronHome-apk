import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import type { Preset } from "@/hooks/usePresets";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PresetSelectorProps {
  presets: Preset[];
  onLoad: (preset: Preset) => void;
  onDelete: (id: string) => void;
}

export function PresetSelector({ presets, onLoad, onDelete }: PresetSelectorProps) {
  const [openValue, setOpenValue] = useState<string>("");

  if (presets.length === 0) {
    return (
      <div className="glass-subtle px-4 py-2 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
        <Bookmark className="w-3.5 h-3.5" />
        Aucun preset
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      value={openValue}
      onValueChange={setOpenValue}
    >
      <AccordionItem value="presets" className="border-0">
        <AccordionTrigger className="glass-subtle px-4 py-2 rounded-xl hover:no-underline text-sm [&[data-state=open]]:rounded-b-none">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Bookmark className="w-3.5 h-3.5" />
            Presets ({presets.length})
          </span>
        </AccordionTrigger>
        <AccordionContent className="glass-subtle border-t border-border/20 rounded-b-xl px-0 pt-0 pb-0">
          <div className="max-h-40 overflow-y-auto">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/5 transition-colors cursor-pointer group"
                onClick={() => {
                  onLoad(preset);
                  setOpenValue("");
                }}
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.bpm} BPM · {Math.round(preset.volume * 100)}%
                    {preset.timeSignature && ` · ${preset.timeSignature}`}
                    {preset.subdivision && ` · ${
                      preset.subdivision === "quarter" ? "Noires" :
                      preset.subdivision === "eighth" ? "Croches" : "Triolets"
                    }`}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(preset.id);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
