import { X, Home, Bookmark, Info } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import pkg from "../../package.json";

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { label: "Accueil", icon: Home, path: "/" },
  { label: "Presets", icon: Bookmark, path: "/presets" },
  { label: "À propos", icon: Info, path: "/about" },
];

export function DrawerMenu({ open, onClose }: DrawerMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-72 glass z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Menu</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">MetronHome v{pkg.version}</p>
        </div>
      </div>
    </>
  );
}
