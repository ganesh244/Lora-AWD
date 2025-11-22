import React from 'react';

interface Props {
  level: number;
  max?: number;
}

export const AWDGauge: React.FC<Props> = ({ level, max = 30 }) => {
  // level is 0-30cm absolute reading from the sensor
  // 15cm is assumed to be the Soil Surface based on AWD pipe installation
  const soilLevel = 15;
  
  // Clamp percentage for bar width
  const percent = Math.min(Math.max((level / max) * 100, 0), 100);
  const soilPercent = (soilLevel / max) * 100;

  return (
    <div className="w-full mt-3 mb-2">
      {/* Labels */}
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5 px-1">
        <span>0cm (Bot)</span>
        <span className="text-emerald-600">Soil (15cm)</span>
        <span>30cm (Top)</span>
      </div>
      
      {/* Gauge Bar */}
      <div className="relative h-5 bg-slate-100 rounded-full border border-slate-300 overflow-hidden shadow-inner">
        
        {/* Background Markings */}
        <div className="absolute inset-0 flex">
            {/* Below Soil Area */}
            <div className="w-1/2 h-full bg-[#e2e0dc] border-r border-slate-300 relative" title="Below Soil">
                 {/* Hash marks for earth */}
                 <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }}></div>
            </div>
            {/* Above Soil Area */}
            <div className="w-1/2 h-full bg-white" title="Above Soil"></div>
        </div>

        {/* Soil Line Marker */}
        <div 
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-20"
            style={{ left: `${soilPercent}%` }}
        ></div>

        {/* Water Fill */}
        <div 
            className="absolute top-0 left-0 bottom-0 bg-blue-500/90 transition-all duration-1000 ease-out"
            style={{ width: `${percent}%` }}
        >
             {/* Glint/Reflection */}
             <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/40"></div>
        </div>
      </div>
    </div>
  );
};