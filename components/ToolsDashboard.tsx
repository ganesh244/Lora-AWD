
import React, { useState } from 'react';
import { Calculator, Coins, Scale, Leaf, TrendingUp, FileBarChart, Printer, X } from 'lucide-react';
import { SensorData, SheetRow } from '../types';
import { ReportTemplate } from './ReportTemplate';

interface Props {
    sensors: SensorData[];
    logs?: SheetRow[]; // Added logs prop
}

export const ToolsDashboard: React.FC<Props> = ({ sensors, logs = [] }) => {
    const [selectedTool, setSelectedTool] = useState<'fertilizer' | 'yield' | 'report'>('fertilizer');
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportSensor, setReportSensor] = useState<SensorData | null>(null);

    const handlePrint = () => {
        window.print();
    };

    // Report Modal
    if (showReportModal && reportSensor) {
        return (
            <div className="fixed inset-0 z-50 bg-white overflow-auto">
                <div className="sticky top-0 bg-slate-900 text-white p-4 flex justify-between items-center shadow-md print:hidden">
                    <h3 className="font-bold">Print Preview</h3>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        <button onClick={() => setShowReportModal(false)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                            <X size={16} /> Close
                        </button>
                    </div>
                </div>
                <div className="p-8 bg-slate-100 min-h-screen print:bg-white print:p-0 print:min-h-0">
                    <ReportTemplate sensor={reportSensor} logs={logs} dateRange="Last 30 Days" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="text-emerald-600" /> Agri-Tools
                </h2>
                <p className="text-slate-500 text-sm mt-1">Calculators to optimize inputs and generate reports.</p>

                <div className="flex flex-wrap gap-2 mt-4">
                    <button
                        onClick={() => setSelectedTool('fertilizer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTool === 'fertilizer' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Leaf size={16} /> Fertilizer Calc
                    </button>
                    <button
                        onClick={() => setSelectedTool('yield')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTool === 'yield' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <TrendingUp size={16} /> Yield Estimator
                    </button>
                    <button
                        onClick={() => setSelectedTool('report')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTool === 'report' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <FileBarChart size={16} /> Reports
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Section */}
                <div className="lg:col-span-2">
                    {selectedTool === 'fertilizer' && <FertilizerCalc sensors={sensors} />}
                    {selectedTool === 'yield' && <YieldCalc sensors={sensors} />}
                    {selectedTool === 'report' && (
                        <ReportGenerator
                            sensors={sensors}
                            onGenerate={(sensor) => {
                                setReportSensor(sensor);
                                setShowReportModal(true);
                            }}
                        />
                    )}
                </div>

                {/* Info Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                            <Scale size={18} />
                            {selectedTool === 'fertilizer' ? 'Standard Dosage' : selectedTool === 'yield' ? 'Yield Benchmarks' : 'Report Features'}
                        </h3>
                        <div className="text-sm text-blue-800 space-y-3">
                            {selectedTool === 'fertilizer' ? (
                                <>
                                    <p>Recommendations based on standard NPK requirements for high-yield varieties.</p>
                                    <ul className="list-disc list-inside space-y-1 opacity-80">
                                        <li><strong>Basal:</strong> Before transplanting (DAP/MOP)</li>
                                        <li><strong>Tillering:</strong> 15-20 Days (Urea)</li>
                                        <li><strong>Panicle:</strong> 45-50 Days (Urea/MOP)</li>
                                    </ul>
                                </>
                            ) : selectedTool === 'yield' ? (
                                <>
                                    <p>Estimations based on average panicle counts and grain weight.</p>
                                    <ul className="list-disc list-inside space-y-1 opacity-80">
                                        <li><strong>Low Yield:</strong> 20-25 bags/acre</li>
                                        <li><strong>Avg Yield:</strong> 30-35 bags/acre</li>
                                        <li><strong>High Yield:</strong> 40+ bags/acre</li>
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p>Generate comprehensive PDF reports for sharing.</p>
                                    <ul className="list-disc list-inside space-y-1 opacity-80">
                                        <li>Water Level Trends (Chart)</li>
                                        <li>Min/Max/Avg Statistics</li>
                                        <li>Recent Telemetry Logs</li>
                                        <li>Sensor Health Status</li>
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReportGenerator: React.FC<{ sensors: SensorData[], onGenerate: (s: SensorData) => void }> = ({ sensors, onGenerate }) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Generate Field Report</h3>
            <p className="text-sm text-slate-500 mb-6">Select a field to generate a detailed 30-day performance report suitable for printing or sharing.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sensors.map(sensor => (
                    <div key={sensor.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => onGenerate(sensor)}>
                        <div>
                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{sensor.name}</h4>
                            <p className="text-xs text-slate-400 font-mono">{sensor.id}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Printer size={18} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FertilizerCalc: React.FC<{ sensors: SensorData[] }> = ({ sensors }) => {
    const [acres, setAcres] = useState(1.0);
    const [stage, setStage] = useState('basal');

    const handleSensorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (!id) return;
        try {
            const saved = localStorage.getItem(`crop_${id}`);
            if (saved) {
                const config = JSON.parse(saved);
                if (config.plotSizeAcres) setAcres(config.plotSizeAcres);
            }
        } catch (err) { }
    };

    const getDosage = () => {
        switch (stage) {
            case 'basal': return { urea: 20, dap: 50, mop: 25 };
            case 'tillering': return { urea: 45, dap: 0, mop: 0 };
            case 'panicle': return { urea: 35, dap: 0, mop: 25 };
            default: return { urea: 0, dap: 0, mop: 0 };
        }
    };

    const dosage = getDosage();
    const ureaTotal = Math.ceil(dosage.urea * acres);
    const dapTotal = Math.ceil(dosage.dap * acres);
    const mopTotal = Math.ceil(dosage.mop * acres);
    const cost = (ureaTotal * 6) + (dapTotal * 27) + (mopTotal * 17);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-6">Nutrient Requirement Calculator</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Plot (Auto-fill)</label>
                    <select onChange={handleSensorSelect} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">-- Choose Plot --</option>
                        {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Field Size (Acres)</label>
                    <input type="number" step="0.1" value={acres} onChange={(e) => setAcres(parseFloat(e.target.value) || 0)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
            </div>
            <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Application Stage</label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'basal', label: 'Basal Dose', sub: 'At Transplanting' },
                        { id: 'tillering', label: 'Active Tillering', sub: '15-25 DAT' },
                        { id: 'panicle', label: 'Panicle Init.', sub: '45-55 DAT' }
                    ].map(opt => (
                        <button key={opt.id} onClick={() => setStage(opt.id)} className={`p-3 rounded-xl border text-left transition-all ${stage === opt.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                            <span className={`block text-sm font-bold ${stage === opt.id ? 'text-emerald-800' : 'text-slate-700'}`}>{opt.label}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{opt.sub}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recommended Application</h4>
                <div className="grid grid-cols-3 gap-4">
                    <ResultCard label="Urea" amount={ureaTotal} color="bg-blue-500" />
                    <ResultCard label="DAP" amount={dapTotal} color="bg-amber-500" />
                    <ResultCard label="MOP (Potash)" amount={mopTotal} color="bg-red-500" />
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-slate-500 text-xs">
                    <span>* Estimations only. Consult soil card.</span>
                    <span className="flex items-center gap-1 font-medium"><Coins size={12} /> Est. Cost: ₹{cost}</span>
                </div>
            </div>
        </div>
    );
};

const YieldCalc: React.FC<{ sensors: SensorData[] }> = () => {
    const [acres, setAcres] = useState(1.0);
    const [bagsPerAcre, setBagsPerAcre] = useState(30);
    const bagWeight = 75;
    const totalKg = acres * bagsPerAcre * bagWeight;
    const totalTons = totalKg / 1000;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-6">Harvest Yield Estimator</h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Area (Acres)</label>
                    <input type="number" step="0.1" value={acres} onChange={(e) => setAcres(parseFloat(e.target.value) || 0)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-lg text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-bold" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Est. Bags per Acre (75kg/bag)</label>
                    <div className="flex items-center gap-4">
                        <input type="range" min="15" max="60" value={bagsPerAcre} onChange={(e) => setBagsPerAcre(parseInt(e.target.value))} className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <span className="text-xl font-bold text-amber-600 min-w-[3ch]">{bagsPerAcre}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1 px-1"><span>Low (15)</span><span>Avg (30)</span><span>High (60)</span></div>
                </div>
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 mt-8 flex items-center justify-between">
                    <div>
                        <span className="block text-xs font-bold text-amber-800 uppercase mb-1">Total Est. Yield</span>
                        <span className="block text-4xl font-bold text-slate-900">{totalTons.toFixed(2)} <span className="text-lg text-slate-500 font-medium">Tons</span></span>
                        <span className="block text-sm text-amber-700 mt-1 font-medium">{Math.ceil(totalKg / 100)} Quintals</span>
                    </div>
                    <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm text-amber-500"><TrendingUp size={24} /></div>
                </div>
            </div>
        </div>
    );
};

const ResultCard = ({ label, amount, color }: any) => (
    <div className="text-center">
        <div className="text-xs font-bold text-slate-500 mb-2">{label}</div>
        <div className="relative inline-flex items-center justify-center">
            <div className={`h-16 w-16 rounded-2xl ${color} opacity-10 absolute inset-0 transform rotate-3`}></div>
            <div className="relative z-10"><span className="text-2xl font-black text-slate-800">{amount}</span><span className="text-xs font-bold text-slate-400 block -mt-1">kg</span></div>
        </div>
    </div>
);
