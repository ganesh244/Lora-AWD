
import React, { useState, useEffect } from 'react';
import { WeatherData, DailyForecast } from '../services/weatherService';
import {
    CloudRain, Sun, MapPin, Droplets, Calendar, RefreshCw, Cloud, CloudLightning,
    Snowflake, CloudFog, Wind, Clock, ArrowUp, ArrowDown, Navigation, Edit2, Check, X,
    Loader2, Thermometer, AlertTriangle, Zap, Sunrise, Sunset, Eye, Leaf
} from 'lucide-react';

interface Props {
    weather: WeatherData | null;
    loading: boolean;
    error: boolean;
    onRefresh: () => void;
    onUpdateLocation: () => void;
    onLocationNameChange?: (name: string) => void;
    onManualLocation?: (lat: number, lon: number, name?: string) => void;
}

// ── Weather icon helper ───────────────────────────────────────────────────────
const getWeatherIcon = (code: number, size = 24, className = "") => {
    if (code === 0) return <Sun size={size} className={`text-amber-500 ${className}`} />;
    if (code >= 1 && code <= 3) return <Cloud size={size} className={`text-slate-400 ${className}`} />;
    if (code >= 45 && code <= 48) return <CloudFog size={size} className={`text-slate-400 ${className}`} />;
    if (code >= 51 && code <= 67) return <CloudRain size={size} className={`text-blue-500 ${className}`} />;
    if (code >= 71 && code <= 77) return <Snowflake size={size} className={`text-cyan-400 ${className}`} />;
    if (code >= 80 && code <= 82) return <CloudRain size={size} className={`text-blue-600 ${className}`} />;
    if (code >= 95) return <CloudLightning size={size} className={`text-purple-500 ${className}`} />;
    return <Sun size={size} className={`text-amber-500 ${className}`} />;
};

// ── UV level helper ────────────────────────────────────────────────────────────
const getUVInfo = (uv: number) => {
    if (uv <= 2) return { label: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
    if (uv <= 5) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' };
    if (uv <= 7) return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' };
    if (uv <= 10) return { label: 'Very High', color: 'text-red-600', bg: 'bg-red-50 border-red-100' };
    return { label: 'Extreme', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' };
};

// ── Wind direction helper ─────────────────────────────────────────────────────
const windDir = (deg: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
};

// ── Spray window: good if wind < 20 km/h and no rain and before noon ─────────
const getSprayWindow = (hour: DailyForecast) => {
    const noRain = hour.rainChance < 30;
    const lowWind = hour.windSpeedMax < 20;
    const moderate = hour.tempMax < 36;
    const score = [noRain, lowWind, moderate].filter(Boolean).length;
    if (score === 3) return { label: 'Ideal', color: 'text-emerald-700', bg: 'bg-emerald-100' };
    if (score === 2) return { label: 'Acceptable', color: 'text-amber-700', bg: 'bg-amber-100' };
    return { label: 'Avoid', color: 'text-red-700', bg: 'bg-red-100' };
};

// ── Format time from ISO string ───────────────────────────────────────────────
const fmtTime = (iso: string) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return '—'; }
};

