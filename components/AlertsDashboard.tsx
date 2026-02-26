
import React, { useMemo, useState, useEffect } from 'react';
import { SensorData } from '../types';
import { WeatherData } from '../services/weatherService';
import { calculateStage } from './CropManager';
import {
    Droplets, CloudRain, Wind, Leaf, AlertTriangle, CheckCircle2,
    Thermometer, ArrowRight, Bell, Check, ChevronDown, ChevronUp,
    CheckSquare, List, Zap
} from 'lucide-react';

interface Props {
    sensors: SensorData[];
    weather: WeatherData | null;
    onNavigate: (sensorId: string) => void;
}

type AlertCategory = 'All' | 'Irrigation' | 'Crop Health' | 'Weather';

// ── Severity config ───────────────────────────────────────────────────────────
const SEV: Record<string, { bg: string; iconBg: string; iconColor: string; badge: string; ring: string; label: string }> = {
    critical: {
        bg: 'bg-red-50',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        badge: 'bg-red-600 text-white',
        ring: 'border-l-4 border-l-red-500',
        label: 'URGENT',
    },
    warning: {
        bg: 'bg-amber-50',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badge: 'bg-amber-500 text-white',
        ring: 'border-l-4 border-l-amber-500',
        label: 'WARNING',
    },
    action: {
        bg: 'bg-sky-50',
        iconBg: 'bg-sky-100',
        iconColor: 'text-sky-600',
        badge: 'bg-sky-500 text-white',
        ring: 'border-l-4 border-l-sky-500',
        label: 'ACTION',
    },
    info: {
        bg: 'bg-slate-50',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-500',
        badge: 'bg-slate-400 text-white',
        ring: 'border-l-4 border-l-slate-300',
        label: 'INFO',
    },
};

