
import React, { useMemo, useState, useEffect } from 'react';
import { SensorData } from '../types';
import { WeatherData } from '../services/weatherService';
import { calculateStage } from './CropManager';
import { Droplets, CloudRain, Wind, Leaf, AlertTriangle, CheckCircle2, Thermometer, ArrowRight, Bell, Check, ChevronDown, ChevronUp, CheckSquare, List } from 'lucide-react';

interface Props {
    sensors: SensorData[];
    weather: WeatherData | null;
    onNavigate: (sensorId: string) => void;
}

type AlertCategory = 'All' | 'Irrigation' | 'Crop Health' | 'Weather';

export const AlertsDashboard: React.FC<Props> = ({ sensors, weather, onNavigate }) => {
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<AlertCategory>('All');
    const [showHistory, setShowHistory] = useState(false);

    // Load completed alerts from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('completed_alerts');
            if (saved) {
                setCompletedIds(new Set(JSON.parse(saved)));
            }
        } catch (e) {
            console.error("Failed to load completed alerts", e);
        }
    }, []);

    const toggleAlertStatus = (id: string, isComplete: boolean) => {
        const newSet = new Set(completedIds);
        if (isComplete) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setCompletedIds(newSet);
        localStorage.setItem('completed_alerts', JSON.stringify(Array.from(newSet)));
    };

    const markAllPlotDone = (alertIds: string[]) => {
        const newSet = new Set(completedIds);
        alertIds.forEach(id => newSet.add(id));
        setCompletedIds(newSet);
        localStorage.setItem('completed_alerts', JSON.stringify(Array.from(newSet)));
    };

    // --- Helper to generate alerts for a single sensor ---
    const getSensorAlerts = (sensor: SensorData) => {
        const alerts: any[] = [];

        // 1. Crop Configuration & Stage
        let stageIndex = 1; // Default
        let stageName = "Vegetative";

        try {
            const saved = localStorage.getItem(`crop_${sensor.id}`);
            if (saved) {
                const config = JSON.parse(saved);
                const info = calculateStage(config);
                stageIndex = info.stageIndex;
                stageName = info.stageName;

                // 2. Agronomic Tips (Pests, Nutrients)
                info.managementTips.forEach(tip => {
                    // Map category to alert type
                    let type = 'info';
                    if (tip.category === 'Pest' || tip.category === 'Disease') type = 'warning';
                    if (tip.category === 'Nutrient' || tip.category === 'Weeds') type = 'action';

                    // Broad Category for Filter
                    const broadCat = (tip.category === 'Pest' || tip.category === 'Disease' || tip.category === 'Nutrient' || tip.category === 'Weeds') ? 'Crop Health' : 'Other';

                    // IMPORTANT: ID includes stageIndex so tips re-appear for new stages if applicable
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
                        isCropTip: true
                    });
                });
            }
        } catch (e) {
            // No crop config, skip crop-specific alerts
        }

        // 3. Water Level & Irrigation Alerts
        const level = sensor.currentLevel;
        const rainChance = weather?.rainChance || 0;
        const isRainExpected = rainChance > 50;

        // Critical Low
        if (level < 5) {
            if (isRainExpected) {
                alerts.push({
                    id: `${sensor.id}-water-wait`,
                    category: 'Irrigation',
                    broadCategory: 'Irrigation',
                    title: 'Delay Irrigation',
                    message: `Level is low (${level}cm) but rain is expected (${rainChance}%). Wait and monitor.`,
                    severity: 'warning',
                    icon: CloudRain,
                    plotName: sensor.name,
                    sensorId: sensor.id
                });
            } else {
                alerts.push({
                    id: `${sensor.id}-water-crit`,
                    category: 'Irrigation',
                    broadCategory: 'Irrigation',
                    title: 'Start Irrigation',
                    message: `Critical low level (${level}cm). Irrigate immediately to 15cm.`,
                    severity: 'critical',
                    icon: Droplets,
                    plotName: sensor.name,
                    sensorId: sensor.id
                });
            }
        }
        // High Water
        else if (level > 20) {
            alerts.push({
                id: `${sensor.id}-water-high`,
                category: 'Drainage',
                broadCategory: 'Irrigation',
                title: 'Stop Irrigation / Drain',
                message: `Water level excessive (${level}cm). Stop inflow immediately.`,
                severity: isRainExpected ? 'critical' : 'warning',
                icon: ArrowRight,
                plotName: sensor.name,
                sensorId: sensor.id
            });
        }

        // 4. Weather Impact Analysis
        if (weather) {
            // Wind
            if (weather.windSpeed > 25 && stageIndex >= 4) {
                alerts.push({
                    id: `${sensor.id}-wind`,
                    category: 'Weather',
                    broadCategory: 'Weather',
                    title: 'High Wind Alert',
                    message: `Wind ${weather.windSpeed}km/h. Risk of lodging for ${stageName} crop. Drain field to anchor roots.`,
                    severity: 'critical',
                    icon: Wind,
                    plotName: sensor.name,
                    sensorId: sensor.id
                });
            }
            // Heat
            if (weather.temp > 35 && stageIndex === 4) { // Flowering
                alerts.push({
                    id: `${sensor.id}-heat`,
                    category: 'Weather',
                    broadCategory: 'Weather',
                    title: 'Heat Stress',
                    message: `High temp (${weather.temp}°C) during flowering. Flood field to cool canopy.`,
                    severity: 'critical',
                    icon: Thermometer,
                    plotName: sensor.name,
                    sensorId: sensor.id
                });
            }
        }

        return alerts;
    };

    // Aggregate and Group Alerts
    const { alertsByPlot, doneAlerts, counts } = useMemo(() => {
        const all = sensors.flatMap(getSensorAlerts);
        const active: any[] = [];
        const done: any[] = [];

        // Split Active vs Done
        all.forEach(alert => {
            // IMPORTANT: For Real-time alerts (Irrigation/Weather), ignore "Done" status if the condition persists.
            // We check 'isCropTip' which identifies tasks that can be permanently dismissed for a stage.
            const isRealTime = alert.broadCategory === 'Irrigation' || alert.broadCategory === 'Weather';

            if (completedIds.has(alert.id) && !isRealTime) {
                done.push(alert);
            } else {
                // Filter by Category selection
                if (selectedCategory === 'All' || alert.broadCategory === selectedCategory) {
                    active.push(alert);
                }
            }
        });

        // Group Active Alerts by Plot
        const grouped: Record<string, any[]> = {};
        active.forEach(alert => {
            if (!grouped[alert.sensorId]) {
                grouped[alert.sensorId] = [];
            }
            grouped[alert.sensorId].push(alert);
        });

        // Sort alerts inside groups: Critical -> Warning -> Action
        const sortFn = (a: any, b: any) => {
            const score = (s: string) => s === 'critical' ? 0 : s === 'warning' ? 1 : s === 'action' ? 2 : 3;
            return score(a.severity) - score(b.severity);
        };

        Object.keys(grouped).forEach(key => {
            grouped[key].sort(sortFn);
        });

        return {
            alertsByPlot: grouped,
            doneAlerts: done,
            counts: {
                critical: active.filter(a => a.severity === 'critical').length,
                warning: active.filter(a => a.severity === 'warning').length,
                action: active.filter(a => a.severity === 'action').length,
                completed: done.length
            }
        };
    }, [sensors, weather, completedIds, selectedCategory]);

    // Get Plot Severity Color (Border)
    const getPlotSeverityStyle = (alerts: any[]) => {
        if (alerts.some(a => a.severity === 'critical')) return 'border-l-4 border-l-red-500 shadow-red-100';
        if (alerts.some(a => a.severity === 'warning')) return 'border-l-4 border-l-amber-500 shadow-amber-100';
        return 'border-l-4 border-l-blue-500 shadow-blue-100';
    };

    const plotIds = Object.keys(alertsByPlot);

    return (
        <div className="animate-in fade-in duration-300 pb-12">

            {/* Header & Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Bell className="text-emerald-600" /> Action Center
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Prioritized tasks and warnings for your fields.</p>
                    </div>

                    {/* Category Filter */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(['All', 'Irrigation', 'Crop Health', 'Weather'] as AlertCategory[]).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedCategory === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatBox icon={AlertTriangle} label="Critical" value={counts.critical} color="text-red-600" bg="bg-red-50" />
                    <StatBox icon={Bell} label="Warnings" value={counts.warning} color="text-amber-600" bg="bg-amber-50" />
                    <StatBox icon={List} label="Tasks" value={counts.action} color="text-blue-600" bg="bg-blue-50" />
                    <StatBox icon={CheckCircle2} label="Completed" value={counts.completed} color="text-emerald-600" bg="bg-emerald-50" />
                </div>
            </div>

            {/* MAIN ALERTS GRID (Grouped by Plot) */}
            {plotIds.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {plotIds.map(sensorId => {
                        const alerts = alertsByPlot[sensorId];
                        const plotName = alerts[0].plotName;
                        const severityClass = getPlotSeverityStyle(alerts);
                        // Filter out un-completable alerts for the "Mark All" feature
                        const completableIds = alerts.filter(a => a.isCropTip).map(a => a.id);

                        return (
                            <div key={sensorId} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${severityClass}`}>
                                {/* Plot Header */}
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800">{plotName}</span>
                                        <span className="text-xs font-mono text-slate-400 bg-white px-1.5 rounded border border-slate-200">{alerts.length}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {completableIds.length > 0 && (
                                            <button
                                                onClick={() => markAllPlotDone(completableIds)}
                                                className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 bg-white border border-slate-200 hover:border-emerald-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                            >
                                                <CheckSquare size={12} /> Mark All Done
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onNavigate(sensorId)}
                                            className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                        >
                                            View Plot <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Alerts List */}
                                <div className="divide-y divide-slate-100">
                                    {alerts.map((alert: any) => (
                                        <div key={alert.id} className="p-4 hover:bg-slate-50/50 transition-colors flex gap-3 group">
                                            <div className={`mt-1 p-2 rounded-full shrink-0 ${alert.severity === 'critical' ? 'bg-red-100 text-red-600' : alert.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <alert.icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`text-sm font-bold leading-tight ${alert.severity === 'critical' ? 'text-red-900' : 'text-slate-800'}`}>
                                                        {alert.title}
                                                    </h4>
                                                    {alert.isCropTip && (
                                                        <button
                                                            onClick={() => toggleAlertStatus(alert.id, true)}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-all p-1"
                                                            title="Mark as Done"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                                                {alert.severity === 'critical' && (
                                                    <span className="inline-block mt-2 text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">URGENT</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-slate-900 font-bold">No Active Alerts</h3>
                    <p className="text-slate-500 text-sm">Great job! Your fields are in good condition.</p>
                </div>
            )}

            {/* HISTORY SECTION */}
            {doneAlerts.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
                    >
                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Completed History ({doneAlerts.length})
                    </button>

                    {showHistory && (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200/50">
                            {doneAlerts.map((alert: any) => (
                                <div key={alert.id} className="p-3 flex items-center gap-3 opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="p-1.5 bg-white border border-slate-200 rounded text-emerald-600">
                                        <Check size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-600 line-through decoration-slate-400">{alert.title}</p>
                                        <p className="text-[10px] text-slate-400">{alert.plotName} • {alert.message}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleAlertStatus(alert.id, false)}
                                        className="text-[10px] font-bold text-blue-500 hover:underline px-2"
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

const StatBox = ({ icon: Icon, label, value, color, bg }: any) => (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
        <div className={`p-2 rounded-full mb-1 ${bg} ${color}`}>
            <Icon size={18} />
        </div>
        <span className="text-2xl font-bold text-slate-800 leading-none">{value}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{label}</span>
    </div>
);
