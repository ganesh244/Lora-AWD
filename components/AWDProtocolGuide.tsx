import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Droplets, CheckCircle, Clock, Flower, Leaf, ChevronDown } from 'lucide-react';
import { WeatherData } from '../services/weatherService';
import { saveCloudSetting } from '../services/dataService';

interface Props {
    transplantDate: string;   // ISO date string from CropConfig
    currentLevel: number;     // cm (sensor reading)
    weather?: WeatherData | null;
    sensorId: string;             // needed to namespace cloud key
    cloudSoilType?: string;       // restored from cloud settings by App.tsx
}

// ── AWD Protocol phases (source: AWD Comprehensive Technical Guide) ──────────
const AWD_PHASES = [
    {
        id: 'establishment',
        label: 'Establishment',
        weekRange: '0–2 wks',
        weeks: [0, 1],
        color: 'bg-slate-400',
        lightColor: 'bg-slate-100',
        textColor: 'text-slate-600',
        icon: Leaf,
        protocol: 'Continuous flooding',
        depth: 'Keep 3–5 cm standing water',
        awdActive: false,
        detail: 'No AWD yet. Maintain continuous standing water (3–5 cm) to allow transplant recovery and root establishment. Install your pani pipe during this period and test it — but do not start AWD cycles.',
        critical: false,
    },
    {
        id: 'awd_start',
        label: 'AWD Begins',
        weekRange: '2–8 wks',
        weeks: [2, 3, 4, 5, 6, 7],
        color: 'bg-emerald-500',
        lightColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        icon: Droplets,
        protocol: 'AWD cycles active',
        depth: 'Re-irrigate at −15 cm',
        awdActive: true,
        detail: 'Start AWD cycles. Monitor your pani pipe daily (best time: 6–8 AM). When water drops to 15 cm below soil surface → re-flood to 5 cm above surface. Cycle typically repeats every 3–7 days depending on soil type and weather.',
        critical: false,
    },
    {
        id: 'flowering',
        label: 'Flowering',
        weekRange: '8–10 wks',
        weeks: [8, 9],
        color: 'bg-red-500',
        lightColor: 'bg-red-50',
        textColor: 'text-red-700',
        icon: Flower,
        protocol: 'STOP AWD — flood 5 cm',
        depth: 'Continuous 5 cm — non-negotiable',
        awdActive: false,
        detail: '⚠️ CRITICAL: Stop AWD completely. Maintain continuous 5 cm standing water from 1 week before heading to 1 week after peak flowering. Water stress during this period causes spikelet sterility and can reduce yield by up to 50%. Check water twice daily.',
        critical: true,
    },
    {
        id: 'grain_fill',
        label: 'Grain Filling',
        weekRange: '10–14 wks',
        weeks: [10, 11, 12, 13],
        color: 'bg-amber-500',
        lightColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        icon: Droplets,
        protocol: 'AWD resumes',
        depth: 'Re-irrigate at −15 cm',
        awdActive: true,
        detail: 'Resume standard AWD cycles after flowering. Moderate water stress during this phase actually improves grain quality and reduces lodging. Continue daily monitoring.',
        critical: false,
    },
    {
        id: 'preharvest',
        label: 'Pre-Harvest Drain',
        weekRange: '14–16 wks',
        weeks: [14, 15],
        color: 'bg-slate-500',
        lightColor: 'bg-slate-50',
        textColor: 'text-slate-600',
        icon: Clock,
        protocol: 'Final drainage',
        depth: 'Stop irrigation, drain fully',
        awdActive: false,
        detail: 'Stop all irrigation 7–10 days before harvest once grains reach physiological maturity (grain moisture declining). Open drainage channels and allow complete field drying. This improves grain quality, reduces drying costs, and protects machinery during harvest.',
        critical: false,
    },
];

// ── Soil-type thresholds (source: AWD Technical Guide Table) ─────────────────
const SOIL_TYPES = [
    {
        key: 'clay',
        label: 'Clay / Heavy Clay',
        desc: 'Low infiltration, good water retention. Longer AWD cycles.',
        baseThreshold: 15,
        cycleRange: '5–10 days',
    },
    {
        key: 'loamy',
        label: 'Loamy / Silty',
        desc: 'Standard — most Telangana fields.',
        baseThreshold: 15,
        cycleRange: '3–6 days',
    },
    {
        key: 'sandy',
        label: 'Sandy / Light',
        desc: 'High infiltration, fast drainage. Shorter, more frequent cycles.',
        baseThreshold: 12,
        cycleRange: '1–4 days',
    },
];