export const AlertsDashboard: React.FC<Props> = ({ sensors, weather, onNavigate }) => {
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<AlertCategory>('All');
    const [showHistory, setShowHistory] = useState(false);
    const [expandedPlots, setExpandedPlots] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            const saved = localStorage.getItem('completed_alerts');
            if (saved) setCompletedIds(new Set(JSON.parse(saved)));
        } catch { }
    }, []);

    const save = (set: Set<string>) => {
        setCompletedIds(set);
        localStorage.setItem('completed_alerts', JSON.stringify(Array.from(set)));
    };

    const toggleAlertStatus = (id: string, done: boolean) => {
        const s = new Set(completedIds);
        done ? s.add(id) : s.delete(id);
        save(s);
    };

    const markAllPlotDone = (ids: string[]) => {
        const s = new Set(completedIds);
        ids.forEach(id => s.add(id));
        save(s);
    };

    const togglePlot = (id: string) => {
        setExpandedPlots(p => {
            const n = new Set(p);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    // ── Alert generation ────────────────────────────────────────────────────────
    const getSensorAlerts = (sensor: SensorData) => {
        const alerts: any[] = [];
        let stageIndex = 1;
        let stageName = 'Vegetative';

        try {
            const saved = localStorage.getItem(`crop_${sensor.id}`);
            if (saved) {
                const config = JSON.parse(saved);
                const info = calculateStage(config);
                stageIndex = info.stageIndex;
                stageName = info.stageName;

                info.managementTips.forEach(tip => {
                    let type = 'info';
                    if (tip.category === 'Pest' || tip.category === 'Disease') type = 'warning';
                    if (tip.category === 'Nutrient' || tip.category === 'Weeds') type = 'action';
                    const broadCat = ['Pest', 'Disease', 'Nutrient', 'Weeds'].includes(tip.category) ? 'Crop Health' : 'Other';
                    const cleanCat = tip.category.replace(/[^a-zA-Z0-9]/g, '');
                    alerts.push({
                        id: `${sensor.id}-stg${stageIndex}-${cleanCat}`,
                        category: tip.category,
                        broadCategory: broadCat,
                        title: `${tip.category} Alert`,
                        message: tip.text,
                        severity: type,
                        icon: tip.icon || Leaf,
                        plotName: sensor.name,
                        sensorId: sensor.id,
                        isCropTip: true,
                    });
                });
            }
        } catch { }

        const level = sensor.currentLevel;
        const rainChance = weather?.rainChance || 0;
        const isRainExpected = rainChance > 50;

        if (level < 5) {
            if (isRainExpected) {
                alerts.push({ id: `${sensor.id}-water-wait`, category: 'Irrigation', broadCategory: 'Irrigation', title: 'Delay Irrigation', message: `Level low (${level}cm) but rain expected (${rainChance}%). Wait and monitor.`, severity: 'warning', icon: CloudRain, plotName: sensor.name, sensorId: sensor.id });
            } else {
                alerts.push({ id: `${sensor.id}-water-crit`, category: 'Irrigation', broadCategory: 'Irrigation', title: 'Start Irrigation Now', message: `Critical low level (${level}cm). Irrigate immediately to 15cm.`, severity: 'critical', icon: Droplets, plotName: sensor.name, sensorId: sensor.id });
            }
        } else if (level > 20) {
            alerts.push({ id: `${sensor.id}-water-high`, category: 'Drainage', broadCategory: 'Irrigation', title: 'Stop Irrigation / Drain', message: `Water level excessive (${level}cm). Stop inflow immediately.`, severity: isRainExpected ? 'critical' : 'warning', icon: ArrowRight, plotName: sensor.name, sensorId: sensor.id });
        }

        if (weather) {
            if (weather.windSpeed > 25 && stageIndex >= 4) {
                alerts.push({ id: `${sensor.id}-wind`, category: 'Weather', broadCategory: 'Weather', title: 'High Wind Alert', message: `Wind ${weather.windSpeed}km/h. Risk of lodging for ${stageName} crop. Drain field to anchor roots.`, severity: 'critical', icon: Wind, plotName: sensor.name, sensorId: sensor.id });
            }
            if (weather.temp > 35 && stageIndex === 4) {
                alerts.push({ id: `${sensor.id}-heat`, category: 'Weather', broadCategory: 'Weather', title: 'Heat Stress', message: `High temp (${weather.temp}°C) during flowering. Flood field to cool canopy.`, severity: 'critical', icon: Thermometer, plotName: sensor.name, sensorId: sensor.id });
            }
        }

        return alerts;
    };

    const { alertsByPlot, doneAlerts, counts, flatActive } = useMemo(() => {
        const all = sensors.flatMap(getSensorAlerts);
        const active: any[] = [];
        const done: any[] = [];

        all.forEach(alert => {
            const isRealTime = alert.broadCategory === 'Irrigation' || alert.broadCategory === 'Weather';
            if (completedIds.has(alert.id) && !isRealTime) {
                done.push(alert);
            } else if (selectedCategory === 'All' || alert.broadCategory === selectedCategory) {
                active.push(alert);
            }
        });

        const grouped: Record<string, any[]> = {};
        active.forEach(a => {
            if (!grouped[a.sensorId]) grouped[a.sensorId] = [];
            grouped[a.sensorId].push(a);
        });

        const sortFn = (a: any, b: any) => {
            const score = (s: string) => s === 'critical' ? 0 : s === 'warning' ? 1 : s === 'action' ? 2 : 3;
            return score(a.severity) - score(b.severity);
        };
        Object.keys(grouped).forEach(k => grouped[k].sort(sortFn));

        return {
            alertsByPlot: grouped,
            doneAlerts: done,
            flatActive: active,
            counts: {
                critical: active.filter(a => a.severity === 'critical').length,
                warning: active.filter(a => a.severity === 'warning').length,
                action: active.filter(a => a.severity === 'action').length,
                completed: done.length,
            },
        };
    }, [sensors, weather, completedIds, selectedCategory]);

    const plotIds = Object.keys(alertsByPlot);
    const hasCritical = counts.critical > 0;

    return (
        <div className="animate-in fade-in duration-300 space-y-5 pb-12">

            {/* ── Hero Header ────────────────────────────────────────────────────── */}
            <div className={`rounded-2xl overflow-hidden shadow-lg ${hasCritical ? 'bg-gradient-to-br from-red-700 via-red-600 to-orange-500' : 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600'}`}>
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {hasCritical
                                    ? <span className="flex items-center gap-1.5 text-red-200 text-[11px] font-bold bg-red-900/40 px-2 py-0.5 rounded-full animate-pulse"><Zap size={10} /> ATTENTION REQUIRED</span>
                                    : <span className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold bg-white/10 px-2 py-0.5 rounded-full"><Bell size={10} /> ACTION CENTER</span>
                                }
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {hasCritical ? `${counts.critical} Critical Alert${counts.critical > 1 ? 's' : ''}` : 'Field Alerts'}
                            </h2>
                            <p className="text-white/60 text-xs mt-0.5">
                                {flatActive.length > 0 ? `${flatActive.length} active across ${plotIds.length} plot${plotIds.length !== 1 ? 's' : ''}` : 'All fields are healthy'}
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center min-w-[56px]">
                            <p className="text-2xl font-black text-white leading-none">{flatActive.length}</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase mt-0.5">Active</p>
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { icon: AlertTriangle, label: 'Critical', val: counts.critical, col: 'bg-red-500/30 text-red-200' },
                            { icon: Bell, label: 'Warning', val: counts.warning, col: 'bg-amber-500/30 text-amber-200' },
                            { icon: List, label: 'Tasks', val: counts.action, col: 'bg-blue-500/30 text-blue-200' },
                            { icon: CheckCircle2, label: 'Done', val: counts.completed, col: 'bg-emerald-500/30 text-emerald-200' },
                        ].map(s => (
                            <div key={s.label} className={`${s.col} rounded-xl p-2.5 flex flex-col items-center`}>
                                <s.icon size={14} className="mb-1" />
                                <span className="text-lg font-black leading-none">{s.val}</span>
                                <span className="text-[9px] font-bold opacity-70 mt-0.5">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category filter bar */}
                <div className="flex border-t border-white/10 bg-black/20">
                    {(['All', 'Irrigation', 'Crop Health', 'Weather'] as AlertCategory[]).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex-1 py-2.5 text-[11px] font-bold transition-all ${selectedCategory === cat ? 'bg-white text-slate-800' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Alert Cards ─────────────────────────────────────────────────────── */}
            {plotIds.length > 0 ? (
                <div className="space-y-3">
                    {plotIds.map(sensorId => {
                        const alerts = alertsByPlot[sensorId];
                        const plotName = alerts[0].plotName;
                        const topSev = alerts[0].severity;
                        const s = SEV[topSev] || SEV.info;
                        const completableIds = alerts.filter(a => a.isCropTip).map(a => a.id);
                        const isExpanded = expandedPlots.has(sensorId) || alerts.length <= 2;
                        const shown = isExpanded ? alerts : alerts.slice(0, 2);

                        return (
                            <div key={sensorId} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${s.ring}`}>
                                {/* Plot header */}
                                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50 border-b border-slate-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                                        <span className="text-sm font-bold text-slate-800 truncate">{plotName}</span>
                                        <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 rounded">{alerts.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {completableIds.length > 0 && (
                                            <button
                                                onClick={() => markAllPlotDone(completableIds)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-emerald-600 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                <CheckSquare size={11} /> Done
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onNavigate(sensorId)}
                                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                                        >
                                            View <ArrowRight size={11} />
                                        </button>
                                    </div>
                                </div>

                                {/* Alert rows */}
                                <div className="divide-y divide-slate-50">
                                    {shown.map((alert: any, idx: number) => {
                                        const as = SEV[alert.severity] || SEV.info;
                                        return (
                                            <div
                                                key={alert.id}
                                                className={`flex items-start gap-3 px-4 py-3.5 group transition-colors ${alert.severity === 'critical' ? 'bg-red-50/40' : 'hover:bg-slate-50/60'} ${idx === 0 && alert.severity === 'critical' ? 'relative' : ''}`}
                                            >
                                                {/* Critical pulse dot */}
                                                {alert.severity === 'critical' && (
                                                    <span className="absolute top-3 left-2 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                                    </span>
                                                )}

                                                <div className={`shrink-0 p-2 rounded-xl mt-0.5 ${as.iconBg} ${as.iconColor}`}>
                                                    <alert.icon size={16} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <span className={`text-xs font-black leading-tight ${alert.severity === 'critical' ? 'text-red-800' : 'text-slate-800'}`}>
                                                                {alert.title}
                                                            </span>
                                                            <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${as.badge}`}>{as.label}</span>
                                                        </div>
                                                        {alert.isCropTip && (
                                                            <button
                                                                onClick={() => toggleAlertStatus(alert.id, true)}
                                                                className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                                title="Mark done"
                                                            >
                                                                <Check size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{alert.message}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Expand toggle */}
                                {alerts.length > 2 && (
                                    <button
                                        onClick={() => togglePlot(sensorId)}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-slate-400 hover:text-emerald-600 bg-slate-50 border-t border-slate-100 hover:bg-emerald-50 transition-colors"
                                    >
                                        {isExpanded
                                            ? <><ChevronUp size={12} /> Show less</>
                                            : <><ChevronDown size={12} /> {alerts.length - 2} more alert{alerts.length - 2 > 1 ? 's' : ''}</>
                                        }
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-slate-800 font-black text-lg">All Clear 🎉</h3>
                    <p className="text-slate-400 text-sm mt-1">No active alerts — your fields are healthy.</p>
                </div>
            )}

            {/* ── Completed History ─────────────────────────────────────────────── */}
            {doneAlerts.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">Completed</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{doneAlerts.length}</span>
                        </div>
                        {showHistory ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>

                    {showHistory && (
                        <div className="divide-y divide-slate-50 border-t border-slate-100">
                            {doneAlerts.map((alert: any) => (
                                <div key={alert.id} className="px-4 py-3 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity group">
                                    <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                        <Check size={12} className="text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-500 line-through decoration-slate-300 truncate">{alert.title}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{alert.plotName} · {alert.message}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleAlertStatus(alert.id, false)}
                                        className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-500 hover:underline shrink-0 transition-opacity"
                                    >
                                        Undo
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
