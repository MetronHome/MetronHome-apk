import { Header } from "@/components/Header";
import { PresetManager } from "@/components/PresetManager";
import { usePresets } from "@/hooks/usePresets";
import { useMetronomeContext } from "@/context/MetronomeContext";

const Presets = () => {
  const { presets, addPreset, deletePreset } = usePresets();
  const metronome = useMetronomeContext();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <PresetManager
          presets={presets}
          currentBpm={metronome.bpm}
          currentVolume={metronome.volume}
          onAdd={(name, bpm, volume) =>
            addPreset(name, bpm, volume, "4/4", "quarter", "click", true)
          }
          onDelete={deletePreset}
          onLoad={(preset) => {
            metronome.setBpm(preset.bpm);
            metronome.setVolume(preset.volume);
            metronome.setTimeSignature(preset.timeSignature);
            metronome.setSubdivision(preset.subdivision);
            metronome.setSoundType(preset.soundType);
            metronome.setAccentFirstBeat(preset.accentFirstBeat);
          }}
        />
      </main>
    </div>
  );
};

export default Presets;
