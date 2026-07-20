import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { MetronomeProvider } from "@/context/MetronomeContext";
import Index from "./pages/Index.tsx";
import Presets from "./pages/Presets.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = () => (
  <TooltipProvider>
    <MetronomeProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/presets" element={<Presets />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MetronomeProvider>
  </TooltipProvider>
);

export default App;
