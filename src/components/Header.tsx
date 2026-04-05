import { useState } from "react";
import { Menu } from "lucide-react";
import { DrawerMenu } from "./DrawerMenu";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-8" />
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="MetronHome logo"
              className="w-6 h-6"
            />
            <h1 className="text-lg font-bold tracking-tight text-gradient">MetronHome</h1>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>
      <DrawerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
