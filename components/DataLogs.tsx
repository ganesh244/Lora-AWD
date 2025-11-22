import React, { useMemo, useState } from 'react';
import { SheetRow } from '../types';
import { StatusBadge } from './StatusBadge';
import { Database, Clock, Download, AlertCircle, Filter, ChevronDown, Table } from 'lucide-react';
import { mapDeviceNickname, formatDateTime } from '../services/dataService';
import { SignalBars, getSignalQuality } from './SignalBars';

interface Props {
  logs: SheetRow[];
  error?: string | null;
}

export const DataLogs: React.FC<Props> = ({ logs, error }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>('All');

  // Extract unique device IDs
  const deviceOptions = useMemo(() => {
    if (!logs) return [];
    const devices = new Set(logs.map(log => log["Device ID"]).filter(Boolean));
    return Array.from(devices).sort();
  }, [logs]);

  // Filter logs based on selection
  const filteredLogs = useMemo(() => {
    if (selectedDevice === 'All') return logs;
    return logs.filter(log => log["Device ID"] === selectedDevice);
  }, [logs, selectedDevice]);

  const downloadCSV = () => {
    if (!filteredLogs.length) return;
    
    const headers = Object.keys(filteredLogs[0]);
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(row => headers.map(fieldName => 
        JSON.stringify(row[fieldName as keyof SheetRow])
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gateway_logs_${selectedDevice}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-100 p-12 text-center flex flex-col items-center justify-center h-96">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-red-900">Unable to Load Logs</h3>
        <p className="text-red-600 mt-2 max-w-sm">
          {error}
        </p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center h-96">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
          <Database className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">No Logs Available</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Waiting for data from the Gateway... Ensure the Google Sheet is populated and the Web App is deployed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Table size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Paddy Field Logs</h3>
            <p className="text-xs text-slate-500">Real-time telemetry from Google Sheets</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Device Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Filter size={14} className="text-slate-400" />
            </div>
            <select 
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="pl-8 pr-8 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer shadow-sm"
            >
              <option value="All">All Devices</option>
              {deviceOptions.map(id => (
                <option key={id} value={id}>
                  {mapDeviceNickname(id)} ({id})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <ChevronDown size={12} className="text-slate-400" />
            </div>
          </div>

          <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
            {filteredLogs.length} Records
          </span>
          
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-colors shadow-sm ml-auto sm:ml-0"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Timestamp</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Device</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Level</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 hidden md:table-cell">Network Info</th>
              <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 hidden lg:table-cell">Storage</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredLogs.map((row, idx) => {
                const isWifi = row["Network"] === "WiFi";
                const signalVal = isWifi ? row["WiFi Strength (dBm)"] : row["GSM Strength (RSSI)"];
                const { label: signalLabel, textColor: signalColor } = getSignalQuality(isWifi ? 'WiFi' : 'GSM', signalVal);
                
                return (
                  <tr key={idx} className="group hover:bg-blue-50/50 transition-colors duration-200 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono border-l-[3px] border-transparent group-hover:border-blue-500 transition-all">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        {formatDateTime(row["Gateway Received Time"])}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{mapDeviceNickname(row["Device ID"])}</span>
                        <span className="text-[11px] text-slate-400 font-mono mt-0.5">{row["Device ID"]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-900">{Number(row["Water Level (cm)"]).toFixed(1)}</span>
                        <span className="text-xs font-medium text-slate-400">cm</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="transform group-hover:scale-105 transition-transform origin-left duration-200">
                        <StatusBadge status={row["Status"]} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <SignalBars 
                          type={isWifi ? "WiFi" : "GSM"} 
                          value={signalVal} 
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 leading-none mb-1">{row["Network"]}</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 leading-none font-mono">
                                {isWifi ? `${signalVal} dBm` : `${signalVal} CSQ`}
                                </span>
                                <span className={`text-[9px] font-bold bg-slate-50 px-1 rounded ${signalColor}`}>
                                    {signalLabel}
                                </span>
                            </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 hidden lg:table-cell font-mono">
                      {row["SD Free (MB)"]} <span className="text-slate-400">MB free</span>
                    </td>
                  </tr>
                );
            })}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/30">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};