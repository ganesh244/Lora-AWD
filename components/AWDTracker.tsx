
import React, { useState, useEffect, useMemo } from 'react';
import { Droplets, RefreshCw, CheckCircle, AlertTriangle, TrendingDown, ListChecks, Plus, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { saveCloudSetting } from '../services/dataService';

// ─── Types ──────────────────────────────────────────────────────────────────
interface HistoryPoint { time: string; level: number; }

interface DrainEvent {
    id: string;
    type: 'drain' | 'refill';
    timestamp: number;
    note?: string;
}

interface Props {
    sensorId: string;
    sensorName: string;
    currentLevel: number;
    history: HistoryPoint[];
    awdEvents?: DrainEvent[];   // cloud-restored events passed from App
}

// ─── Constants ───────────────────────────────────────────────────────────────
const WET_THRESHOLD = 15;   // cm — above soil surface = WET
const DRY_THRESHOLD = 12;   // cm — at/below this = DRY
const DANGER_LEVEL = 10;   // cm — critical alarm
const STORAGE_KEY = (id: string) => `awd_events_${id}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count complete WET → DRY → WET cycles from history */
function countAWDCycles(history: HistoryPoint[]): number {
    if (history.length < 3) return 0;
    let cycles = 0;
    let state: 'wet' | 'dry' | null = history[0].level >= WET_THRESHOLD ? 'wet' : 'dry';
    let wentDry = false;

    for (let i = 1; i < history.length; i++) {
        const lvl = history[i].level;
        if (state === 'wet' && lvl <= DRY_THRESHOLD) {
            state = 'dry';
            wentDry = true;
        } else if (state === 'dry' && lvl >= WET_THRESHOLD && wentDry) {
            state = 'wet';
            cycles++;
            wentDry = false;
        }
    }
    return cycles;
}

/** Calculate percolation rate (cm/day) from the most recent declining window */
function calcPercolationRate(history: HistoryPoint[]): number | null {
    if (history.length < 4) return null;

    // Find the longest recent declining run of at least 3 points
    let bestRate: number | null = null;

    for (let i = history.length - 1; i >= 2; i--) {
        const end = history[i];
        const start = history[i - 2];

        // Parse timestamps
        const tEnd = Date.parse(end.time);
        const tStart = Date.parse(start.time);
        if (isNaN(tEnd) || isNaN(tStart) || tEnd <= tStart) continue;

        const levelDrop = start.level - end.level;
        if (levelDrop <= 0) continue; // not declining

        const daysDiff = (tEnd - tStart) / (1000 * 60 * 60 * 24);
        if (daysDiff < 0.02) continue; // less than ~30 min — skip

        const rate = levelDrop / daysDiff;
        if (rate > 0 && rate < 30) { // sanity check: 0–30 cm/day
            bestRate = parseFloat(rate.toFixed(2));
            break;
        }
    }
    return bestRate;
}

function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'Just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const AWDTracker: React.FC<Props> = ({ sensorId, sensorName, currentLevel, history, awdEvents }) => {
    const [events, setEvents] = useState<DrainEvent[]>([]);
    const [showLog, setShowLog] = useState(false);
    const [addingNote, setAddingNote] = useState<'drain' | 'refill' | null>(null);
    const [noteText, setNoteText] = useState('');

    // Load events: prefer cloud-restored prop, else fall back to localStorage
    useEffect(() => {
        if (awdEvents && awdEvents.length > 0) {
            setEvents(awdEvents);
            // Keep localStorage in sync
            localStorage.setItem(STORAGE_KEY(sensorId), JSON.stringify(awdEvents));
        } else {
            try {
                const raw = localStorage.getItem(STORAGE_KEY(sensorId));
                if (raw) setEvents(JSON.parse(raw));
            } catch { setEvents([]); }
        }
    }, [sensorId, awdEvents]);

    const saveEvents = (next: DrainEvent[]) => {
        setEvents(next);
        localStorage.setItem(STORAGE_KEY(sensorId), JSON.stringify(next));
        // Push to cloud so other devices see updates
        saveCloudSetting(sensorId, 'awdEvents', next);
    };

    const logEvent = (type: 'drain' | 'refill') => {
        const newEvent: DrainEvent = {
            id: `${Date.now()}`,
            type,
            timestamp: Date.now(),
            note: noteText.trim() || undefined,
        };
        saveEvents([newEvent, ...events]);
        setAddingNote(null);
        setNoteText('');
    };

    const deleteEvent = (id: string) => saveEvents(events.filter(e => e.id !== id));

    // ── Computed stats ──────────────────────────────────────────────────────
    const awdCycles = useMemo(() => countAWDCycles(history), [history]);
    const percolationRate = useMemo(() => calcPercolationRate(history), [history]);
    const isCritical = currentLevel <= DANGER_LEVEL;
    const lastDrain = events.find(e => e.type === 'drain');
    const lastRefill = events.find(e => e.type === 'refill');

    // Days since last drain (for current dry period duration)
    const daysDraining = lastDrain && (!lastRefill || lastDrain.timestamp > lastRefill.timestamp)
        ? Math.round((Date.now() - lastDrain.timestamp) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Droplets size={16} className="text-blue-600" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">AWD Water Tracker</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{sensorName}</p>
                </div>
            </div>

            <div className="p-5 space-y-4">

                {/* ── CRITICAL LEVEL ALARM ─────────────────────────────────── */}
                {isCritical && (
                    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3 flex items-start gap-3 animate-pulse">
                        <div className="p-1.5 bg-red-100 rounded-lg shrink-0">
                            <AlertTriangle size={18} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-red-700 leading-tight">⚠️ Critical Water Level!</p>
                            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                                Field is at <span className="font-black">{currentLevel} cm</span> — below the safe AWD minimum of {DANGER_LEVEL} cm.
                                Irrigate immediately to prevent crop stress.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── STATS ROW ────────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                    {/* AWD Cycles */}
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex flex-col items-center text-center">
                        <RefreshCw size={16} className="text-blue-500 mb-1.5" />
                        <span className="text-2xl font-black text-blue-700 leading-none">{awdCycles}</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mt-1">Cycles</span>
                        <span className="text-[9px] text-blue-400 mt-0.5">This season</span>
                    </div>

                    {/* Percolation Rate */}
                    <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 flex flex-col items-center text-center">
                        <TrendingDown size={16} className="text-teal-500 mb-1.5" />
                        <span className="text-2xl font-black text-teal-700 leading-none">
                            {percolationRate !== null ? percolationRate : '—'}
                        </span>
                        <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wide mt-1">cm/day</span>
                        <span className="text-[9px] text-teal-400 mt-0.5">Percolation</span>
                    </div>

                    {/* Days Draining */}
                    <div className={`rounded-xl border p-3 flex flex-col items-center text-center ${daysDraining !== null
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-slate-50 border-slate-100'
                        }`}>
                        <Clock size={16} className={daysDraining !== null ? 'text-amber-500 mb-1.5' : 'text-slate-400 mb-1.5'} />
                        <span className={`text-2xl font-black leading-none ${daysDraining !== null ? 'text-amber-700' : 'text-slate-400'}`}>
                            {daysDraining !== null ? daysDraining : '—'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${daysDraining !== null ? 'text-amber-500' : 'text-slate-400'}`}>
                            Days
                        </span>
                        <span className={`text-[9px] mt-0.5 ${daysDraining !== null ? 'text-amber-400' : 'text-slate-300'}`}>
                            {daysDraining !== null ? 'Draining' : 'No drain logged'}
                        </span>
                    </div>
                </div>

                {/* Percolation quality hint */}
                {percolationRate !== null && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${percolationRate > 3
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : percolationRate > 1.5
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                        <TrendingDown size={13} className="shrink-0" />
                        {percolationRate > 3
                            ? `High percolation (${percolationRate} cm/day) — soil may be sandy. Consider bund repairs.`
                            : percolationRate > 1.5
                                ? `Moderate percolation (${percolationRate} cm/day) — AWD cycling will be effective.`
                                : `Low percolation (${percolationRate} cm/day) — excellent water retention. AWD ideal.`}
                    </div>
                )}

                {/* ── DRAIN EVENT LOGGER ───────────────────────────────────── */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ListChecks size={11} /> Drain / Refill Log
                    </p>

                    {/* Quick log buttons */}
                    {addingNote === null ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setAddingNote('drain')}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                                <TrendingDown size={13} /> Started Draining
                            </button>
                            <button
                                onClick={() => setAddingNote('refill')}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                                <Droplets size={13} /> Refilled Today
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs font-bold text-slate-600">
                                {addingNote === 'drain' ? '🌱 Log: Started Draining' : '💧 Log: Refilled Field'}
                            </p>
                            <input
                                type="text"
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Optional note (e.g. after 7 days dry)..."
                                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none bg-white text-slate-700 placeholder-slate-300"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') logEvent(addingNote); if (e.key === 'Escape') { setAddingNote(null); setNoteText(''); } }}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => logEvent(addingNote)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                >
                                    <CheckCircle size={12} /> Save
                                </button>
                                <button
                                    onClick={() => { setAddingNote(null); setNoteText(''); }}
                                    className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                                >Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Log toggle */}
                    {events.length > 0 && (
                        <button
                            onClick={() => setShowLog(!showLog)}
                            className="w-full mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 border border-slate-100 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <Plus size={11} /> {events.length} event{events.length !== 1 ? 's' : ''} logged
                            </span>
                            {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}

                    {/* Event list */}
                    {showLog && events.length > 0 && (
                        <div className="mt-2 rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            {events.slice(0, 10).map(ev => (
                                <div key={ev.id} className={`flex items-start gap-3 px-3 py-2.5 ${ev.type === 'drain' ? 'bg-amber-50/40' : 'bg-blue-50/40'}`}>
                                    <div className={`mt-0.5 p-1 rounded-md shrink-0 ${ev.type === 'drain' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {ev.type === 'drain' ? <TrendingDown size={11} /> : <Droplets size={11} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold leading-tight ${ev.type === 'drain' ? 'text-amber-700' : 'text-blue-700'}`}>
                                            {ev.type === 'drain' ? 'Started Draining' : 'Refilled'}
                                        </p>
                                        {ev.note && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{ev.note}</p>}
                                        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(ev.timestamp)}</p>
                                    </div>
                                    <button
                                        onClick={() => deleteEvent(ev.id)}
                                        className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Standalone Critical Alarm Banner (for dashboard) ────────────────────────
export const CriticalLevelBanner: React.FC<{
    sensors: { id: string; name: string; currentLevel: number }[];
}> = ({ sensors }) => {
    const critical = sensors.filter(s => s.currentLevel <= DANGER_LEVEL);
    if (critical.length === 0) return null;

    return (
        <div className="mb-6 rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 p-4 shadow-md shadow-red-100 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-4">
                <div className="bg-red-100 p-2.5 rounded-xl border border-red-200 shrink-0">
                    <AlertTriangle className="text-red-600 animate-bounce" size={22} />
                </div>
                <div className="flex-1">
                    <p className="font-black text-red-800 text-sm">⚠️ Critical Water Level Alert</p>
                    <p className="text-xs text-red-600 mt-0.5 font-medium">
                        {critical.length === 1
                            ? `${critical[0].name} is critically low at ${critical[0].currentLevel} cm.`
                            : `${critical.length} plots critically low: ${critical.map(s => `${s.name} (${s.currentLevel} cm)`).join(', ')}.`}
                        {' '}Irrigate immediately to prevent crop stress and yield loss.
                    </p>
                </div>
                <div className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-lg shrink-0 shadow">
                    {critical.map(s => s.currentLevel).reduce((a, b) => Math.min(a, b), 99)} cm
                </div>
            </div>
        </div>
    );
};
