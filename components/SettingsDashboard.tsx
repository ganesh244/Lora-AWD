
import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Trash2, Plus, Database, Droplets, AlertTriangle, CheckCircle2, LayoutDashboard, Languages, Move } from 'lucide-react';
import { saveDataSources, resetDataSources } from '../services/dataService';
import { useTranslation, LANGUAGES } from '../services/translations';

interface Props {
    onClearCache: () => void;
    onSettingsChange?: () => void;
    onEnterArrangeMode: () => void;
}

export const SettingsDashboard: React.FC<Props> = ({ onClearCache, onSettingsChange, onEnterArrangeMode }) => {
    const { language, setLanguage } = useTranslation();
    const [lowThreshold, setLowThreshold] = useState(5);
    const [highThreshold, setHighThreshold] = useState(20);

    const [sources, setSources] = useState<string[]>([]);
    const [newSource, setNewSource] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Load Thresholds
        const savedThresholds = localStorage.getItem('app_thresholds');
        if (savedThresholds) {
            const { low, high } = JSON.parse(savedThresholds);
            setLowThreshold(low);
            setHighThreshold(high);
        }

        // Load Sources
        const savedSources = localStorage.getItem('app_data_sources');
        if (savedSources) {
            setSources(JSON.parse(savedSources));
        } else {
            // Default initial state if not loaded (will be handled by reset)
            setSources([]);
        }
    }, []);

    const handleSaveThresholds = () => {
        localStorage.setItem('app_thresholds', JSON.stringify({ low: lowThreshold, high: highThreshold }));
        showSaveFeedback();
        if (onSettingsChange) onSettingsChange();
    };

    const handleAddSource = () => {
        if (!newSource.trim()) return;
        const updated = [...sources, newSource.trim()];
        setSources(updated);
        saveDataSources(updated);
        setNewSource('');
        if (onSettingsChange) onSettingsChange();
    };

    const handleRemoveSource = (index: number) => {
        const updated = sources.filter((_, i) => i !== index);
        setSources(updated);
        saveDataSources(updated);
        if (onSettingsChange) onSettingsChange();
    };

    const handleResetSources = () => {
        if (confirm('Reset data sources to default?')) {
            resetDataSources();
            // Reload from storage (which is now null/default)
            setSources([]);
            if (onSettingsChange) onSettingsChange();
            window.location.reload();
        }
    };

    const showSaveFeedback = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="animate-in fade-in duration-300 max-w-3xl mx-auto pb-12">

            <div className="flex items-center gap-3 mb-8">
                <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                    <Settings size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
                    <p className="text-slate-500 text-sm">Configure thresholds, connections, and interface.</p>
                </div>
            </div>

            {/* 1. Interface Settings (Language & Layout) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <LayoutDashboard size={18} className="text-emerald-600" /> Interface & Display
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* Language */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Languages size={16} className="text-slate-400" /> App Language
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${language === lang.code ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {lang.native}
                                    <span className="block text-[9px] font-normal opacity-70">{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Arrange */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Move size={16} className="text-slate-400" /> Dashboard Layout
                        </label>
                        <p className="text-xs text-slate-500 mb-3">Reorder the sensor plots on your dashboard view.</p>
                        <button
                            onClick={onEnterArrangeMode}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                        >
                            <Move size={16} /> Enter Arrange Mode
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Irrigation Thresholds */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Droplets size={18} className="text-blue-500" /> Irrigation Logic
                    </h3>
                    {isSaved && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in"><CheckCircle2 size={14} /> Saved</span>}
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold text-slate-700">Start Irrigation (Low Level)</label>
                            <span className="text-sm font-mono font-bold text-red-600">{lowThreshold} cm</span>
                        </div>
                        <input
                            type="range" min="0" max="10" step="1"
                            value={lowThreshold}
                            onChange={(e) => setLowThreshold(parseInt(e.target.value))}
                            className="w-full accent-red-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-slate-400 mt-1">Advice triggers "Critical: Irrigate" when gauge is below this level.</p>
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold text-slate-700">Stop Irrigation (High Level)</label>
                            <span className="text-sm font-mono font-bold text-blue-600">{highThreshold} cm</span>
                        </div>
                        <input
                            type="range" min="15" max="30" step="1"
                            value={highThreshold}
                            onChange={(e) => setHighThreshold(parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-slate-400 mt-1">Advice triggers "Stop Irrigation" when gauge exceeds this level.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button
                            onClick={handleSaveThresholds}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                        >
                            <Save size={16} /> Save Thresholds
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Data Sources */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Database size={18} className="text-purple-500" /> Data Sources
                    </h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        Manage the Google Apps Script URLs used to fetch sensor data.
                        <span className="block text-xs text-slate-400 mt-1">Warning: Removing sources will hide their data.</span>
                    </p>

                    <div className="space-y-3 mb-6">
                        {sources.length === 0 ? (
                            <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed text-slate-400 text-xs italic">
                                Using Default System Sources (LoRa + GSM + WiFi)
                            </div>
                        ) : (
                            sources.map((src, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <span className="flex-1 font-mono truncate text-slate-600">{src}</span>
                                    <button onClick={() => handleRemoveSource(idx)} className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newSource}
                            onChange={(e) => setNewSource(e.target.value)}
                            placeholder="https://script.google.com/..."
                            className="flex-1 text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button
                            onClick={handleAddSource}
                            disabled={!newSource}
                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold text-xs hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>

                    <button onClick={handleResetSources} className="text-xs text-slate-400 hover:text-slate-600 underline flex items-center gap-1">
                        <RotateCcw size={10} /> Reset to Defaults
                    </button>
                </div>
            </div>

            {/* 4. Danger Zone */}
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
                <h3 className="font-bold text-red-900 flex items-center gap-2 mb-2">
                    <AlertTriangle size={18} /> Danger Zone
                </h3>
                <p className="text-xs text-red-700 mb-4">Clear all local data, including cached logs and custom names.</p>
                <button
                    onClick={onClearCache}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-lg hover:bg-red-100 transition-colors"
                >
                    Clear App Cache & Restart
                </button>
            </div>

        </div>
    );
};