// ──────────────────────────────────────────────────────────────────────────────
export const WeatherDashboard: React.FC<Props> = ({
    weather, loading, error, onRefresh, onUpdateLocation, onLocationNameChange, onManualLocation
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [activeDay, setActiveDay] = useState(0);
    const [manualOpen, setManualOpen] = useState(false);
    const [manualLat, setManualLat] = useState('');
    const [manualLon, setManualLon] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualError, setManualError] = useState('');

    const submitManual = () => {
        const lat = parseFloat(manualLat);
        const lon = parseFloat(manualLon);
        if (isNaN(lat) || lat < -90 || lat > 90) { setManualError('Latitude must be between -90 and 90'); return; }
        if (isNaN(lon) || lon < -180 || lon > 180) { setManualError('Longitude must be between -180 and 180'); return; }
        setManualError('');
        setManualOpen(false);
        onManualLocation?.(lat, lon, manualName.trim() || undefined);
        setManualLat(''); setManualLon(''); setManualName('');
    }; // selected day index for detail

    useEffect(() => {
        if (weather?.locationName) setTempName(weather.locationName);
    }, [weather]);

    const saveName = () => {
        if (onLocationNameChange && tempName.trim()) onLocationNameChange(tempName.trim());
        setIsEditingName(false);
    };

    // ── Loading / Empty states ─────────────────────────────────────────────────
    if (loading && !weather) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping" />
                    <RefreshCw className="relative z-10 h-8 w-8 text-blue-500 animate-spin" />
                </div>
                <p className="text-slate-500 font-medium">Fetching Forecast...</p>
            </div>
        );
    }

    if (!weather) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center animate-in fade-in">
                <div className="bg-blue-50 p-4 rounded-full mb-4 text-blue-500"><CloudRain size={32} /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Local Weather Forecast</h3>
                <p className="text-slate-500 mb-6 max-w-xs">Set your field location to get the 7-day forecast, UV, ET₀ and spray window advice.</p>
                <div className="flex gap-3 flex-wrap justify-center">
                    <button onClick={onUpdateLocation} disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                        {loading ? 'Locating...' : 'Use GPS'}
                    </button>
                    <button onClick={() => setManualOpen(o => !o)}
                        className="border border-blue-200 text-blue-600 font-bold py-2.5 px-6 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2">
                        <MapPin size={16} /> Enter Manually
                    </button>
                </div>
                {manualOpen && (
                    <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 w-full max-w-sm text-left animate-in slide-in-from-top-2">
                        <p className="text-xs font-bold text-slate-600 mb-3">Enter Field Coordinates</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block mb-1">Latitude</label>
                                <input type="number" step="any" value={manualLat} onChange={e => setManualLat(e.target.value)}
                                    placeholder="e.g. 13.0827"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block mb-1">Longitude</label>
                                <input type="number" step="any" value={manualLon} onChange={e => setManualLon(e.target.value)}
                                    placeholder="e.g. 80.2707"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block mb-1">Name <span className="opacity-60">(optional)</span></label>
                            <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                                placeholder="e.g. North Paddy Field"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                onKeyDown={e => e.key === 'Enter' && submitManual()} />
                        </div>
                        {manualError && <p className="text-red-600 text-xs mb-2 font-medium">{manualError}</p>}
                        <button onClick={submitManual}
                            className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
                            <Check size={13} /> Save Location
                        </button>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">Find on Google Maps → right-click → "What's here?"</p>
                    </div>
                )}
                {error && <p className="text-red-500 text-xs mt-4 font-medium bg-red-50 px-3 py-1 rounded">Failed to get location. Check permissions.</p>}
            </div>
        );
    }

    const today = weather.daily[0];
    const uvInfo = getUVInfo(weather.uvIndex);
    const heatDays = weather.daily.filter(d => d.tempMax >= 35).length;
    const rainDays = weather.daily.filter(d => d.rainChance >= 40).length;
    const maxRain = Math.max(...weather.daily.map(d => d.rainSum), 1);
    const sprayInfo = getSprayWindow(today);

    // ET₀ info
    const et0Today = today.et0;
    const et0Color = et0Today > 6 ? 'text-red-600' : et0Today > 4 ? 'text-amber-600' : 'text-emerald-600';
    const et0Bg = et0Today > 6 ? 'bg-red-50 border-red-100' : et0Today > 4 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

            {/* ── Hero Current Conditions ─────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl shadow-xl shadow-blue-200 text-white p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 opacity-[0.07]"><Sun size={220} /></div>
                <div className="relative z-10">
                    {/* Location row */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        {isEditingName ? (
                            <div className="flex items-center gap-2 bg-white/20 p-1 pr-2 rounded-lg backdrop-blur-md">
                                <input type="text" value={tempName} onChange={e => setTempName(e.target.value)}
                                    className="bg-transparent text-white border-b border-white/30 outline-none px-2 py-1 text-sm font-bold w-40 placeholder-white/50"
                                    placeholder="Enter name..." autoFocus onKeyDown={e => e.key === 'Enter' && saveName()} />
                                <button onClick={saveName} className="p-1 hover:bg-green-500/50 rounded-md"><Check size={14} /></button>
                                <button onClick={() => setIsEditingName(false)} className="p-1 hover:bg-red-500/50 rounded-md"><X size={14} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <MapPin size={13} className="text-blue-200" />
                                <span className="font-bold text-sm">{weather.locationName || 'Unknown Location'}</span>
                                <button onClick={() => setIsEditingName(true)} className="p-1 rounded-full hover:bg-white/20 text-blue-100 transition-colors"><Edit2 size={11} /></button>
                            </div>
                        )}
                        <button onClick={onUpdateLocation} disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-blue-100 transition-colors">
                            {loading ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                            {loading ? 'Updating...' : 'Update GPS'}
                        </button>
                        <button onClick={() => setManualOpen(o => !o)} disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-blue-100 transition-colors">
                            <MapPin size={11} /> Manual
                        </button>
                    </div>

                    {/* ── Manual coordinates form ── */}
                    {manualOpen && (
                        <div className="mb-4 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 animate-in slide-in-from-top-2">
                            <p className="text-xs font-bold text-white/80 mb-3">Enter Field Coordinates</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label className="text-[10px] text-white/60 font-bold uppercase tracking-wide block mb-1">Latitude</label>
                                    <input type="number" step="any" value={manualLat} onChange={e => setManualLat(e.target.value)}
                                        placeholder="e.g. 13.0827"
                                        className="w-full bg-white/20 text-white placeholder-white/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/60 font-bold uppercase tracking-wide block mb-1">Longitude</label>
                                    <input type="number" step="any" value={manualLon} onChange={e => setManualLon(e.target.value)}
                                        placeholder="e.g. 80.2707"
                                        className="w-full bg-white/20 text-white placeholder-white/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40" />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="text-[10px] text-white/60 font-bold uppercase tracking-wide block mb-1">Location Name <span className="opacity-50">(optional)</span></label>
                                <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                                    placeholder="e.g. North Paddy Field"
                                    className="w-full bg-white/20 text-white placeholder-white/40 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40"
                                    onKeyDown={e => e.key === 'Enter' && submitManual()} />
                            </div>
                            {manualError && <p className="text-red-200 text-xs mb-2 font-medium">{manualError}</p>}
                            <div className="flex gap-2">
                                <button onClick={submitManual}
                                    className="flex-1 bg-white text-blue-700 font-bold py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
                                    <Check size={13} /> Save Location
                                </button>
                                <button onClick={() => { setManualOpen(false); setManualError(''); }}
                                    className="px-4 py-2 rounded-lg text-sm font-bold border border-white/20 text-white/80 hover:bg-white/10 transition-colors">
                                    Cancel
                                </button>
                            </div>
                            <p className="text-[10px] text-white/40 mt-2 text-center">Tip: Find coordinates on Google Maps → right-click → "What's here?"</p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                        {/* Temp + condition */}
                        <div className="flex items-center gap-5">
                            <span className="text-8xl font-black tracking-tighter leading-none">{weather.temp}°</span>
                            <div>
                                <div className="mb-1">{getWeatherIcon(weather.conditionCode, 36)}</div>
                                <p className="text-xl font-bold">{weather.conditionText}</p>
                                <div className="flex items-center gap-3 text-blue-100 text-sm font-medium mt-1">
                                    <span className="flex items-center"><ArrowUp size={13} className="mr-0.5" />{Math.round(today.tempMax)}°</span>
                                    <span className="flex items-center opacity-75"><ArrowDown size={13} className="mr-0.5" />{Math.round(today.tempMin)}°</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                            {[
                                { label: 'Rain', value: today.rainSum, unit: 'mm', icon: CloudRain },
                                { label: 'Chance', value: today.rainChance, unit: '%', icon: Droplets },
                                { label: 'Wind', value: `${weather.windSpeed} ${windDir(weather.windDirection)}`, unit: 'km/h', icon: Wind },
                                { label: 'Humidity', value: weather.humidity, unit: '%', icon: Droplets },
                                { label: 'UV', value: Math.round(weather.uvIndex), unit: '', icon: Zap },
                                { label: 'ET₀', value: et0Today, unit: 'mm', icon: Leaf },
                            ].map((s, i) => (
                                <div key={i} className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5 flex flex-col items-center min-w-[80px]">
                                    <div className="flex items-center gap-1 mb-1 opacity-80 text-blue-100">
                                        <s.icon size={10} />
                                        <span className="text-[10px] uppercase tracking-wider font-bold">{s.label}</span>
                                    </div>
                                    <span className="text-base font-bold">{s.value}<span className="text-[10px] font-medium opacity-70 ml-0.5">{s.unit}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sunrise/Sunset */}
                    <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-blue-100 text-sm">
                            <Sunrise size={16} className="text-amber-300" />
                            <span className="font-bold">{fmtTime(today.sunrise)}</span>
                            <span className="text-xs opacity-70">Sunrise</span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-100 text-sm">
                            <Sunset size={16} className="text-orange-300" />
                            <span className="font-bold">{fmtTime(today.sunset)}</span>
                            <span className="text-xs opacity-70">Sunset</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Agricultural Insight Cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                {/* ET₀ */}
                <div className={`rounded-2xl border p-4 ${et0Bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm"><Leaf size={14} className={et0Color} /></div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">ET₀ Today</span>
                    </div>
                    <p className={`text-3xl font-black ${et0Color}`}>{et0Today}<span className="text-sm font-semibold ml-1">mm</span></p>
                    <p className="text-xs text-slate-500 mt-1 leading-tight">
                        {et0Today > 6 ? 'High water loss — irrigate if level low' :
                            et0Today > 4 ? 'Moderate loss — monitor closely' :
                                'Low evapotranspiration today'}
                    </p>
                </div>

                {/* UV Index */}
                <div className={`rounded-2xl border p-4 ${uvInfo.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm"><Zap size={14} className={uvInfo.color} /></div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">UV Index</span>
                    </div>
                    <p className={`text-3xl font-black ${uvInfo.color}`}>{Math.round(weather.uvIndex)}</p>
                    <p className={`text-xs font-bold mt-1 ${uvInfo.color}`}>{uvInfo.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                        {weather.uvIndex >= 6 ? 'Wear hat & sunscreen in field' : 'Field work conditions OK'}
                    </p>
                </div>

                {/* Spray Window */}
                <div className={`rounded-2xl border p-4 ${sprayInfo.label === 'Ideal' ? 'bg-emerald-50 border-emerald-100' :
                    sprayInfo.label === 'Acceptable' ? 'bg-amber-50 border-amber-100' :
                        'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm"><Eye size={14} className={sprayInfo.color} /></div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Spray Window</span>
                    </div>
                    <p className={`text-xl font-black ${sprayInfo.color}`}>{sprayInfo.label}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-tight">
                        {sprayInfo.label === 'Ideal' ? 'Low wind, no rain, safe temp. Best time to spray.' :
                            sprayInfo.label === 'Acceptable' ? 'Some risk. Spray early morning if needed.' :
                                `${today.rainChance >= 30 ? 'Rain likely. ' : ''}${today.windSpeedMax >= 20 ? 'Wind too high. ' : ''}${today.tempMax >= 36 ? 'Heat stress risk.' : ''}`}
                    </p>
                </div>

                {/* Heat Stress */}
                <div className={`rounded-2xl border p-4 ${heatDays > 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <Thermometer size={14} className={heatDays > 0 ? 'text-orange-600' : 'text-slate-400'} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Heat Days</span>
                    </div>
                    <p className={`text-3xl font-black ${heatDays > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{heatDays}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-tight">
                        {heatDays > 0
                            ? `${heatDays} day${heatDays > 1 ? 's' : ''} ≥35°C forecast. Flood field during heading.`
                            : 'No heat-stress days forecast this week.'}
                    </p>
                </div>
            </div>

            {/* ── 7-Day Rain Bar Chart ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <CloudRain size={16} className="text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">7-Day Rainfall</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
                        <CloudRain size={10} />
                        {rainDays} rainy day{rainDays !== 1 ? 's' : ''} ahead
                    </div>
                </div>
                <div className="flex items-end gap-2 h-28">
                    {weather.daily.map((day, i) => {
                        const pct = (day.rainSum / maxRain) * 100;
                        const date = new Date(day.time);
                        const label = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                        const isToday = i === 0;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                <span className="text-[9px] font-bold text-blue-600">{day.rainSum > 0 ? `${day.rainSum}` : ''}</span>
                                <div className="w-full flex items-end justify-center" style={{ height: '70px' }}>
                                    <div
                                        className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-blue-500' : 'bg-blue-200'} ${i === activeDay ? 'ring-2 ring-blue-400' : ''}`}
                                        style={{ height: `${Math.max(pct, day.rainSum > 0 ? 5 : 2)}%` }}
                                        onClick={() => setActiveDay(i)}
                                        title={`${label}: ${day.rainSum}mm, ${day.rainChance}% chance`}
                                    />
                                </div>
                                <span className={`text-[10px] font-bold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">Bar height = rainfall (mm). Click a bar to select day.</p>
            </div>

            {/* ── Temperature Range Graph ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Thermometer size={16} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Temperature Range</h3>
                </div>
                <div className="space-y-2">
                    {weather.daily.map((day, i) => {
                        const allMax = Math.max(...weather.daily.map(d => d.tempMax));
                        const allMin = Math.min(...weather.daily.map(d => d.tempMin));
                        const span = allMax - allMin || 1;
                        const leftPct = ((day.tempMin - allMin) / span) * 100;
                        const widthPct = ((day.tempMax - day.tempMin) / span) * 100;
                        const date = new Date(day.time);
                        const label = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                        const isHot = day.tempMax >= 35;
                        return (
                            <div key={i} className="flex items-center gap-3">
                                <span className={`text-xs font-bold w-10 shrink-0 text-right ${i === 0 ? 'text-orange-600' : 'text-slate-500'}`}>{label}</span>
                                <div className="flex-1 relative h-5 flex items-center">
                                    <div className="absolute inset-y-0 w-full bg-slate-50 rounded-full" />
                                    <div
                                        className={`absolute h-3 rounded-full ${isHot ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-sky-300 to-orange-400'}`}
                                        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 5)}%` }}
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 w-20">
                                    <span className="text-xs font-black text-slate-700">{Math.round(day.tempMax)}°</span>
                                    <span className="text-xs text-slate-400">/ {Math.round(day.tempMin)}°</span>
                                    {isHot && <AlertTriangle size={11} className="text-red-400" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {heatDays > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-2.5 text-xs text-red-700 font-medium">
                        <AlertTriangle size={13} className="shrink-0" />
                        {heatDays} day{heatDays > 1 ? 's' : ''} ≥35°C — flood field during Heading / Flowering to prevent pollen sterility
                    </div>
                )}
            </div>

            {/* ── Hourly Forecast ────────────────────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Clock size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Hourly Forecast</h3>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <div className="flex overflow-x-auto gap-3 pb-2 snap-x cursor-grab active:cursor-grabbing">
                        {weather.hourly.map((hour, idx) => {
                            const hr = new Date(hour.time).getHours();
                            const isSprayGood = hour.rainChance < 30 && hour.windSpeed < 20 && hr >= 6 && hr <= 10;
                            return (
                                <div key={idx} className={`min-w-[72px] flex flex-col items-center shrink-0 snap-start p-2 rounded-xl transition-colors ${isSprayGood ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50'}`}>
                                    <span className="text-[10px] font-bold text-slate-400 mb-2">
                                        {new Date(hour.time).toLocaleTimeString([], { hour: 'numeric', hour12: true })}
                                    </span>
                                    <div className="mb-2">{getWeatherIcon(hour.conditionCode, 26)}</div>
                                    <span className="text-sm font-bold text-slate-800">{Math.round(hour.temp)}°</span>
                                    <div className="flex flex-col items-center gap-1 mt-1">
                                        {hour.rainChance > 0 && (
                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                <Droplets size={7} /> {hour.rainChance}%
                                            </span>
                                        )}
                                        {isSprayGood && (
                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">Spray✓</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── 7-Day Forecast Cards ───────────────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">7-Day Forecast</h3>
                    </div>
                    <button onClick={onRefresh} disabled={loading}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 text-xs font-medium bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-full disabled:opacity-50 transition-colors">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {weather.daily.map((day, idx) => {
                        const date = new Date(day.time);
                        const dayLabel = idx === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const spray = getSprayWindow(day);
                        const uvD = getUVInfo(day.uvIndexMax);
                        return (
                            <div key={day.time}
                                onClick={() => setActiveDay(idx)}
                                className={`relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${idx === activeDay ? 'ring-2 ring-blue-400' : ''
                                    } ${idx === 0 ? 'bg-blue-50/60 border-blue-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className={`block text-sm font-bold ${idx === 0 ? 'text-blue-600' : 'text-slate-800'}`}>{dayLabel}</span>
                                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{dateLabel}</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${spray.bg} ${spray.color}`}>{spray.label}</span>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <div>{getWeatherIcon(day.conditionCode, 32)}</div>
                                    <div className="text-right">
                                        <div className="flex items-baseline gap-1 justify-end">
                                            <span className="text-xl font-bold text-slate-800">{Math.round(day.tempMax)}°</span>
                                            <span className="text-xs text-slate-400">/{Math.round(day.tempMin)}°</span>
                                        </div>
                                        {day.tempMax >= 35 && <AlertTriangle size={11} className="text-red-400 ml-auto" />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="bg-white/70 rounded-lg p-1.5 flex items-center gap-1">
                                        <CloudRain size={9} className="text-blue-400 shrink-0" />
                                        <span className="font-bold text-slate-600">{day.rainSum}mm</span>
                                    </div>
                                    <div className="bg-white/70 rounded-lg p-1.5 flex items-center gap-1">
                                        <Droplets size={9} className="text-blue-400 shrink-0" />
                                        <span className="font-bold text-slate-600">{day.rainChance}%</span>
                                    </div>
                                    <div className={`rounded-lg p-1.5 flex items-center gap-1 ${uvD.bg}`}>
                                        <Zap size={9} className={`${uvD.color} shrink-0`} />
                                        <span className={`font-bold ${uvD.color}`}>UV {Math.round(day.uvIndexMax)}</span>
                                    </div>
                                    <div className="bg-white/70 rounded-lg p-1.5 flex items-center gap-1">
                                        <Wind size={9} className="text-slate-400 shrink-0" />
                                        <span className="font-bold text-slate-600">{Math.round(day.windSpeedMax)}</span>
                                    </div>
                                </div>

                                {/* ET₀ row */}
                                <div className="mt-1.5 flex items-center gap-1 bg-white/70 rounded-lg p-1.5">
                                    <Leaf size={9} className="text-emerald-500 shrink-0" />
                                    <span className="text-[10px] font-bold text-slate-500">ET₀ </span>
                                    <span className="text-[10px] font-black text-emerald-700">{day.et0} mm</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
