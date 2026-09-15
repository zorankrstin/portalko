import { Radar, Car, Sun, Mountain, ShieldAlert } from 'lucide-react';

interface TickerProps {
  onOpenRls: () => void;
}

export function Ticker({ onOpenRls }: TickerProps) {
  return (
    <section className="w-full bg-surface-container-low px-space-md lg:px-margin-desktop py-2.5 border-b border-surface-container/60">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-space-sm text-on-surface-variant font-label-md text-label-md">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
          <span className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full">
            <Radar className="w-[1em] h-[1em] text-xs text-primary animate-pulse" /> Živo • Slovenija
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Car className="w-[1em] h-[1em] text-sm text-primary" /> DARS A1: Brez večjih zastojev (Šentilj - Koper)
          </span>
          <span className="text-outline-variant">•</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Sun className="w-[1em] h-[1em] text-sm text-secondary" /> Ljubljana 16°C • Kredarica -2°C (Sončno)
          </span>
          <span className="text-outline-variant">•</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Mountain className="w-[1em] h-[1em] text-sm text-tertiary-container" /> Triglav plazovna nevarnost: 2. stopnja
          </span>
        </div>
        <button 
          onClick={onOpenRls}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all shadow-sm" type="button"
        >
          <ShieldAlert className="w-[1em] h-[1em] text-sm text-primary" />
          <span>RLS Varnost & Vloge</span>
          <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
        </button>
      </div>
    </section>
  );
}
