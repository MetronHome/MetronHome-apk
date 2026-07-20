import { Header } from "@/components/Header";
import { Heart } from "lucide-react";

const About = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 max-w-md mx-auto w-full px-4 py-0 flex flex-col items-center justify-center gap-3">
      <img src="/logo.svg" alt="MetronHome logo" className="w-30 h-30" />
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gradient">MetronHome</h2>
        <p className="text-sm text-muted-foreground">Version 2.1.1</p>
      </div>
      <div className="glass p-6 text-center space-y-3 max-w-sm">
        <p className="text-sm text-foreground/80">
          Un métronome précis et élégant, conçu pour les musiciens exigeants.
        </p>
        <p className="text-sm text-foreground/80">
          Utilise la Web Audio API pour une précision maximale du tempo.
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-2">
          Fait avec <Heart className="w-3 h-3 text-destructive" /> pour la musique
        </div>
      </div>
    </main>
  </div>
);

export default About;
