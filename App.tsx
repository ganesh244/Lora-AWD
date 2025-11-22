
import React, { useEffect, useState } from 'react';
import { fetchSensorData, parseDate, formatDateTime } from './services/dataService';
import { SensorData, GatewayStatus, SheetRow } from './types';
import { StatusBadge } from './components/StatusBadge';
import { SystemHealth } from './components/SystemHealth';
import { WaterLevelChart } from './components/WaterLevelChart';
import { DataLogs } from './components/DataLogs';
import { IrrigationAdvice } from './components/IrrigationAdvice';
import { WeatherDashboard } from './components/WeatherDashboard';
import { CropManager, calculateStage } from './components/CropManager';
import { AWDGauge } from './components/AWDGauge';
import { fetchLocalWeather, getUserLocation, WeatherData } from './services/weatherService';
import { Sprout, RefreshCw, ArrowLeft, Clock, LayoutDashboard, FileText, AlertTriangle, Zap, Radio, ArrowRight, Move, Save, MapPin, CloudRain, ChevronRight, Sun, CloudSun } from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [logs, setLogs] = useState<SheetRow[]>([]);
  
  const [selectedSensor, setSelectedSensor] = useState<SensorData | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'weather'>('dashboard');
  const [isRearranging, setIsRearranging] = useState(false);

  // --- New Features State ---
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);

  const loadData = async () => {
    if (!isRearranging) setLoading(true); 
    setError(null);
    try {
      const data = await fetchSensorData();
      
      // Apply saved order
      const savedOrderJson = localStorage.getItem('sensorOrder');
      let sortedSensors = data.sensors;
      
      if (savedOrderJson) {
        try {
          const orderList = JSON.parse(savedOrderJson);
          if (Array.isArray(orderList)) {
            sortedSensors.sort((a, b) => {
              let idxA = orderList.indexOf(a.id);
              let idxB = orderList.indexOf(b.id);
              if (idxA === -1) idxA = 9999;
              if (idxB === -1) idxB = 9999;
              return idxA - idxB;
            });
          }
        } catch (e) { console.error("Failed to parse sensor order", e); }
      }

      setSensors(sortedSensors);
      setGateway(data.gateway);
      setLogs(data.logs);
      setLastRefreshed(new Date());

      if (selectedSensor) {
        const updated = data.sensors.find(s => s.id === selectedSensor.id);
        if (updated) setSelectedSensor(updated);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.message && err.message.length > 0 && err.message !== "Failed to fetch" 
        ? err.message 
        : "Connection failed. Please ensure your Google Sheet is active and accessible.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load Weather from Storage on mount if available
  useEffect(() => {
    const saved = localStorage.getItem('fieldLocation');
    if (saved) {
        const { lat, lon, name } = JSON.parse(saved);
        // On initial load, use saved name if available
        fetchAndSetWeather(lat, lon, false, name);
    }
  }, []);

  const fetchAndSetWeather = async (lat: number, lon: number, save: boolean, overrideName?: string) => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
        const data = await fetchLocalWeather(lat, lon);
        
        // Logic:
        // 1. If overrideName is provided (manual rename), use it.
        // 2. If we are refreshing (save=false), try to keep the existing saved name.
        // 3. If we are updating GPS (save=true), use the new geocoded name (data.locationName).
        
        let finalName = data.locationName || "Local Field";
        
        if (overrideName) {
            finalName = overrideName;
        } else if (!save) {
            // We are just refreshing weather, try to preserve the custom name if user set one
            const saved = localStorage.getItem('fieldLocation');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.name) {
                    finalName = parsed.name;
                }
            }
        }

        const weatherDataWithCorrectName = { ...data, locationName: finalName };
        setWeather(weatherDataWithCorrectName);
        
        if (save || overrideName) {
            localStorage.setItem('fieldLocation', JSON.stringify({
                lat,
                lon,
                name: finalName
            }));
        }
    } catch (e) {
        console.error("Weather Fetch Error", e);
        setWeatherError(true);
    } finally {
        setWeatherLoading(false);
    }
  };

  // Called when user clicks "Update Location" (Uses GPS)
  const handleUpdateLocation = async () => {
    try {
        setWeatherLoading(true);
        setWeatherError(false);
        const loc = await getUserLocation();
        // When updating from GPS, we force a save which might overwrite the name with the geocoded one,
        // but the user can then rename it.
        await fetchAndSetWeather(loc.lat, loc.lon, true);
    } catch (e) {
        console.error("GPS Error", e);
        setWeatherError(true);
        setWeatherLoading(false);
    }
  };

  // Called when user clicks "Refresh" (Uses Saved Location)
  const handleRefreshWeather = async () => {
    const saved = localStorage.getItem('fieldLocation');
    if (saved) {
        const { lat, lon, name } = JSON.parse(saved);
        await fetchAndSetWeather(lat, lon, false, name);
    } else {
        // If no location saved, try to get it
        handleUpdateLocation();
    }
  };

  const handleLocationNameChange = (newName: string) => {
     if (!weather) return;
     
     // Update state immediately
     const updated = { ...weather, locationName: newName };
     setWeather(updated);
     
     // Update local storage
     const saved = localStorage.getItem('fieldLocation');
     if (saved) {
         const data = JSON.parse(saved);
         localStorage.setItem('fieldLocation', JSON.stringify({ ...data, name: newName }));
     }
  };

  const moveSensor = (e: React.MouseEvent, index: number, direction: -1 | 1) => {
    e.stopPropagation();
    if (index + direction < 0 || index + direction >= sensors.length) return;

    const newSensors = [...sensors];
    [newSensors[index], newSensors[index + direction]] = [newSensors[index + direction], newSensors[index]];
    
    setSensors(newSensors);
    
    const orderIds = newSensors.map(s => s.id);
    localStorage.setItem('sensorOrder', JSON.stringify(orderIds));
  };

  const getTimeAgo = (dateStr: string) => {
    const ts = parseDate(dateStr);
    if (ts === 0) return 'Unknown';
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return new Date(ts).toLocaleDateString();
  };

  // Helper to get crop stage for dashboard list
  const getCropInfo = (id: string) => {
    try {
        const saved = localStorage.getItem(`crop_${id}`);
        if (saved) {
            return calculateStage(JSON.parse(saved));
        }
    } catch (e) { return null; }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans selection:bg-emerald-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-xl bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg shadow-md shadow-emerald-600/20">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight block leading-none">SmartPaddy</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field Monitor</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-1 mx-6 bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
                <button 
                  onClick={() => { setActiveTab('dashboard'); setSelectedSensor(null); }}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <LayoutDashboard size={16} /> Fields
                </button>
                <button 
                  onClick={() => { setActiveTab('logs'); setSelectedSensor(null); }}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <FileText size={16} /> Logs
                </button>
                <button 
                  onClick={() => { setActiveTab('weather'); setSelectedSensor(null); }}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'weather' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <CloudSun size={16} /> Weather
                </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Weather Widget (Desktop Navbar) */}
              {activeTab === 'dashboard' && !weather && (
                  <div className="hidden lg:flex items-center gap-3 mr-2">
                    <button 
                        onClick={handleRefreshWeather}
                        disabled={weatherLoading}
                        className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${weatherError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-blue-50 hover:text-blue-600'}`}
                    >
                        {weatherLoading ? <RefreshCw size={12} className="animate-spin" /> : <MapPin size={12} />}
                        {weatherError ? 'Retry Weather' : 'Local Weather'}
                    </button>
                  </div>
              )}

              <div className="text-right hidden lg:block border-r border-slate-100 pr-4 mr-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</span>
                <span className="block text-xs font-mono font-semibold text-slate-700">{lastRefreshed.toLocaleTimeString()}</span>
              </div>
              
              {activeTab === 'dashboard' && !selectedSensor && (
                <button 
                  onClick={() => setIsRearranging(!isRearranging)}
                  className={`p-2 rounded-full border transition-all ${isRearranging ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'}`}
                  title={isRearranging ? "Done Rearranging" : "Arrange Plots"}
                >
                  {isRearranging ? <Save size={16} /> : <Move size={16} />}
                </button>
              )}

              <button 
                onClick={loadData}
                className={`p-2 rounded-full hover:bg-slate-100 border border-slate-200 hover:border-slate-300 hover:text-emerald-600 transition-all ${loading ? 'animate-spin text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-500'}`}
                title="Refresh Data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="grid grid-cols-3 md:hidden border-t border-slate-100 bg-white">
           <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedSensor(null); }}
              className={`py-3 text-xs font-bold uppercase tracking-wide text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'dashboard' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500'}`}
            >
              <LayoutDashboard size={14} /> Fields
            </button>
            <button 
              onClick={() => { setActiveTab('logs'); setSelectedSensor(null); }}
              className={`py-3 text-xs font-bold uppercase tracking-wide text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'logs' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500'}`}
            >
              <FileText size={14} /> Logs
            </button>
            <button 
              onClick={() => { setActiveTab('weather'); setSelectedSensor(null); }}
              className={`py-3 text-xs font-bold uppercase tracking-wide text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'weather' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500'}`}
            >
              <CloudSun size={14} /> Weather
            </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-center gap-4 text-red-800 shadow-sm animate-in slide-in-from-top-2">
            <div className="bg-red-100 p-2 rounded-full shrink-0">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-red-900">Sync Error</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
            <button 
              onClick={loadData} 
              className="px-4 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-red-50 shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Switcher */}
        {activeTab === 'weather' ? (
            <WeatherDashboard 
                weather={weather} 
                loading={weatherLoading} 
                error={weatherError} 
                onRefresh={handleRefreshWeather}
                onUpdateLocation={handleUpdateLocation}
                onLocationNameChange={handleLocationNameChange}
            />
        ) : loading && sensors.length === 0 ? (
           <div className="flex flex-col justify-center items-center h-96 animate-in fade-in">
             <div className="relative mb-8">
               <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping"></div>
               <div className="relative rounded-full bg-white p-4 shadow-xl border border-emerald-100">
                 <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
               </div>
             </div>
             <p className="text-slate-900 font-semibold text-lg">Connecting to Paddy Fields</p>
             <p className="text-slate-500 text-sm mt-2">Fetching water levels...</p>
           </div>
        ) : activeTab === 'logs' ? (
           <div className="animate-in fade-in duration-300">
             <DataLogs logs={logs} error={error} />
           </div>
        ) : selectedSensor ? (
          // Detailed View
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => setSelectedSensor(null)}
              className="group flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-6 transition-colors font-medium"
            >
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-emerald-300 mr-2 shadow-sm transition-all">
                 <ArrowLeft className="h-4 w-4" />
              </div>
              Back to Overview
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Main Water Level Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-start gap-6 bg-gradient-to-b from-white to-slate-50/50">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedSensor.name}</h2>
                      <StatusBadge status={selectedSensor.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">
                          <Radio size={12} /> LoRa
                      </div>
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{selectedSensor.id}</span>
                      <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          Updated {getTimeAgo(selectedSensor.lastUpdated)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-6">
                      <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Water Depth</div>
                          <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold text-slate-900 tracking-tighter">{selectedSensor.currentLevel}</span>
                              <span className="text-lg font-medium text-slate-400">cm</span>
                          </div>
                      </div>
                      <div className="hidden sm:block h-10 w-px bg-slate-100"></div>
                      <div className="sm:min-w-[200px]">
                          <IrrigationAdvice 
                              level={selectedSensor.currentLevel} 
                              weather={weather}
                              cropStage={getCropInfo(selectedSensor.id) ? { name: getCropInfo(selectedSensor.id)!.stageName, index: getCropInfo(selectedSensor.id)!.stageIndex } : undefined}
                          />
                          {weather && weather.isRainy && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                  <CloudRain size={12} /> Rain Forecast: {weather.rainForecast24h}mm
                              </div>
                          )}
                      </div>
                  </div>
                </div>
                
                <div className="p-6 md:p-8">
                  <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    Field Water History
                  </h3>
                  <WaterLevelChart data={selectedSensor.history} />
                </div>
              </div>

              {/* Crop Management Card */}
              <div className="lg:col-span-1">
                 <CropManager sensorId={selectedSensor.id} weather={weather} />
              </div>
            </div>

            {/* Telemetry Footer */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={14} />
                Node Telemetry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DetailCard label="Last Received" value={formatDateTime(selectedSensor.raw["Gateway Received Time"])} />
                <DetailCard label="Batch Upload" value={formatDateTime(selectedSensor.raw["Batch Upload Time"])} />
                <DetailCard label="Signal Quality" value={`${selectedSensor.raw["GSM Strength (RSSI)"] || '-'} CSQ`} />
              </div>
            </div>
          </div>
        ) : (
          // Grid View
          <>
          {/* Weather Banner (Keep in Dashboard view if weather is loaded) */}
          {weather && (
            <div className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 animate-in fade-in slide-in-from-top-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                      <div className="flex items-center gap-2 opacity-90 text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">
                          <MapPin size={12} /> {weather.locationName || 'Local Field'}
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                              {weather.isRainy ? <CloudRain size={32} /> : <Sun size={32} />}
                              <span className="text-4xl font-bold tracking-tight">{weather.temp}°</span>
                          </div>
                          <div className="h-8 w-px bg-white/20"></div>
                          <div>
                              <p className="font-semibold text-lg leading-none">{weather.conditionText}</p>
                              <p className="text-sm text-blue-100 opacity-90 mt-1">24h Forecast</p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-6 bg-white/10 rounded-xl p-3 backdrop-blur-sm w-full sm:w-auto justify-around sm:justify-start border border-white/10">
                      <div className="flex flex-col items-center sm:items-start">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-blue-100 mb-0.5">Rain</span>
                          <span className="text-xl font-bold">{weather.rainForecast24h}<span className="text-sm font-medium opacity-70 ml-0.5">mm</span></span>
                      </div>
                      <div className="flex flex-col items-center sm:items-start">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-blue-100 mb-0.5">Chance</span>
                          <span className="text-xl font-bold">{weather.rainChance}<span className="text-sm font-medium opacity-70 ml-0.5">%</span></span>
                      </div>
                      <button 
                          onClick={handleRefreshWeather}
                          disabled={weatherLoading}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                          title="Refresh Weather"
                      >
                          <RefreshCw size={16} className={weatherLoading ? 'animate-spin' : ''} />
                      </button>
                  </div>
              </div>
            </div>
          )}
          
          {/* Enable Weather Button (Only if not loaded yet) */}
          {!weather && (
             <div className="mb-6 bg-blue-50 rounded-xl p-4 flex items-center justify-between border border-blue-100">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm text-blue-500"><CloudRain size={16} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900">Get Local Weather</h3>
                        <p className="text-xs text-blue-700">{weatherError ? 'Location access failed. Try again.' : 'For smarter irrigation advice'}</p>
                    </div>
                 </div>
                 <button 
                    onClick={handleUpdateLocation} 
                    disabled={weatherLoading}
                    className="bg-white text-blue-600 text-xs font-bold px-3 py-2 rounded-lg shadow-sm border border-blue-100"
                 >
                    {weatherLoading ? 'Loading...' : 'Enable'}
                 </button>
             </div>
          )}

          {/* Gateway Status */}
          {gateway && !isRearranging && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <SystemHealth status={gateway} />
            </div>
          )}

          {/* Reordering Banner */}
          {isRearranging && (
            <div className="mb-6 bg-emerald-600 text-white p-4 rounded-xl shadow-lg shadow-emerald-200 animate-in fade-in slide-in-from-top-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><Move className="text-white" size={20} /></div>
                <div>
                    <h3 className="font-bold text-sm">Arrange Fields</h3>
                    <p className="text-emerald-100 text-xs">Use the arrow buttons to reorder the grid.</p>
                </div>
                </div>
                <button 
                onClick={() => setIsRearranging(false)}
                className="bg-white text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-50 transition-colors"
                >
                Done
                </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {sensors.length === 0 && !loading && !error && (
               <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 border-dashed text-center">
                 <div className="bg-slate-50 p-4 rounded-full mb-4">
                   <LayoutDashboard className="h-10 w-10 text-slate-300" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">No Fields Connected</h3>
                 <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">Waiting for data from LoRa nodes.</p>
               </div>
            )}

            {sensors.map((sensor, index) => {
                const cropInfo = getCropInfo(sensor.id);

                return (
                  <div 
                    key={sensor.id}
                    onClick={() => !isRearranging && setSelectedSensor(sensor)}
                    className={`group bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border p-6 transition-all duration-300 relative overflow-hidden ${isRearranging ? 'border-emerald-400 border-dashed cursor-default' : 'border-slate-100 cursor-pointer hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl transition-colors duration-300 ${isRearranging ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                          <Sprout className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold transition-colors ${isRearranging ? 'text-slate-600' : 'text-slate-900 group-hover:text-emerald-700'}`}>{sensor.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Radio size={9} />
                            </span>
                            <div className="text-xs text-slate-400 font-mono">{sensor.id}</div>
                          </div>
                        </div>
                      </div>
                      {!isRearranging && <StatusBadge status={sensor.status} />}
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-extrabold tracking-tighter transition-colors ${isRearranging ? 'text-slate-400' : 'text-slate-800 group-hover:text-emerald-600'}`}>{sensor.currentLevel}</span>
                        <span className="text-lg font-medium text-slate-400">cm</span>
                      </div>
                      
                      <AWDGauge level={sensor.currentLevel} />
                      
                      {/* Crop Stage Info on Dashboard */}
                      {cropInfo && !isRearranging && (
                        <div className="flex items-center gap-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm text-emerald-600 border border-slate-100">
                                <Sprout size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold text-slate-700 truncate mr-2">{cropInfo.stageName}</span>
                                    <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-sm whitespace-nowrap">{cropInfo.days} Days</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((cropInfo.days / cropInfo.totalDuration) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                      )}
                      
                      {!isRearranging && (
                            <IrrigationAdvice 
                                level={sensor.currentLevel} 
                                weather={weather}
                                cropStage={cropInfo ? { name: cropInfo.stageName, index: cropInfo.stageIndex } : undefined}
                            />
                      )}
                    </div>
                    
                    <div className={`flex items-center justify-between text-xs pt-4 border-t ${isRearranging ? 'border-slate-100 mt-4' : 'border-slate-50'}`}>
                      {isRearranging ? (
                        <div className="flex items-center justify-between w-full gap-2">
                            <button 
                                onClick={(e) => moveSensor(e, index, -1)}
                                disabled={index === 0}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold uppercase hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 transition-all flex-1 justify-center"
                            >
                                <ArrowLeft size={14} /> Prev
                            </button>
                            <span className="font-mono text-slate-300 font-bold">#{index + 1}</span>
                            <button 
                                onClick={(e) => moveSensor(e, index, 1)}
                                disabled={index === sensors.length - 1}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold uppercase hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 transition-all flex-1 justify-center"
                            >
                                Next <ArrowRight size={14} />
                            </button>
                        </div>
                      ) : (
                        <>
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <Clock size={14} className="text-slate-400" />
                                {getTimeAgo(sensor.lastUpdated)}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                View Details <ChevronRight size={12} />
                            </div>
                        </>
                      )}
                    </div>
                  </div>
                );
            })}
          </div>
          </>
        )}
      </main>
    </div>
  );
}

const DetailCard = ({ label, value }: { label: string, value: string }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
    <span className="font-mono font-semibold text-sm text-slate-700 break-all">{value}</span>
  </div>
);

export default App;
