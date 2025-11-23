import React from 'react';

interface Props {
  level: number;
  max?: number;
}

export const AWDGauge: React.FC<Props> = ({ level, max = 30 }) => {
  // level is 0-30cm absolute reading from the sensor
  // 15cm is assumed to be the Soil Surface based on AWD pipe installation
  
  // Clamp percentage for bar height
  const percent = Math.min(Math.max((level / max) * 100, 0), 100);

  return (
    <div className="relative flex items-end justify-center h-32 w-24 select-none ml-2">
       
       {/* Soil Background (Bottom Half) */}
       <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#795548]/10 rounded-xl border-t-2 border-[#795548]/20 z-0 flex items-center justify-center overflow-hidden">
            {/* Soil texture dots */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#5d4037 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
            {/* Gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#5d4037]/10"></div>
       </div>

       {/* Paddy Plants (At Soil Surface) */}
       <div className="absolute bottom-[calc(50%-2px)] w-full flex justify-between px-1 z-10 pointer-events-none">
           {/* Left Plant Cluster */}
           <svg width="28" height="42" viewBox="0 0 28 42" className="text-emerald-600 drop-shadow-sm origin-bottom">
               <path d="M14 42 Q 4 22 0 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
               <path d="M14 42 Q 20 28 26 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
               <path d="M16 42 Q 16 22 14 2" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round" />
           </svg>
           {/* Right Plant Cluster */}
           <svg width="28" height="42" viewBox="0 0 28 42" className="text-emerald-600 drop-shadow-sm origin-bottom transform scale-x-[-1]">
               <path d="M14 42 Q 4 22 0 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
               <path d="M14 42 Q 20 28 26 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
               <path d="M16 42 Q 16 22 14 2" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round" />
           </svg>
       </div>

       {/* The Pipe */}
       <div className="relative z-20 h-full w-8 bg-slate-50/80 rounded-full border border-slate-300 shadow-lg ring-1 ring-slate-100/50 flex flex-col overflow-hidden backdrop-blur-[1px]">
           
           {/* Water Fill */}
           <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500/80 transition-all duration-1000 ease-out"
                style={{ height: `${percent}%` }}
           >
                {/* Surface Reflection Line */}
                <div className="absolute top-0 w-full h-[1px] bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                {/* Body Highlight */}
                <div className="absolute top-0 left-1 right-1 h-full bg-gradient-to-r from-white/20 to-transparent"></div>
           </div>

           {/* Perforations Overlay (Bottom Half) */}
           <div className="absolute bottom-0 left-0 right-0 h-1/2 flex flex-col justify-evenly py-2 items-center pointer-events-none opacity-40">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-1.5">
                        <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                    </div>
                ))}
           </div>
       </div>

       {/* Gauge Scale Labels */}
       <div className="absolute -right-3 h-full flex flex-col justify-between py-2 text-[9px] font-bold text-slate-400 font-mono select-none">
            <span>30</span>
            <span className="text-[#5d4037] -ml-1">Soil</span>
            <span>0</span>
       </div>
    </div>
  );
};