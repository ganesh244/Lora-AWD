import React from 'react';

interface Props {
  type: 'WiFi' | 'GSM' | 'Unknown';
  value: number | string;
  className?: string;
}

export const getSignalQuality = (type: 'WiFi' | 'GSM' | 'Unknown', value: number | string) => {
  const numValue = parseInt(String(value), 10);
  let strength = 0; // 0-4 scale
  let label = 'Unknown';
  
  // Default generic slate for inactive bars
  let activeBarColor = 'bg-slate-400';
  let textColor = 'text-slate-400';

  if (isNaN(numValue)) {
    return { strength: 0, label: 'No Signal', activeBarColor: 'bg-slate-200', textColor: 'text-slate-300' };
  } 
  
  if (type === 'WiFi') {
    // WiFi (dBm)
    if (numValue >= -50) { 
        strength = 4; label = 'Excellent'; activeBarColor = 'bg-emerald-500'; textColor = 'text-emerald-600';
    } else if (numValue >= -65) { 
        strength = 3; label = 'Good'; activeBarColor = 'bg-emerald-400'; textColor = 'text-emerald-600';
    } else if (numValue >= -75) { 
        strength = 2; label = 'Fair'; activeBarColor = 'bg-amber-400'; textColor = 'text-amber-600';
    } else if (numValue >= -85) { 
        strength = 1; label = 'Weak'; activeBarColor = 'bg-orange-500'; textColor = 'text-orange-600';
    } else { 
        strength = 1; label = 'Poor'; activeBarColor = 'bg-red-500'; textColor = 'text-red-600';
    }
  } else {
    // GSM (CSQ 0-31)
    if (numValue >= 20 && numValue !== 99) { 
        strength = 4; label = 'Excellent'; activeBarColor = 'bg-emerald-500'; textColor = 'text-emerald-600';
    } else if (numValue >= 15) { 
        strength = 3; label = 'Good'; activeBarColor = 'bg-blue-500'; textColor = 'text-blue-600';
    } else if (numValue >= 10) { 
        strength = 2; label = 'Fair'; activeBarColor = 'bg-amber-400'; textColor = 'text-amber-600';
    } else if (numValue >= 5) { 
        strength = 1; label = 'Weak'; activeBarColor = 'bg-orange-500'; textColor = 'text-orange-600';
    } else if (numValue >= 1) { 
        strength = 1; label = 'Poor'; activeBarColor = 'bg-red-500'; textColor = 'text-red-600';
    } else {
        strength = 0; label = 'No Signal'; activeBarColor = 'bg-slate-200'; textColor = 'text-slate-300';
    }
  }

  return { strength, label, activeBarColor, textColor };
};

export const SignalBars: React.FC<Props> = ({ type, value, className = "" }) => {
  const { strength, activeBarColor, label } = getSignalQuality(type, value);

  return (
    <div className={`flex items-end gap-[3px] h-4 ${className}`} title={`${type}: ${label} (${value})`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={`w-1.5 rounded-sm transition-all duration-300 ${
            bar <= strength ? activeBarColor : 'bg-slate-100'
          }`}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </div>
  );
};