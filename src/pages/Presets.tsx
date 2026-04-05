import { Header } from "@/components/Header";
import { PresetManager } from "@/components/PresetManager";
import { usePresets } from "@/hooks/usePresets";

const Presets = () => {
  const { presets, addPreset, deletePreset } = usePresets();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <PresetManager
          presets={presets}
          currentBpm={120}
          currentVolume={0.8}
          onAdd={(name, bpm, volume) =>
            addPreset(name, bpm, volume, "4/4", "quarter", "click", true)
          }
          onDelete={deletePreset}
          onLoad={() => {}}
        />
      </main>
    </div>
  );
};

export default Presets;
