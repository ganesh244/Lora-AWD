import React from 'react';
import { GatewayStatus } from '../types';
import { Wifi, Signal, Database, UploadCloud, Activity, Smartphone, CalendarClock } from 'lucide-react';
import { formatDateTime } from '../services/dataService';
import { SignalBars, getSignalQuality } from './SignalBars';

interface Props {
  status: GatewayStatus;
}

export const SystemHealth: React.FC<Props> = ({ status }) => {
  const isWifi = status.network === 'WiFi';
  const signalValue = isWifi ? status.wifiSignal : status.gsmSignal;
  const { label: signalLabel, textColor: signalColor } = getSignalQuality(isWifi ? 'WiFi' : 'GSM', signalValue);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-8">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
          <Activity size={16} />
        </div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          Gateway Health
        </h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        
        <HealthMetric 
          icon={<UploadCloud size={14} />}
          label="Network Mode"
          value={status.network}
          subValue={isWifi ? 'Broadband' : 'Cellular'}
          statusColor={status.network !== 'Unknown' ? 'text-green-600' : 'text-amber-600'}
        />

        <HealthMetric 
          icon={<Smartphone size={14} />}
          label="Operator"
          value={status.simOperator}
          subValue="Service Provider"
        />

        {/* Signal Strength with Bar Visual */}
        <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {isWifi ? <Wifi size={14} /> : <Signal size={14} />} Signal Strength
            </span>
            <div className="flex items-center gap-3 mt-0.5">
                 <SignalBars type={isWifi ? 'WiFi' : 'GSM'} value={signalValue} />
                 <span className="font-bold text-slate-800 text-base">
                    {signalValue} <span className="text-xs font-normal text-slate-400">{isWifi ? 'dBm' : 'CSQ'}</span>
                 </span>
            </div>
            <span className={`text-[10px] mt-1 font-bold ${signalColor}`}>
               {signalLabel} Connection
            </span>
        </div>

        <HealthMetric 
          icon={<Database size={14} />}
          label="SD Storage"
          value={`${status.sdFree} MB`}
          subValue="Free Space"
        />

        <div className="flex flex-col col-span-2 sm:col-span-1 lg:col-span-1 bg-slate-50 rounded-lg p-3 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <CalendarClock size={12} /> Last Sync
          </span>
          <span className="font-mono font-semibold text-slate-700 text-sm break-all leading-tight" title={status.lastBatchUpload}>
            {formatDateTime(status.lastBatchUpload)}
          </span>
        </div>

      </div>
    </div>
  );
};

const HealthMetric = ({ icon, label, value, subValue, highlight, statusColor }: any) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
      {icon} {label}
    </span>
    <span className={`font-semibold text-base ${statusColor || 'text-slate-800'} ${highlight ? 'font-bold' : ''}`}>
      {value}
    </span>
    {subValue && <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{subValue}</span>}
  </div>
);