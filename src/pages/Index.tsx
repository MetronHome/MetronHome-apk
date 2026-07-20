import {
  Play,
  Square,
  Timer,
  Settings2,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useMetronomeContext } from "@/context/MetronomeContext";
import { useTapTempo } from "@/hooks/useTapTempo";
import { usePresets } from "@/hooks/usePresets";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { Header } from "@/components/Header";
import { BPMDisplay } from "@/components/BPMDisplay";
import { TempoControls } from "@/components/TempoControls";
import { VolumeControl } from "@/components/VolumeControl";
import { TapTempoButton } from "@/components/TapTempoButton";
import { MetronomeSettings } from "@/components/MetronomeSettings";
import { PresetSelector } from "@/components/PresetSelector";
import { AddPresetModal } from "@/components/AddPresetModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const metronome = useMetronomeContext();
  const { tap } = useTapTempo(metronome.setBpm);
  const { presets, addPreset, deletePreset } = usePresets();
  const { formatted, resetTimer } = useSessionTimer(metronome.isPlaying);
  const [showAddPreset, setShowAddPreset] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {metronome.isPlaying && metronome.visualFlashEnabled && (
        <div
          key={metronome.flashKey}
          className={`beat-flash ${metronome.currentBeat === 0 ? "beat-flash--accent" : ""}`}
          aria-hidden
        />
      )}
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 pb-6 flex flex-col gap-4">
        {/* Preset selector accordion + add button */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PresetSelector
              presets={presets}
              onLoad={(preset) => {
                metronome.setBpm(preset.bpm);
                metronome.setVolume(preset.volume);
                metronome.setTimeSignature(preset.timeSignature);
                metronome.setSubdivision(preset.subdivision);
                metronome.setSoundType(preset.soundType);
                metronome.setAccentFirstBeat(preset.accentFirstBeat);
              }}
              onDelete={deletePreset}
            />
          </div>
          <button
            onClick={() => setShowAddPreset(true)}
            className="w-9 h-9 shrink-0 rounded-xl glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Session Timer */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Timer className="w-3.5 h-3.5" />
          <span className="font-mono-display text-xs">{formatted}</span>
        </div>

        {/* BPM Display */}
        <div className="flex justify-center py-1">
          <BPMDisplay
            bpm={metronome.bpm}
            isPlaying={metronome.isPlaying}
            currentBeat={metronome.currentBeat}
            beatsPerMeasure={metronome.beatsPerMeasure}
          />
        </div>

        {/* Play/Stop Button */}
        <button
          onClick={metronome.toggle}
          className={`w-full py-3 rounded-2xl flex items-center justify-center gap-3 text-base font-semibold transition-all active:scale-[0.98] ${
            metronome.isPlaying
              ? "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"
              : "bg-primary/20 text-primary border border-primary/30 glow-primary hover:bg-primary/30"
          }`}
        >
          {metronome.isPlaying ? (
            <>
              <Square className="w-5 h-5" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Jouer
            </>
          )}
        </button>

        {/* Tempo Controls */}
        <TempoControls bpm={metronome.bpm} onBpmChange={metronome.setBpm} />

        {/* Volume */}
        <VolumeControl
          volume={metronome.volume}
          onVolumeChange={metronome.setVolume}
        />

        {/* Tap Tempo */}
        <TapTempoButton onTap={tap} />

        {/* Settings accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="settings" className="border-0">
            <AccordionTrigger className="glass px-4 py-3 rounded-2xl hover:no-underline text-sm text-muted-foreground [&[data-state=open]]:rounded-b-none">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Réglages
              </span>
            </AccordionTrigger>
            <AccordionContent className="glass border-t-0 rounded-b-2xl rounded-t-none px-0 pt-0 pb-0">
              <MetronomeSettings
                timeSignature={metronome.timeSignature}
                subdivision={metronome.subdivision}
                soundType={metronome.soundType}
                accentFirstBeat={metronome.accentFirstBeat}
                vibrationEnabled={metronome.vibrationEnabled}
                onTimeSignatureChange={metronome.setTimeSignature}
                onSubdivisionChange={metronome.setSubdivision}
                onSoundTypeChange={metronome.setSoundType}
                onAccentFirstBeatChange={metronome.setAccentFirstBeat}
                onVibrationChange={metronome.setVibrationEnabled}
                wakeLockEnabled={metronome.wakeLockEnabled}
                visualFlashEnabled={metronome.visualFlashEnabled}
                onWakeLockChange={metronome.setWakeLockEnabled}
                onVisualFlashChange={metronome.setVisualFlashEnabled}
                onReset={() => {
                  metronome.reset();
                  resetTimer();
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>

      {/* Add Preset Modal */}
      <AddPresetModal
        open={showAddPreset}
        onClose={() => setShowAddPreset(false)}
        onSave={(name) => {
          addPreset(
            name,
            metronome.bpm,
            metronome.volume,
            metronome.timeSignature,
            metronome.subdivision,
            metronome.soundType,
            metronome.accentFirstBeat,
          );
          setShowAddPreset(false);
        }}
      />
    </div>
  );
};

export default Index;
