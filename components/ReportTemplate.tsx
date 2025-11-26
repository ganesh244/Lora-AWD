
import React from 'react';
import { SensorData, SheetRow } from '../types';
import { WaterLevelChart } from './WaterLevelChart';
import { formatDateTime } from '../services/dataService';
import { Sprout, Droplets, Calendar } from 'lucide-react';

interface Props {
  sensor: SensorData;
  logs: SheetRow[];
  dateRange: string;
}

export const ReportTemplate: React.FC<Props> = ({ sensor, logs, dateRange }) => {
  // Robust filtering: Case-insensitive and trimmed to ensure matches
  const sensorLogs = logs.filter(l => {
      const logId = String(l["Device ID"] || "").toLowerCase().trim();
      const sensId = String(sensor.id || "").toLowerCase().trim();
      return logId === sensId;
  }).slice(0, 50); // Limit table size for print

  const calculateStats = () => {
      const levels = sensorLogs.map(l => Number(l["Water Level (cm)"])).filter(n => !isNaN(n));
      if (levels.length === 0) return { avg: 0, min: 0, max: 0 };
      const sum = levels.reduce((a, b) => a + b, 0);
      return {
          avg: (sum / levels.length).toFixed(1),
          min: Math.min(...levels).toFixed(1),
          max: Math.max(...levels).toFixed(1)
      };
  };

  const stats = calculateStats();

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto text-slate-900 print:p-0 font-sans">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6 mb-8 print:border-black">
            <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-lg text-white print:bg-transparent print:text-black print:p-0">
                    <Sprout size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 print:text-black">Field Status Report</h1>
                    <p className="text-slate-500 font-medium print:text-black">Generated on {new Date().toLocaleDateString()}</p>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800 print:text-black">{sensor.name}</h2>
                <p className="text-sm text-slate-500 font-mono print:text-black">{sensor.id}</p>
                <div className="flex items-center justify-end gap-2 mt-1 text-sm text-slate-600 print:text-black">
                    <Calendar size={14} /> {dateRange}
                </div>
            </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-black print:border">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1 print:text-black">Current Level</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900 print:text-black">{sensor.currentLevel}</span>
                    <span className="text-sm text-slate-500 print:text-black">cm</span>
                </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-black print:border">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1 print:text-black">30-Day Avg</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-blue-600 print:text-black">{stats.avg}</span>
                    <span className="text-sm text-slate-500 print:text-black">cm</span>
                </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-black print:border">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1 print:text-black">Range</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-slate-700 print:text-black">{stats.min} - {stats.max}</span>
                    <span className="text-sm text-slate-500 print:text-black">cm</span>
                </div>
            </div>
        </div>

        {/* Chart Snapshot */}
        <div className="mb-8 border border-slate-200 rounded-xl p-4 bg-white print:break-inside-avoid print:border-black print:border">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-black">
                <Droplets size={16} className="text-blue-500 print:text-black" /> Water Level History
            </h3>
            <WaterLevelChart data={sensor.history} /> 
        </div>

        {/* Logs Table */}
        <div className="print:break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-800 mb-4 print:text-black">Recent Observations</h3>
            <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden print:border-black print:border">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold print:bg-gray-200 print:text-black">
                    <tr>
                        <th className="px-4 py-2 border-b print:border-black">Time</th>
                        <th className="px-4 py-2 border-b print:border-black">Level (cm)</th>
                        <th className="px-4 py-2 border-b print:border-black">Status</th>
                        <th className="px-4 py-2 border-b print:border-black">Signal</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-black">
                    {sensorLogs.length > 0 ? (
                        sensorLogs.map((log, i) => (
                            <tr key={i} className="even:bg-slate-50 print:even:bg-transparent">
                                <td className="px-4 py-2 font-mono text-xs print:text-black">{formatDateTime(log["Gateway Received Time"])}</td>
                                <td className="px-4 py-2 font-bold print:text-black">{Number(log["Water Level (cm)"]).toFixed(1)}</td>
                                <td className="px-4 py-2 print:text-black">{log["Status"]}</td>
                                <td className="px-4 py-2 text-xs print:text-black">{log["GSM Strength (RSSI)"] || log["WiFi Strength (dBm)"]}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic print:text-black">
                                No recent observations found for this device.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {sensorLogs.length > 0 && <p className="text-xs text-slate-400 mt-2 italic text-center print:text-black">Showing last 50 records.</p>}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 flex justify-between print:border-black print:text-black">
            <span>SmartPaddy Field Monitor</span>
            <span>Generated Report</span>
        </div>
    </div>
  );
};
    