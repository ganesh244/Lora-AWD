import React, { useState } from 'react';
import { Droplets, Check, CloudRain, AlertTriangle, ArrowDown, Sprout, Info, Lightbulb } from 'lucide-react';
import { WeatherData } from '../services/weatherService';

interface Props {
  level: number;
  weather: WeatherData | null;
  cropStage?: {
    name: string;
    index: number;
  };
}

export const IrrigationAdvice: React.FC<Props> = ({ level, weather, cropStage }) => {
  const [showRationale, setShowRationale] = useState(false);
  
  let advice = {
    type: 'good' as 'good' | 'warn' | 'critical' | 'info',
    text: 'Levels Optimal',
    subtext: 'Keep monitoring',
    rationale: 'Water levels are within the safe range.',
    smartTip: null as string | null,
    icon: <Check size={16} />
  };

  const isRainExpected = weather && (weather.rainChance > 50 || weather.rainForecast24h > 5);
  const isHighHeat = weather && weather.temp > 35;

  // Scale: 0-30cm Absolute
  // 15cm = Soil Surface (0 Relative)
  const relativeDepth = level - 15;
  const absDepth = Math.abs(relativeDepth).toFixed(0);

  const applyDefaultLogic = () => {
    if (level < 5) {
       // < 5cm absolute (< -10cm relative)
       if (isRainExpected) {
          advice = { 
              type: 'warn', 
              text: 'Critically Low', 
              subtext: `Rain expected. (-${absDepth}cm below soil)`, 
              rationale: 'Rain is forecast, but soil is currently too dry for most stages.',
              smartTip: 'Check if rain volume is enough to re-saturate soil (needs >20mm).',
              icon: <CloudRain size={16} /> 
          };
       } else {
          advice = { 
              type: 'critical', 
              text: 'Irrigate Now', 
              subtext: `Too low (-${absDepth}cm). Target: 17cm+.`, 
              rationale: 'Severe drying can lead to yield loss and soil cracking beyond recovery.',
              smartTip: 'Prioritize irrigation immediately to prevent soil cracking.',
              icon: <Droplets size={16} /> 
          };
       }
    } else if (level >= 5 && level < 15) {
       // 5-15cm absolute -> Safe AWD Zone
       advice = { 
           type: 'info', 
           text: 'AWD Drying', 
           subtext: `Water -${absDepth}cm below soil.`, 
           rationale: 'Alternate Wetting and Drying (AWD) saves water and improves root strength.',
           smartTip: null,
           icon: <ArrowDown size={16} /> 
       };
    } else if (level >= 15 && level < 17) {
       // 15-17cm absolute -> Saturated
       advice = { 
           type: 'info', 
           text: 'Saturated', 
           subtext: 'At soil surface. Target: 17-20cm.', 
           rationale: 'Soil is saturated. This is good for most vegetative stages.',
           smartTip: 'Good for applying fertilizer if weather is clear.',
           icon: <Droplets size={16} /> 
       };
    } else if (level >= 17 && level <= 25) {
       // 17-25cm absolute -> Good Flood
       advice = { 
           type: 'good', 
           text: 'Levels Good', 
           subtext: `Depth +${absDepth}cm above soil.`, 
           rationale: 'Ideal flooding depth suppressing weeds and supporting growth.',
           smartTip: null,
           icon: <Check size={16} /> 
       };
    } else {
       // > 25cm absolute -> High
       advice = { 
           type: 'warn', 
           text: 'High Water', 
           subtext: `Depth ${absDepth}cm. Check outlet.`, 
           rationale: 'Deep water hampers tillering and increases lodging risk.',
           smartTip: isRainExpected ? 'Rain incoming. Lower spillways to prevent overflow.' : 'Consider draining slightly to encourage tillering.',
           icon: <AlertTriangle size={16} /> 
       };
    }
  };

  if (cropStage) {
      const { index } = cropStage;

      // 0: Establishment
      if (index === 0) {
          if (level < 15) {
             advice = { type: 'critical', text: 'Low Water', subtext: 'Soil must be saturated.', rationale: 'Seedlings need consistent moisture to recover from transplant shock.', smartTip: 'Exposed soil allows weeds to germinate.', icon: <Droplets size={16} /> };
          } else if (level > 25) {
             advice = { type: 'warn', text: 'Too Deep', subtext: 'May drown seedlings.', rationale: 'Seedlings cannot breathe if fully submerged.', smartTip: 'Deep water reduces herbicide efficacy.', icon: <AlertTriangle size={16} /> };
          } else {
             advice = { type: 'good', text: 'Levels Optimal', subtext: 'Good for establishment.', rationale: 'Shallow water controls weeds without drowning seedlings.', smartTip: null, icon: <Check size={16} /> };
          }
      }
      // 1: Tillering - AWD Allowed
      else if (index === 1) {
          applyDefaultLogic();
          if (advice.type === 'good') {
             advice.subtext = 'Good for tillering.';
             advice.rationale = 'Shallow flood promotes active tillering. AWD is safe.';
          }
      }
      // 2: Stem Elongation - AWD Recommended
      else if (index === 2) {
           if (level < 5) {
               advice = { type: 'warn', text: 'Too Dry', subtext: 'Irrigate if >3 days dry.', rationale: 'Extended dryness can stress the plant before flowering.', smartTip: null, icon: <Droplets size={16} /> };
           } else if (level < 15) {
               advice = { type: 'info', text: 'AWD Drying', subtext: 'Good for root depth.', rationale: 'Mild drying pushes roots deeper before the reproductive phase.', smartTip: 'Check for soil cracking - irrigate if cracks >1cm.', icon: <ArrowDown size={16} /> };
           } else if (level > 22) {
               advice = { type: 'info', text: 'Allow to Drain', subtext: 'Let water subside.', rationale: 'Deep water is unnecessary; save irrigation water.', smartTip: null, icon: <ArrowDown size={16} /> };
           } else {
               advice = { type: 'good', text: 'Levels OK', subtext: 'Monitor drying cycle.', rationale: 'Water levels are sufficient for elongation.', smartTip: null, icon: <Check size={16} /> };
           }
      }
      // 3: Booting / Panicle Initiation - FLOOD REQUIRED
      else if (index === 3) {
           if (level < 15) {
               advice = { type: 'critical', text: 'Flood Required', subtext: 'Crop stress! Do not dry.', rationale: 'Water stress now causes abortion of spikelets (yield loss).', smartTip: 'This is the most critical stage for water.', icon: <AlertTriangle size={16} /> };
           } else if (level < 18) {
               advice = { type: 'warn', text: 'Increase Level', subtext: 'Target 5cm standing water.', rationale: 'Standing water buffers temperature and ensures panicle development.', smartTip: 'Ensure field is fully submerged.', icon: <Droplets size={16} /> };
           } else if (level > 30) { 
               advice = { type: 'warn', text: 'High Water', subtext: 'Check drainage.', rationale: 'Excessive depth is wasteful but not critically harmful.', smartTip: null, icon: <AlertTriangle size={16} /> };
           } else {
               advice = { type: 'good', text: 'Optimal Flood', subtext: 'Crucial for panicle.', rationale: 'Perfect conditions for panicle initiation.', smartTip: null, icon: <Check size={16} /> };
           }
      }
      // 4: Flowering - FLOOD REQUIRED
      else if (index === 4) {
          if (level < 15) {
               advice = { type: 'critical', text: 'Water Needed', subtext: 'Stress causes sterility.', rationale: 'Drought during flowering causes high sterility (empty grains).', smartTip: isHighHeat ? 'High heat detected! Flood to cool the canopy.' : null, icon: <AlertTriangle size={16} /> };
           } else {
               advice = { type: 'good', text: 'Optimal', subtext: 'Maintain during flowering.', rationale: 'Stable water supply is essential for pollination.', smartTip: 'Avoid disturbing the water or plants during pollination (mid-day).', icon: <Check size={16} /> };
           }
      }
      // 5: Grain Filling (Milk/Dough) - Saturated / Shallow
      else if (index === 5) {
          if (level < 15) {
              advice = { type: 'info', text: 'Keep Moist', subtext: 'Saturation is sufficient.', rationale: 'Standing water is not strictly needed, but soil must stay moist.', smartTip: null, icon: <Droplets size={16} /> };
          } else if (level > 25) {
              advice = { type: 'info', text: 'Can Lower', subtext: 'Deep water not needed.', rationale: 'You can stop irrigation to prepare for ripening.', smartTip: 'Start planning terminal drainage.', icon: <ArrowDown size={16} /> };
          } else {
              advice = { type: 'good', text: 'Good Levels', subtext: 'Filling stage.', rationale: 'Moisture is sufficient for grain filling.', smartTip: null, icon: <Check size={16} /> };
          }
      }
      // 6+: Maturity - Drain
      else if (index >= 6) {
          if (level > 15) {
              advice = { type: 'warn', text: 'Drain Field', subtext: 'Prepare for harvest.', rationale: 'Draining ensures uniform ripening and easier harvesting.', smartTip: 'Open all drainage outlets.', icon: <ArrowDown size={16} /> };
          } else {
              advice = { type: 'good', text: 'Ready', subtext: 'Field is dry.', rationale: 'Field is correctly drained for harvest.', smartTip: null, icon: <Sprout size={16} /> };
          }
      }
  } else {
      applyDefaultLogic();
  }

  const colors = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const iconColors = {
    good: 'bg-emerald-200/50',
    warn: 'bg-amber-200/50',
    critical: 'bg-red-200/50',
    info: 'bg-blue-200/50',
  };

  return (
    <div className="mt-3">
        <div 
            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${colors[advice.type]} transition-all cursor-pointer`}
            onClick={() => setShowRationale(!showRationale)}
        >
             <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${iconColors[advice.type]} shrink-0`}>
                    {advice.icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-tight leading-tight">{advice.text}</span>
                    <span className="text-[10px] opacity-80 font-medium leading-tight">{advice.subtext}</span>
                </div>
             </div>
             <Info size={14} className="opacity-50 hover:opacity-100" />
        </div>
        
        {/* Expandable Rationale / Tip */}
        {showRationale && (
            <div className={`mt-1 p-2.5 rounded-lg text-[10px] leading-relaxed font-medium animate-in fade-in slide-in-from-top-1 ${colors[advice.type].replace('bg-', 'bg-opacity-50 bg-')}`}>
                <span className="font-bold uppercase opacity-70 block mb-0.5">Why?</span>
                {advice.rationale}
                
                {advice.smartTip && (
                    <div className="mt-2 pt-2 border-t border-black/5 flex gap-1.5 items-start">
                         <Lightbulb size={12} className="shrink-0 mt-0.5" />
                         <span className="italic">{advice.smartTip}</span>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};