
import React, { useState } from 'react';
import { Droplets, Check, CloudRain, ArrowDown, Info, Lightbulb, XCircle } from 'lucide-react';
import { WeatherData } from '../services/weatherService';

interface Props {
  level: number;
  weather: WeatherData | null;
  cropStage?: {
    name: string;
    index: number;
  };
  plotName?: string;
}

interface AdviceState {
    type: 'good' | 'warn' | 'critical' | 'info';
    text: string;
    subtext: string;
    rationale: string;
    smartTip: string | null;
    icon: React.ReactNode;
}

export const IrrigationAdvice: React.FC<Props> = ({ level, weather, cropStage }) => {
  const [showRationale, setShowRationale] = useState(false);

  // --- Constants & Thresholds ---
  // Sensor Depth Mapping:
  // 0cm = Bottom of pipe (Dry)
  // 15cm = Soil Surface
  // 30cm = Top of gauge
  
  const SOIL_LEVEL = 15;
  
  // Load User Thresholds (with defaults)
  let THRESHOLD_LOW = 5;
  let THRESHOLD_HIGH = 20;
  
  try {
      const saved = localStorage.getItem('app_thresholds');
      if (saved) {
          const { low, high } = JSON.parse(saved);
          if (!isNaN(low)) THRESHOLD_LOW = low;
          if (!isNaN(high)) THRESHOLD_HIGH = high;
      }
  } catch(e) {}

  // Weather Factors
  const rainChance = weather?.rainChance || 0;
  const rainForecast = weather?.rainForecast24h || 0;
  // Consider rain "Expected" if chance > 50% OR significant volume (>5mm)
  const isRainExpected = rainChance > 50 || rainForecast > 5; 
  // const isHighHeat = (weather?.temp || 0) > 35; // Unused for now

  // Advice State
  let advice: AdviceState = {
    type: 'good',
    text: 'Optimal Level',
    subtext: 'Maintain this level',
    rationale: 'Water levels are within the target range.',
    smartTip: null,
    icon: <Check size={16} />
  };

  const setAdvice = (
      type: 'good' | 'warn' | 'critical' | 'info', 
      text: string, 
      subtext: string, 
      rationale: string, 
      tip: string | null, 
      icon: React.ReactNode
  ) => {
    advice = { type, text, subtext, rationale, smartTip: tip, icon };
  };

  const evaluate = () => {
    // 1. Get Stage Info
    const stageIndex = cropStage?.index ?? 1; // Default to Tillering logic
    const stageName = cropStage?.name ?? "Vegetative";

    // 2. Identify Stage Requirements
    const needsFlood = [0, 3, 4].includes(stageIndex); // Establishment, Booting, Flowering
    const allowAWD = [1, 2, 5].includes(stageIndex);   // Tillering, Elongation, Dough
    const needsDrain = [6, 7].includes(stageIndex);    // Ripening, Harvest

    // --- PRIORITY 1: HARVEST PREP (Drainage) ---
    if (needsDrain) {
        if (level > SOIL_LEVEL) {
             return setAdvice(
                 'warn', 
                 'Drain Water', 
                 'Target: 0cm (Dry)', 
                 `Stage ${stageName} requires dry soil for ripening. Gauge is at ${level}cm.`,
                 'Open outlets to drain completely.',
                 <ArrowDown size={16} />
             );
        } else {
             return setAdvice(
                 'good',
                 'Keep Dry',
                 'Ready for Harvest',
                 `Field is dry (Gauge ${level}cm) as required for ${stageName}.`,
                 null,
                 <Check size={16} />
             );
        }
    }

    // --- PRIORITY 2: HIGH WATER SAFETY ---
    if (level > THRESHOLD_HIGH) { 
        if (isRainExpected) {
             return setAdvice(
                 'warn',
                 'Drain Water',
                 `Drain to ${SOIL_LEVEL}cm`,
                 `High level (${level}cm) + Rain Forecast (${rainChance}%). Risk of overflow.`,
                 `Lower spillway to ${SOIL_LEVEL}cm mark.`,
                 <ArrowDown size={16} />
             );
        } else {
             return setAdvice(
                 'info',
                 'Stop Irrigation',
                 `Level > ${THRESHOLD_HIGH}cm`,
                 `Water depth (${level}cm) exceeds your upper limit (${THRESHOLD_HIGH}cm).`,
                 'Let water subside naturally. Do not add water.',
                 <XCircle size={16} />
             );
        }
    }

    // --- PRIORITY 3: CRITICAL LOW ---
    if (level < THRESHOLD_LOW) {
        if (isRainExpected) {
            return setAdvice(
                'warn',
                'Delay Irrigation',
                `Wait for Rain (${rainChance}%)`,
                `Level is low (${level}cm) but rain is expected.`,
                'Monitor closely. If rain fails, irrigate immediately.',
                <CloudRain size={16} />
            );
        } else {
            return setAdvice(
                'critical',
                'Start Irrigation',
                `Target: ${SOIL_LEVEL}cm`,
                `Critical low level (${level}cm). Below limit (${THRESHOLD_LOW}cm).`,
                `Irrigate immediately to restore soil saturation (${SOIL_LEVEL}cm).`,
                <Droplets size={16} />
            );
        }
    }

    // --- PRIORITY 4: INTERMEDIATE LEVELS ---
    
    // CASE A: Flood Required (Establishment, Booting, Flowering)
    if (needsFlood) {
        if (level < SOIL_LEVEL) { // Below soil surface
             if (isRainExpected) {
                 return setAdvice('warn', 'Delay Irrigation', 'Wait for Rain', `Water below soil surface (${level}cm), but rain expected.`, null, <CloudRain size={16} />);
             }
             return setAdvice(
                 'warn',
                 'Start Irrigation',
                 'Target: 18cm',
                 `${stageName} stage requires standing water. Current: ${level}cm (Below Soil).`,
                 'Top up water to 18cm gauge reading.',
                 <Droplets size={16} />
             );
        } else {
             // Good Flood
             return setAdvice(
                 'good',
                 'Optimal Level',
                 'Maintain this Level',
                 `Current level (${level}cm) is perfect for ${stageName}.`,
                 null,
                 <Check size={16} />
             );
        }
    }

    // CASE B: AWD Allowed (Tillering, Elongation, Dough)
    if (allowAWD) {
        if (level < SOIL_LEVEL) { 
            // Below Soil, but above critical threshold
            return setAdvice(
                'info',
                'Stop Irrigation',
                `Start Irrigation at ${THRESHOLD_LOW}cm`,
                `AWD Phase: Allow water to drop. Current: ${level}cm. Re-irrigate ONLY when it hits ${THRESHOLD_LOW}cm.`,
                'Allowing soil to aerate strengthens roots.',
                <ArrowDown size={16} />
            );
        } else {
            // Above Soil, below high threshold
            return setAdvice(
                'good',
                'Stop Irrigation',
                'Maintain > 15cm',
                `Level (${level}cm) is sufficient. No need to add water yet.`,
                `Let level drop naturally to ${THRESHOLD_LOW}cm before next irrigation.`,
                <Check size={16} />
            );
        }
    }
  };

  evaluate();

  // Visual Styles
  const colors = {
    good: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    warn: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    critical: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
    info: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
  };

  const iconColors = {
    good: 'bg-emerald-200',
    warn: 'bg-amber-200',
    critical: 'bg-red-200',
    info: 'bg-blue-200',
  };

  return (
    <div className="mt-3">
        <div 
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border ${colors[advice.type]} transition-all cursor-pointer shadow-sm`}
            onClick={() => setShowRationale(!showRationale)}
        >
             <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${iconColors[advice.type]} text-black/60 shrink-0`}>
                    {advice.icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-extrabold uppercase tracking-tight leading-none">{advice.text}</span>
                    <span className="text-xs font-semibold opacity-80 mt-1">{advice.subtext}</span>
                </div>
             </div>
             <Info size={16} className="opacity-50 hover:opacity-100" />
        </div>
        
        {showRationale && (
            <div className={`mt-2 p-3 rounded-lg text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 ${colors[advice.type].replace('bg-', 'bg-opacity-40 bg-')}`}>
                <div className="flex gap-1.5 mb-2">
                    <span className="font-bold uppercase opacity-70">Reason:</span>
                    <span className="font-medium">{advice.rationale}</span>
                </div>
                
                {advice.smartTip && (
                    <div className="pt-2 border-t border-black/5 flex gap-1.5 items-start text-emerald-900/80">
                         <Lightbulb size={14} className="shrink-0 mt-0.5" />
                         <span className="italic font-medium">{advice.smartTip}</span>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
