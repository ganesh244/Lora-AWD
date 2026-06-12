import React from 'react';

interface Props {
  level: number;
  max?: number;
  stageIndex?: number;
}

export const AWDGauge: React.FC<Props> = ({ level, max = 30, stageIndex = 1 }) => {
  // level: 0-30 cm absolute reading. 15 cm = soil surface.
  const percent = Math.min(Math.max((level / max) * 100, 0), 100);
  const isDraining = stageIndex >= 6;   // Maturity/Harvest → intentionally dry
  const isFlooded = level > 18;
  const isDry     = level <= 2;

  // Water colour:
  // Flooded → deep blue | Normal → sky blue | Draining/Dry → amber-tan
  const waterBg = isDry
    ? 'transparent'
    : isDraining
      ? 'linear-gradient(to top, #d97706 0%, #fbbf24 100%)'   // amber = draining
      : isFlooded
        ? 'linear-gradient(to top, #1d4ed8 0%, #3b82f6 100%)' // deep blue = flood
        : 'linear-gradient(to top, #2563eb 0%, #60a5fa 100%)'; // sky blue = normal

  // Plant colours shift when dry/harvest
  const plantColor = isDraining ? '#ca8a04' : '#16a34a';
  const plantColor2 = isDraining ? '#a16207' : '#15803d';

  return (
    <div className="relative flex items-end justify-center h-32 w-24 select-none ml-2">

      {/* Soil Background (Bottom Half) */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#795548]/10 rounded-xl border-t-2 border-[#795548]/20 z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#5d4037 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#5d4037]/10" />
      </div>

      {/* Paddy Plants (at Soil Surface) */}
      <div className="absolute bottom-[calc(50%-2px)] w-full flex justify-between px-1 z-10 pointer-events-none">
        {/* Left plant */}
        <svg width="28" height="42" viewBox="0 0 28 42" style={{ color: plantColor }} className="drop-shadow-sm origin-bottom animate-sway">
          <path d="M14 42 Q 4 22 0 5"    stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M14 42 Q 20 28 26 8"  stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M16 42 Q 16 22 14 2"  stroke={plantColor2} strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Grain head for harvest stage */}
          {isDraining && <ellipse cx="4" cy="7" rx="3" ry="7" fill="#eab308" className="animate-grain-droop" transform="rotate(-15 4 7)" />}
        </svg>
        {/* Right plant */}
        <svg width="28" height="42" viewBox="0 0 28 42" style={{ color: plantColor }} className="drop-shadow-sm origin-bottom animate-sway-delay transform scale-x-[-1]">
          <path d="M14 42 Q 4 22 0 5"    stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M14 42 Q 20 28 26 8"  stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M16 42 Q 16 22 14 2"  stroke={plantColor2} strokeWidth="2" fill="none" strokeLinecap="round" />
          {isDraining && <ellipse cx="4" cy="7" rx="3" ry="7" fill="#eab308" className="animate-grain-droop" transform="rotate(-15 4 7)" style={{ animationDelay: '0.5s' }} />}
        </svg>
      </div>

      {/* The AWD Pipe */}
      <div className="relative z-20 h-full w-8 bg-slate-50/70 border border-slate-300/50 shadow-lg ring-1 ring-slate-100/50 flex flex-col overflow-hidden backdrop-blur-md rounded-full">

        {/* Water Fill */}
        {!isDry && (
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out overflow-hidden"
            style={{ height: `${percent}%`, background: waterBg }}
          >
            {/* Animated surface ripple line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden">
              <div className="absolute inset-0 bg-white/60 animate-water-ripple rounded-full" />
              <div className="absolute inset-0 bg-white/30 animate-water-ripple-slow rounded-full" />
            </div>

            {/* Body highlight */}
            <div className="absolute top-0 left-1 right-1 h-full bg-gradient-to-r from-white/25 to-transparent" />

            {/* Rising bubbles — only when flooded */}
            {isFlooded && (
              <>
                <div className="absolute bottom-1 left-2 w-1 h-1 rounded-full bg-white/50 animate-bubble" />
                <div className="absolute bottom-2 right-2 w-0.5 h-0.5 rounded-full bg-white/40 animate-bubble-delay1" />
                <div className="absolute bottom-0 left-3 w-0.5 h-0.5 rounded-full bg-white/30 animate-bubble-delay2" />
              </>
            )}
          </div>
        )}

        {/* Dry state label */}
        {isDry && (
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-wide rotate-90 whitespace-nowrap">dry</span>
          </div>
        )}

        {/* Soil-level dashed line (15 cm mark) */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-[#795548]/40 pointer-events-none z-30"
          style={{ bottom: `${(15 / max) * 100}%` }}
        />

        {/* Perforations in lower half */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 flex flex-col justify-evenly py-2 items-center pointer-events-none opacity-30">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-1.5">
              <div className="w-1 h-1 bg-slate-600 rounded-full" />
              <div className="w-1 h-1 bg-slate-600 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Scale labels */}
      <div className="absolute -right-4 h-full flex flex-col justify-between py-2 text-[9px] font-bold text-slate-400 font-mono select-none">
        <span>30</span>
        <span className="text-[#5d4037] -ml-1">15</span>
        <span>0</span>
      </div>
    </div>
  );
};