import { Hand } from "lucide-react";

interface TapTempoButtonProps {
  onTap: () => void;
}

export function TapTempoButton({ onTap }: TapTempoButtonProps) {
  return (
    <button
      onClick={onTap}
      className="glass p-4 w-full flex items-center justify-center gap-2 text-foreground hover:text-primary transition-all active:scale-95 active:bg-primary/10"
    >
      <Hand className="w-5 h-5" />
      <span className="text-sm font-medium uppercase tracking-wider">Tap Tempo</span>
    </button>
  );
}