function getWeatherAdjustment(temp: number, rainChance: number): { adj: number; reason: string } {
    if (rainChance >= 60) return { adj: +2, reason: 'Rain likely — extend threshold slightly' };
    if (temp >= 38) return { adj: -3, reason: 'High heat (≥38°C) — raise trigger to avoid stress' };
    if (temp >= 35) return { adj: -2, reason: 'Hot weather (≥35°C) — raise trigger' };
    if (temp < 22) return { adj: +2, reason: 'Cool weather — lower evapotranspiration, extend threshold' };
    return { adj: 0, reason: 'Normal conditions' };
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AWDProtocolGuide: React.FC<Props> = ({ transplantDate, currentLevel, weather, sensorId, cloudSoilType }) => {
    const [soilType, setSoilType] = useState<string>(cloudSoilType ?? 'loamy');
    const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

    // Restore soil type from cloud when it arrives
    useEffect(() => {
        if (cloudSoilType) setSoilType(cloudSoilType);
    }, [cloudSoilType]);

    const handleSoilChange = (val: string) => {
        setSoilType(val);
        localStorage.setItem(`soilType_${sensorId}`, val);
        saveCloudSetting(sensorId, 'soilType', val);
    };

    // ── Derive current week since transplant ────────────────────────────────────
    const weeksSince = useMemo(() => {
        if (!transplantDate) return -1;
        const tp = new Date(transplantDate).getTime();
        const now = Date.now();
        return Math.floor((now - tp) / (7 * 24 * 60 * 60 * 1000));
    }, [transplantDate]);

    const currentPhase = useMemo(() => {
        if (weeksSince < 0) return null;
        return AWD_PHASES.find(p => p.weeks.includes(weeksSince)) ?? AWD_PHASES[AWD_PHASES.length - 1];
    }, [weeksSince]);

    // ── Smart threshold ──────────────────────────────────────────────────────────
    const soil = SOIL_TYPES.find(s => s.key === soilType) ?? SOIL_TYPES[1];
    const temp = weather?.temp ?? 28;
    const rainChance = weather?.daily?.[0]?.rainChance ?? 0;
    const { adj, reason } = getWeatherAdjustment(temp, rainChance);
    const finalThreshold = Math.max(10, soil.baseThreshold - (-adj)); // negative adj = trigger at shallower depth
    const isInFlowering = currentPhase?.id === 'flowering';
    const needsIrrigation = !isInFlowering && currentLevel <= finalThreshold;
    const isCritical = currentLevel <= 10;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
                <Droplets className="text-white" size={18} />
                <h3 className="font-bold text-white text-sm">AWD Protocol Guide</h3>
                {currentPhase?.critical && (
                    <span className="ml-auto flex items-center gap-1 text-red-200 text-[11px] font-bold bg-red-600/40 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> Critical Phase
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">

                {/* ── SECTION 1: Timeline ──────────────────────────────────────────── */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Season Timeline — Week {weeksSince >= 0 ? weeksSince : '?'} of ~16
                    </p>

                    {/* Phase bar */}
                    <div className="flex rounded-xl overflow-hidden border border-slate-100 mb-2">
                        {AWD_PHASES.map(phase => {
                            const isCurrent = currentPhase?.id === phase.id;
                            return (
                                <button
                                    key={phase.id}
                                    onClick={() => setExpandedPhase(p => p === phase.id ? null : phase.id)}
                                    className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all relative
                    ${isCurrent
                                            ? `${phase.color} text-white shadow-inner`
                                            : `${phase.lightColor} ${phase.textColor} hover:brightness-95`
                                        }`}
                                    title={phase.label}
                                >
                                    {isCurrent && (
                                        <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-lg" />
                                    )}
                                    <phase.icon size={13} />
                                    <span className="text-[9px] font-bold leading-none text-center px-0.5 hidden sm:block">
                                        {phase.label}
                                    </span>
                                    <span className={`text-[8px] hidden sm:block ${isCurrent ? 'text-white/70' : 'opacity-60'}`}>
                                        {phase.weekRange}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Current phase detail */}
                    {currentPhase && (
                        <div className={`rounded-xl p-3 border ${currentPhase.lightColor} border-${currentPhase.critical ? 'red' : 'slate'}-100`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                    <p className={`text-xs font-black ${currentPhase.textColor}`}>
                                        {currentPhase.critical && '⚠️ '}{currentPhase.label}
                                    </p>
                                    <p className={`text-[10px] font-semibold ${currentPhase.textColor} opacity-80`}>
                                        {currentPhase.protocol} · {currentPhase.depth}
                                    </p>
                                </div>
                                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${currentPhase.awdActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {currentPhase.awdActive ? 'AWD ON' : 'AWD OFF'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{currentPhase.detail}</p>
                        </div>
                    )}

                    {/* Expanded phase info on click */}
                    {expandedPhase && expandedPhase !== currentPhase?.id && (() => {
                        const p = AWD_PHASES.find(x => x.id === expandedPhase)!;
                        return (
                            <div className={`mt-2 rounded-xl p-3 border ${p.lightColor} border-slate-100 animate-in slide-in-from-top-2`}>
                                <p className={`text-xs font-black mb-1 ${p.textColor}`}>{p.label} <span className="font-normal opacity-60">({p.weekRange})</span></p>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{p.detail}</p>
                            </div>
                        );
                    })()}

                    {/* Week progress bar */}
                    {weeksSince >= 0 && (
                        <div className="mt-3">
                            <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                                <span>Transplant</span>
                                <span>Wk {Math.min(weeksSince, 16)} / 16</span>
                                <span>Harvest</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min((weeksSince / 16) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {!transplantDate && (
                        <p className="text-xs text-slate-400 italic mt-2">Set transplant date in Crop Status to enable timeline.</p>
                    )}
                </div>

                <div className="border-t border-slate-100" />

                {/* ── SECTION 2: Smart Threshold Guide ────────────────────────────── */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Smart Threshold Guide
                    </p>

                    {/* Soil selector */}
                    <div className="mb-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soil Type</label>
                        <div className="relative">
                            <select
                                value={soilType}
                                onChange={e => handleSoilChange(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-8"
                            >
                                {SOIL_TYPES.map(s => (
                                    <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 italic">{soil.desc}</p>
                    </div>

                    {/* Threshold display */}
                    {isInFlowering ? (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                            <AlertTriangle className="mx-auto mb-1 text-red-500" size={20} />
                            <p className="text-sm font-black text-red-700">FLOWERING STAGE</p>
                            <p className="text-xs text-red-600 mt-1 font-semibold">AWD suspended — keep 5 cm flood at all times</p>
                            <p className="text-[10px] text-red-400 mt-1">Resume AWD after flowering ends</p>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                            {/* Threshold value */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Irrigate When Water Drops Below</p>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className={`text-4xl font-black ${needsIrrigation ? 'text-red-600' : 'text-emerald-600'}`}>
                                            −{finalThreshold}
                                        </span>
                                        <span className="text-base font-semibold text-slate-500">cm</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">from soil surface</p>
                                </div>
                                <div className={`rounded-xl p-3 flex flex-col items-center justify-center min-w-[72px]
                  ${needsIrrigation ? 'bg-red-100' : 'bg-emerald-50'}`}>
                                    {needsIrrigation
                                        ? <AlertTriangle size={22} className="text-red-500 mb-1" />
                                        : <CheckCircle size={22} className="text-emerald-500 mb-1" />
                                    }
                                    <span className={`text-[10px] font-black text-center leading-tight ${needsIrrigation ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {needsIrrigation ? 'IRRIGATE NOW' : 'OK — Monitor'}
                                    </span>
                                </div>
                            </div>

                            {/* Current reading vs threshold */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Current gauge: <strong className="text-slate-700">{currentLevel} cm</strong></span>
                                    <span>Trigger: <strong className="text-slate-700">−{finalThreshold} cm below surface</strong></span>
                                </div>
                                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${needsIrrigation ? 'bg-red-500' : isCritical ? 'bg-orange-400' : 'bg-emerald-400'}`}
                                        style={{ width: `${Math.min(Math.max((currentLevel / 25) * 100, 5), 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Weather adjustment note */}
                            {adj !== 0 && (
                                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] font-medium
                  ${adj < 0 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                                    <span><strong>Weather adjusted:</strong> {reason}. Threshold shifted by {adj > 0 ? '+' : ''}{adj} cm.</span>
                                </div>
                            )}

                            {/* Cycle & refill info */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Cycle Duration</p>
                                    <p className="text-xs font-bold text-slate-700">{soil.cycleRange}</p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Re-flood Target</p>
                                    <p className="text-xs font-bold text-slate-700">+5 cm above surface</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
