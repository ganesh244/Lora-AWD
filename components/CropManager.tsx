
import React, { useState, useEffect } from 'react';
import { Save, Edit2, Sprout, Timer, AlertCircle, BookOpen, Bug, Droplets, Leaf, Scissors, Sun, Wind, Thermometer, Droplet, StickyNote, Cloud, RefreshCw, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { PaddyVisual } from './PaddyVisual';
import { WeatherData } from '../services/weatherService';
import { saveCloudSetting } from '../services/dataService';

interface Props {
  sensorId: string;
  weather: WeatherData | null;
  onSave?: () => void;
}

export interface CropConfig {
  variety: string;           // key into VARIETY_DATA
  transplantDate: string;
  plotSizeAcres: number;
  manualStageOverride?: number | null;
}

export interface VarietyInfo {
  name: string;
  min: number;
  max: number;
  avg: number;
  group: string;        // category / region
  grain: string;        // e.g. 'Fine', 'Medium', 'Bold'
  origin: string;       // breeding origin
  awdSuitable: boolean; // well-proven with AWD
  notes?: string;
}

export const VARIETY_DATA: Record<string, VarietyInfo> = {
  // ── Generic ────────────────────────────────────────────────────────
  'short': { name: 'Short Duration (Generic)', min: 100, max: 120, avg: 110, group: 'Generic', grain: 'Medium', origin: 'Generic', awdSuitable: true },
  'medium': { name: 'Medium Duration (Generic)', min: 120, max: 140, avg: 130, group: 'Generic', grain: 'Medium', origin: 'Generic', awdSuitable: true },
  'long': { name: 'Long Duration (Generic)', min: 140, max: 160, avg: 150, group: 'Generic', grain: 'Medium', origin: 'Generic', awdSuitable: true },

  // ── IRRI / International ────────────────────────────────────────────
  'ir64': { name: 'IR64', min: 110, max: 120, avg: 115, group: 'IRRI', grain: 'Fine', origin: 'IRRI Philippines', awdSuitable: true, notes: 'Most widely grown. Excellent AWD response.' },
  'ir36': { name: 'IR36', min: 105, max: 115, avg: 110, group: 'IRRI', grain: 'Medium', origin: 'IRRI Philippines', awdSuitable: true, notes: 'Blast resistant. Widely used in India.' },
  'ir20': { name: 'IR20', min: 120, max: 130, avg: 125, group: 'IRRI', grain: 'Fine', origin: 'IRRI Philippines', awdSuitable: true },


  // ── Tamil Nadu / South India ────────────────────────────────────────
  'adk39': { name: 'ADT 39', min: 105, max: 115, avg: 110, group: 'Tamil Nadu', grain: 'Fine', origin: 'TNAU India', awdSuitable: true, notes: 'Short duration. Widely grown in Cauvery delta.' },
  'adk43': { name: 'ADT 43', min: 100, max: 115, avg: 108, group: 'Tamil Nadu', grain: 'Fine', origin: 'TNAU India', awdSuitable: true },
  'adk45': { name: 'ADT 45', min: 110, max: 120, avg: 115, group: 'Tamil Nadu', grain: 'Slender Fine', origin: 'TNAU India', awdSuitable: true, notes: 'Drought tolerant. Good for AWD.' },
  'co51': { name: 'CO 51', min: 130, max: 145, avg: 135, group: 'Tamil Nadu', grain: 'Medium', origin: 'TNAU India', awdSuitable: false, notes: 'Long duration ponni type. Heavy water user.' },
  'ponni': { name: 'Ponni', min: 140, max: 155, avg: 145, group: 'Tamil Nadu', grain: 'Medium', origin: 'Tamil Nadu', awdSuitable: false, notes: 'Traditional Cauvery delta variety. High water need.' },
  'bhavani': { name: 'Bhavani', min: 115, max: 125, avg: 120, group: 'Tamil Nadu', grain: 'Fine', origin: 'TNAU India', awdSuitable: true },
  'swarna': { name: 'Swarna (General)', min: 130, max: 145, avg: 135, group: 'South India', grain: 'Medium', origin: 'ANGRAU India', awdSuitable: true, notes: 'Most popular kharif variety. AWD proven.' },
  'swarnasubI': { name: 'Swarna Sub1', min: 130, max: 145, avg: 138, group: 'South India', grain: 'Medium', origin: 'IRRI/ANGRAU', awdSuitable: true, notes: 'Submergence tolerant version of Swarna.' },

  // ── Telangana ★ Primary Region ────────────────────────────────────
  // MTU series (most widely grown in Telangana)
  'mtu1010': { name: 'MTU 1010 (Rajendra)', min: 125, max: 135, avg: 130, group: 'Telangana ★', grain: 'Medium', origin: 'ANGRAU / PJTSAU', awdSuitable: true, notes: 'Most popular kharif variety in Telangana. AWD well-proven.' },
  'mtu1001': { name: 'MTU 1001', min: 135, max: 145, avg: 140, group: 'Telangana ★', grain: 'Bold', origin: 'ANGRAU', awdSuitable: true, notes: 'High yielding bold grain. Suited for heavy soils.' },
  'mtu1061': { name: 'MTU 1061', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU', awdSuitable: true, notes: 'Short duration. Saves water in rabi season.' },
  'mtu1064': { name: 'MTU 1064', min: 115, max: 125, avg: 120, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU', awdSuitable: true, notes: 'Very short, AWD ideal. Released for water-scarce zones.' },
  'mtu1075': { name: 'MTU 1075', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU', awdSuitable: true },
  'mtu1121': { name: 'MTU 1121', min: 128, max: 138, avg: 133, group: 'Telangana ★', grain: 'Fine', origin: 'PJTSAU', awdSuitable: true, notes: 'Medium duration. Tolerates mild drought.' },
  'mtu7029': { name: 'MTU 7029 (Swarna)', min: 130, max: 145, avg: 135, group: 'Telangana ★', grain: 'Bold', origin: 'ANGRAU', awdSuitable: true, notes: 'Dominant kharif variety. AWD cycles proven.' },
  // RNR series
  'rnr15048': { name: 'RNR 15048 (Telangana Sona)', min: 115, max: 125, avg: 120, group: 'Telangana ★', grain: 'Slender Fine', origin: 'PJTSAU Rajendranagar', awdSuitable: true, notes: '★ Telangana Sona — premium fine grain. Widely promoted for AWD.' },
  // NLR series
  'nlr145': { name: 'NLR 145', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU Nellore', awdSuitable: true },
  'nlr20083': { name: 'NLR 20083', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU Nellore', awdSuitable: true },
  'nlr34449': { name: 'NLR 34449', min: 115, max: 125, avg: 120, group: 'Telangana ★', grain: 'Slender', origin: 'ANGRAU Nellore', awdSuitable: true, notes: 'Short duration slender grain. Good for rabi.' },
  // JGL series
  'jgl1798': { name: 'JGL 1798', min: 130, max: 140, avg: 135, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU Jagtial', awdSuitable: true, notes: 'Released for Godavari delta zone. Blast tolerant.' },
  'jgl3844': { name: 'JGL 3844 (Pushyami)', min: 135, max: 145, avg: 140, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU Jagtial', awdSuitable: true, notes: 'Flood tolerant. Suitable for Godavari floodplains.' },
  'jgl11118': { name: 'JGL 11118', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'PJTSAU Jagtial', awdSuitable: true },
  // WGL series
  'wgl32100': { name: 'WGL 32100 (Vajram)', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU Warangal', awdSuitable: true, notes: 'Developed for Warangal. Drought-tolerant gene.' },
  'wgl44': { name: 'WGL 44', min: 110, max: 120, avg: 115, group: 'Telangana ★', grain: 'Fine', origin: 'ANGRAU Warangal', awdSuitable: true, notes: 'Very short duration. Saves 15–20% water vs Swarna.' },
  // Hybrids
  'drrh3': { name: 'DRRH-3 (Hybrid)', min: 125, max: 135, avg: 130, group: 'Telangana ★', grain: 'Fine', origin: 'DRR Hyderabad', awdSuitable: true, notes: 'First Indian rice hybrid with proven AWD response.' },
  'karnatakakh2': { name: 'KRH-2 (Hybrid)', min: 120, max: 130, avg: 125, group: 'Telangana ★', grain: 'Fine', origin: 'UAS Dharwad', awdSuitable: true, notes: 'Hybrid. Widely used in Telangana irrigated tracts.' },

  // ── Andhra Pradesh ─────────────────────────────────────────────────
  'bpt5204': { name: 'BPT 5204 (Sona Masuri)', min: 120, max: 135, avg: 127, group: 'Andhra Pradesh', grain: 'Fine', origin: 'ANGRAU', awdSuitable: true, notes: 'Premium table rice. Light grain. AWD compatible.' },
  'bpt2231': { name: 'BPT 2231', min: 115, max: 125, avg: 120, group: 'Andhra Pradesh', grain: 'Fine', origin: 'DRR Hyderabad', awdSuitable: true },
  'swarnasub1': { name: 'Swarna Sub1', min: 130, max: 145, avg: 138, group: 'Andhra Pradesh', grain: 'Bold', origin: 'IRRI / ANGRAU', awdSuitable: true, notes: 'Submergence tolerant. For flood-prone deltas.' },

  // ── Karnataka ──────────────────────────────────────────────────────
  'jyothi': { name: 'Jyothi', min: 105, max: 118, avg: 112, group: 'Karnataka', grain: 'Slender', origin: 'UAS Dharwad', awdSuitable: true },

  // ── Maharashtra ────────────────────────────────────────────────────
  'pkv3': { name: 'PKV 3 (Sahyadri)', min: 110, max: 125, avg: 117, group: 'Maharashtra', grain: 'Medium', origin: 'PDKV Akola', awdSuitable: true },
  'phule3': { name: 'Phule Samruddhi', min: 100, max: 110, avg: 105, group: 'Maharashtra', grain: 'Fine', origin: 'MPKV Rahuri', awdSuitable: true, notes: 'Very short duration. Saves water.' },

  // ── West Bengal / East India ────────────────────────────────────────
  'lalat': { name: 'Lalat', min: 125, max: 135, avg: 130, group: 'East India', grain: 'Medium', origin: 'OUAT Bhubaneswar', awdSuitable: true },
  'naveen': { name: 'Naveen', min: 130, max: 145, avg: 135, group: 'East India', grain: 'Medium', origin: 'OUAT Bhubaneswar', awdSuitable: true },

  // ── Punjab / Haryana ───────────────────────────────────────────────
  'pr121': { name: 'PR 121', min: 128, max: 138, avg: 133, group: 'Punjab / Haryana', grain: 'Fine', origin: 'PAU Ludhiana', awdSuitable: true, notes: 'AWD recommended in Punjab Agri Dept guidelines.' },
  'pr126': { name: 'PR 126', min: 123, max: 128, avg: 125, group: 'Punjab / Haryana', grain: 'Fine', origin: 'PAU Ludhiana', awdSuitable: true, notes: 'Saves ~25% water vs traditional varieties in Punjab.' },
  'pusa44': { name: 'Pusa-44', min: 155, max: 165, avg: 160, group: 'Punjab / Haryana', grain: 'Fine', origin: 'IARI New Delhi', awdSuitable: false, notes: 'Very long duration. High water use — being phased out.' },
  'pusa1121': { name: 'Pusa 1121 (Basmati)', min: 140, max: 150, avg: 145, group: 'Punjab / Haryana', grain: 'Extra Long Fine', origin: 'IARI', awdSuitable: false, notes: 'Premium aromatic Basmati.' },

  // ── Bangladesh / Sri Lanka ─────────────────────────────────────────
  'brri28': { name: 'BRRI dhan28', min: 140, max: 155, avg: 148, group: 'Bangladesh', grain: 'Fine', origin: 'BRRI Bangladesh', awdSuitable: true, notes: 'Boro season. AWD research proven.' },
  'brri29': { name: 'BRRI dhan29', min: 148, max: 158, avg: 153, group: 'Bangladesh', grain: 'Fine', origin: 'BRRI Bangladesh', awdSuitable: true },
  'bg300': { name: 'BG 300', min: 105, max: 115, avg: 110, group: 'Sri Lanka', grain: 'Medium', origin: 'RRDI Sri Lanka', awdSuitable: true },
  'bg360': { name: 'BG 360', min: 100, max: 110, avg: 105, group: 'Sri Lanka', grain: 'Medium', origin: 'RRDI Sri Lanka', awdSuitable: true },
};

// ──────────────────────────────────────────────────────────────────────────────
// STAGE DEFINITIONS  (11 stages, index 0–10)
// Each stage has:  pctStart (inclusive) … pctEnd (exclusive, last one is ∞)
// ──────────────────────────────────────────────────────────────────────────────
export interface StageDefinition {
  index: number;
  name: string;
  phase: 'Pre-Season' | 'Vegetative' | 'Reproductive' | 'Ripening' | 'Finished';
  pctStart: number;
  pctEnd: number;
  advice: string;
  gaugeTarget: string;    // short human-readable gauge target
  managementTips: { category: string; text: string; icon: any }[];
}

export const CROP_STAGES: StageDefinition[] = [
  {
    index: 0,
    name: 'Nursery / Pre-Transplant',
    phase: 'Pre-Season',
    pctStart: -999,
    pctEnd: 0,
    advice: 'Seeds are germinating in nursery. Prepare main field (plowing, leveling).',
    gaugeTarget: 'Field under prep',
    managementTips: [
      { category: 'Land Prep', text: 'Plow and puddle the field 2–3 times for good soil structure', icon: Sprout },
      { category: 'Leveling', text: 'Level field to within ±2 cm for uniform water distribution', icon: AlertCircle },
      { category: 'Nursery', text: 'Maintain thin water layer (1–2 cm) in nursery bed', icon: Droplets },
      { category: 'Seed', text: 'Pre-soak seeds 24 h → incubate 48 h before sowing', icon: Leaf },
    ],
  },
  {
    index: 1,
    name: 'Transplanting / Recovery',
    phase: 'Vegetative',
    pctStart: 0,
    pctEnd: 10,
    advice: 'Keep soil saturated (Gauge 15–17 cm). Avoid deep flood (>18 cm).',
    gaugeTarget: '15–17 cm',
    managementTips: [
      { category: 'Pest', text: 'Monitor for Golden Apple Snails (feed on seedlings)', icon: Bug },
      { category: 'Weeds', text: 'Apply pre-emergence herbicide within 3–5 days of transplanting', icon: AlertCircle },
      { category: 'Care', text: 'Replant missing hills (gap-filling) within 7 days', icon: Sprout },
      { category: 'Water', text: 'Keep saturated. Deep water (>18 cm) drowns seedlings', icon: Droplets },
    ],
  },
  {
    index: 2,
    name: 'Active Tillering',
    phase: 'Vegetative',
    pctStart: 10,
    pctEnd: 50,
    advice: 'Maintain Gauge 17–20 cm. Apply nitrogen splits and practice AWD cycles.',
    gaugeTarget: '15–20 cm',
    managementTips: [
      { category: 'Nutrient', text: 'Apply Nitrogen (Urea) topdress in 2 splits to promote tillers', icon: Leaf },
      { category: 'Weeds', text: 'Critical window for weeding — weeds steal light and nutrients', icon: AlertCircle },
      { category: 'Pest', text: 'Scout for Whorl Maggot, Caseworm, and BPH at base of plant', icon: Bug },
      { category: 'Water', text: 'AWD safe: let Gauge drop to 15 cm, then refill to 20 cm', icon: Droplets },
    ],
  },
  {
    index: 3,
    name: 'Stem Elongation',
    phase: 'Vegetative',
    pctStart: 50,
    pctEnd: 60,
    advice: 'Re-flood after mid-season drain (Gauge 17–20 cm). Prepare for panicle initiation.',
    gaugeTarget: '17–20 cm',
    managementTips: [
      { category: 'Water', text: 'Re-flood field to Gauge 17–20 cm after mid-season drain', icon: Droplets },
      { category: 'Nutrient', text: 'Apply Panicle Initiation (PI) N + K dose now', icon: Leaf },
      { category: 'Pest', text: 'Increase Stem Borer scouting frequency', icon: Bug },
      { category: 'Disease', text: 'Spray fungicide if Blast pressure is high in area', icon: AlertCircle },
    ],
  },
  {
    index: 4,
    name: 'Panicle Initiation (Booting)',
    phase: 'Reproductive',
    pctStart: 60,
    pctEnd: 70,
    advice: 'Flood Required! Keep Gauge >20 cm. Do NOT stress the crop.',
    gaugeTarget: '>20 cm (flood)',
    managementTips: [
      { category: 'Water', text: 'Do NOT drain. Gauge must stay >20 cm — stress reduces yield by 30–50%', icon: Droplets },
      { category: 'Care', text: 'Protect the flag leaf (provides ~50% of final carbohydrates)', icon: Sun },
      { category: 'Pest', text: 'Control rats — they prefer sweet stalks during this stage', icon: Bug },
      { category: 'Nutrient', text: 'Final N top-dress (heading N). Stop after this stage', icon: Leaf },
    ],
  },
  {
    index: 5,
    name: 'Heading / Flowering',
    phase: 'Reproductive',
    pctStart: 70,
    pctEnd: 80,
    advice: 'Maintain steady water (Gauge 17–20 cm). Avoid drainage during anthesis.',
    gaugeTarget: '17–20 cm',
    managementTips: [
      { category: 'Care', text: 'Avoid spraying 9 am –3 pm to protect pollinators during anthesis', icon: Timer },
      { category: 'Pest', text: 'Rice Bug (Stink Bug) active morning & evening — monitor panicle tips', icon: Bug },
      { category: 'Disease', text: 'Monitor for False Smut and Neck Blast on exposed panicles', icon: AlertCircle },
      { category: 'Weather', text: 'Temperatures >35 °C cause pollen sterility — ensure adequate water', icon: Sun },
    ],
  },
  {
    index: 6,
    name: 'Milk / Dough Stage',
    phase: 'Ripening',
    pctStart: 80,
    pctEnd: 90,
    advice: 'Keep soil moist but not flooded. Gauge 15–18 cm is sufficient.',
    gaugeTarget: '15–18 cm',
    managementTips: [
      { category: 'Pest', text: 'Protect ripening grain from birds (nets) and rats (traps)', icon: Bug },
      { category: 'Water', text: 'Standing water not required — moist soil (Gauge ~15 cm) is enough', icon: Droplets },
      { category: 'Care', text: 'Remove off-types (roguing) for seed purity', icon: Sprout },
      { category: 'Harvest', text: 'Plan harvest logistics when ~85% of grains turn golden', icon: Scissors },
    ],
  },
  {
    index: 7,
    name: 'Maturity / Ripening',
    phase: 'Ripening',
    pctStart: 90,
    pctEnd: 105,
    advice: 'Drain field completely (Gauge <15 cm) 10–15 days before harvest to hasten ripening.',
    gaugeTarget: '<15 cm (drain)',
    managementTips: [
      { category: 'Water', text: 'Drain field (Gauge <15 cm) 10–15 days before harvest', icon: Droplets },
      { category: 'Harvest', text: 'Check grain moisture: target 20–24% for combine harvest', icon: Scissors },
      { category: 'Care', text: 'Prepare threshing equipment, tarps, and drying platforms', icon: BookOpen },
      { category: 'Storage', text: 'Line storage sacks and bags to prevent moisture reabsorption', icon: Leaf },
    ],
  },
  {
    index: 8,
    name: 'Harvest Ready',
    phase: 'Finished',
    pctStart: 105,
    pctEnd: 9999,
    advice: 'Field should be dry (Gauge <15 cm). Harvest immediately to avoid grain shattering.',
    gaugeTarget: '<15 cm (dry)',
    managementTips: [
      { category: 'Harvest', text: 'Harvest immediately — delays cause shattering and quality loss', icon: Scissors },
      { category: 'Post', text: 'Dry grains to 14% moisture for safe storage', icon: Sun },
      { category: 'Post', text: 'Chop and incorporate straw — improves next season soil health', icon: Sprout },
    ],
  },
];

const TOTAL_STAGES = CROP_STAGES.length;

// ──────────────────────────────────────────────────────────────────────────────
// calculateStage — returns stage info based on calendar OR manual override
// ──────────────────────────────────────────────────────────────────────────────
export const calculateStage = (cfg: CropConfig) => {
  const start = new Date(cfg.transplantDate).getTime();
  const now = new Date().getTime();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const totalDuration = VARIETY_DATA[cfg.variety].avg;
  const pct = (days / totalDuration) * 100;
  const progressPct = Math.min(Math.max(days / totalDuration, 0), 1);
  const size = cfg.plotSizeAcres || 0;

  // Eco-savings
  const waterSavedLiters = Math.round(500000 * size * progressPct);
  const methaneSavedKg = (48 * size * progressPct).toFixed(1);
  const co2SavedKg = (parseFloat(methaneSavedKg) * 25).toFixed(0);

  // Determine auto stage from calendar pct
  const autoIndex = CROP_STAGES.findIndex(s => pct >= s.pctStart && pct < s.pctEnd) ?? CROP_STAGES.length - 1;
  const resolvedIndex = (cfg.manualStageOverride != null && cfg.manualStageOverride >= 0)
    ? cfg.manualStageOverride
    : Math.max(0, autoIndex);

  const stage = CROP_STAGES[Math.min(resolvedIndex, CROP_STAGES.length - 1)];

  return {
    days: Math.max(0, days),
    stageIndex: stage.index,
    stageName: stage.name,
    advice: stage.advice,
    phase: stage.phase,
    totalDuration,
    managementTips: stage.managementTips,
    ecoStats: { waterSavedLiters, methaneSavedKg, co2SavedKg },
    isManualOverride: cfg.manualStageOverride != null && cfg.manualStageOverride >= 0,
    autoStageIndex: Math.max(0, autoIndex),
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// PHASE COLOURS
// ──────────────────────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  'Pre-Season': { bg: 'bg-slate-100', text: 'text-slate-600', badge: 'bg-slate-200 text-slate-700' },
  'Vegetative': { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  'Reproductive': { bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' },
  'Ripening': { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  'Finished': { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
export const CropManager: React.FC<Props> = ({ sensorId, weather, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<CropConfig | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [stageDropOpen, setStageDropOpen] = useState(false);

  // Form state
  const [variety, setVariety] = useState<string>('medium');
  const [date, setDate] = useState('');
  const [plotSize, setPlotSize] = useState('1.0');

  useEffect(() => {
    const saved = localStorage.getItem(`crop_${sensorId}`);
    if (saved) {
      const parsed: CropConfig = JSON.parse(saved);
      setConfig(parsed);
      setVariety(parsed.variety);
      setDate(parsed.transplantDate);
      setPlotSize(parsed.plotSizeAcres ? String(parsed.plotSizeAcres) : '1.0');
    } else {
      setIsEditing(true);
    }

    const savedNotes = localStorage.getItem(`notes_${sensorId}`);
    if (savedNotes) setNotes(savedNotes);
  }, [sensorId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!stageDropOpen) return;
    const handler = () => setStageDropOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [stageDropOpen]);

  const handleSave = () => {
    if (!date) return;
    const newConfig: CropConfig = {
      variety,
      transplantDate: date,
      plotSizeAcres: parseFloat(plotSize) || 0,
      manualStageOverride: null,
    };
    localStorage.setItem(`crop_${sensorId}`, JSON.stringify(newConfig));
    setConfig(newConfig);
    setIsEditing(false);
    if (onSave) onSave();
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    localStorage.setItem(`notes_${sensorId}`, notes);
    await saveCloudSetting(sensorId, 'notes', notes);
    setSavingNotes(false);
  };

  // ── Manual override helpers ──────────────────────────────────────────────
  const setManualStage = (idx: number | null) => {
    if (!config) return;
    const updated: CropConfig = { ...config, manualStageOverride: idx };
    localStorage.setItem(`crop_${sensorId}`, JSON.stringify(updated));
    setConfig(updated);
    saveCloudSetting(sensorId, 'cropConfig', updated);
    setStageDropOpen(false);
    if (onSave) onSave();
  };

  const clearManualStage = () => setManualStage(null);

  // ── Weather alerts ───────────────────────────────────────────────────────
  const getWeatherAlerts = (stageIndex: number, w: WeatherData) => {
    const alerts: { icon: any; text: string; color: string; bg: string }[] = [];
    if (w.windSpeed > 25) {
      alerts.push(stageIndex >= 7 && stageIndex <= 9
        ? { icon: Wind, text: 'High wind! Risk of lodging. Drain field to anchor roots.', color: 'text-amber-600', bg: 'bg-amber-50' }
        : { icon: Wind, text: 'Windy conditions. Avoid foliar spraying today.', color: 'text-slate-600', bg: 'bg-slate-50' });
    }
    if (w.humidity > 85 && stageIndex >= 2) {
      alerts.push({ icon: Droplet, text: 'High humidity. Monitor for Blast and Bacterial Leaf Blight.', color: 'text-red-600', bg: 'bg-red-50' });
    } else if (w.humidity < 40 && stageIndex === 7) {
      alerts.push({ icon: Droplet, text: 'Low humidity. Pollen desiccation risk — ensure water is adequate.', color: 'text-amber-600', bg: 'bg-amber-50' });
    }
    if (w.temp > 35 && stageIndex === 7) {
      alerts.push({ icon: Thermometer, text: 'Heat Stress! Flood field (Gauge >20 cm) to cool the canopy.', color: 'text-red-600', bg: 'bg-red-50' });
    }
    return alerts;
  };

  // ── Setup / Edit form ────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold">
          <Sprout size={20} />
          <h3>Crop Setup</h3>
        </div>
        <div className="space-y-4">
          {/* Variety — searchable grouped dropdown */}
          {
            (() => {
              const groups = [...new Set(Object.values(VARIETY_DATA).map(v => v.group))];
              const sel = VARIETY_DATA[variety];
              return (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rice Variety</label>
                  <select
                    value={variety}
                    onChange={e => setVariety(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                  >
                    {groups.map(grp => (
                      <optgroup key={grp} label={grp}>
                        {Object.entries(VARIETY_DATA)
                          .filter(([, v]) => v.group === grp)
                          .map(([key, v]) => (
                            <option key={key} value={key}>
                              {v.name} • {v.min}–{v.max}d • {v.grain}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  {sel && (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{sel.min}–{sel.max} days • {sel.grain} grain</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${sel.awdSuitable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {sel.awdSuitable ? '✓ AWD Suitable' : '⚠ High Water Use'}
                        </span>
                      </div>
                      {sel.notes && <p className="text-slate-400 italic">{sel.notes}</p>}
                      <p className="text-slate-400">Origin: {sel.origin}</p>
                    </div>
                  )}
                </div>
              );
            })()
          }

          {/* Date + Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transplant Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plot Size (Acres)</label>
              <input
                type="number"
                step="0.1"
                value={plotSize}
                onChange={(e) => setPlotSize(e.target.value)}
                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                placeholder="e.g. 1.0"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!date}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} /> Start Tracking
          </button>
          {config && (
            <button onClick={() => setIsEditing(false)} className="w-full text-xs text-slate-400 font-medium hover:text-slate-600">Cancel</button>
          )}
        </div>
      </div>
    );
  }

  if (!config) return null;

  const info = calculateStage(config);
  const progress = Math.min((info.days / info.totalDuration) * 100, 100);
  const weatherAlerts = weather ? getWeatherAlerts(info.stageIndex, weather) : [];
  const phaseColors = PHASE_COLORS[info.phase] ?? PHASE_COLORS['Vegetative'];
  const currentStage = CROP_STAGES[info.stageIndex];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full relative">
      {/* Edit settings button */}
      <button
        onClick={() => setIsEditing(true)}
        className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-slate-100 z-10"
        title="Edit crop settings"
      >
        <Edit2 size={12} />
      </button>

      <div className="p-5 bg-gradient-to-b from-emerald-50/50 to-white flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sprout size={16} className="text-emerald-600" />
              Crop Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{VARIETY_DATA[config.variety].name} • {config.plotSizeAcres || 0} Acres</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-800 block leading-none">{info.days}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days Old</span>
          </div>
        </div>

        {/* Paddy Visual */}
        <div className="flex-1 min-h-[120px] relative mb-2">
          <PaddyVisual stageIndex={Math.min(info.stageIndex, 7)} />
        </div>

        {/* ── STAGE DROPDOWN ──────────────────────────────────────────────── */}
        <div className="mt-auto mb-3">
          {/* Stage label row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-emerald-800 leading-tight">{info.stageName}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${phaseColors.badge}`}>{info.phase}</span>
              {info.isManualOverride && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                  <ToggleRight size={10} /> Manual
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-400 shrink-0">
              {info.stageIndex + 1} / {TOTAL_STAGES}
            </span>
          </div>

          {/* Gauge target hint */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 mb-2">
            <Droplets size={11} />
            Gauge Target: <span className="font-black">{currentStage?.gaugeTarget}</span>
          </div>

          {/* Manual Stage Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setStageDropOpen(!stageDropOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/40 transition-all text-slate-700 shadow-sm"
            >
              <div className="flex items-center gap-2">
                {info.isManualOverride
                  ? <ToggleRight size={14} className="text-blue-500" />
                  : <ToggleLeft size={14} className="text-slate-400" />}
                <span>{info.isManualOverride ? 'Manual Stage Selected' : 'Auto Stage (Calendar)'}</span>
              </div>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${stageDropOpen ? 'rotate-180' : ''}`} />
            </button>

            {stageDropOpen && (
              <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {/* Auto option */}
                <button
                  onClick={clearManualStage}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors border-b border-slate-100 ${!info.isManualOverride ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'}`}
                >
                  <ToggleLeft size={12} className={!info.isManualOverride ? 'text-emerald-500' : 'text-slate-300'} />
                  Auto (Calendar-based) — Stage {info.autoStageIndex + 1}
                </button>

                {/* Scrollable stage list */}
                <div className="max-h-52 overflow-y-auto">
                  {CROP_STAGES.map((s) => {
                    const isSelected = info.isManualOverride && info.stageIndex === s.index;
                    const pc = PHASE_COLORS[s.phase] ?? PHASE_COLORS['Vegetative'];
                    return (
                      <button
                        key={s.index}
                        onClick={() => setManualStage(s.index)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${isSelected ? 'bg-blue-50 font-bold' : ''}`}
                      >
                        <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black ${pc.badge}`}>
                          {s.index + 1}
                        </span>
                        <div className="leading-tight">
                          <span className={`block font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{s.name}</span>
                          <span className="text-[10px] text-slate-400">{s.phase}</span>
                        </div>
                        {isSelected && <ToggleRight size={11} className="ml-auto text-blue-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-5">
          <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-1">
            <span>Season Progress</span>
            <span>{Math.round(progress)}% of {info.totalDuration} days</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Stage tick marks */}
            <div className="absolute inset-0 flex">
              {CROP_STAGES.slice(1).map((s) => {
                const pct = Math.max(0, Math.min((s.pctStart / 105) * 100, 100));
                return (
                  <div
                    key={s.index}
                    className="absolute top-0 bottom-0 w-px bg-white/60"
                    style={{ left: `${pct}%` }}
                  />
                );
              })}
            </div>
          </div>
          {/* Advice */}
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{info.advice}</p>
        </div>

        {/* Weather Conditions */}
        {weather && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Live Field Conditions</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col items-center text-center">
                <Wind size={14} className="text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-800">{weather.windSpeed}<span className="text-[9px] text-slate-400 ml-0.5">km/h</span></span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col items-center text-center">
                <Droplet size={14} className="text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-800">{weather.humidity}<span className="text-[9px] text-slate-400 ml-0.5">%</span></span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col items-center text-center">
                <Thermometer size={14} className="text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-800">{weather.temp}<span className="text-[9px] text-slate-400 ml-0.5">°C</span></span>
              </div>
            </div>
            {weatherAlerts.map((alert, idx) => (
              <div key={idx} className={`rounded-lg p-2.5 flex items-start gap-2.5 mb-2 ${alert.bg}`}>
                <alert.icon size={14} className={`shrink-0 mt-0.5 ${alert.color}`} />
                <span className={`text-xs font-medium leading-tight ${alert.color}`}>{alert.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Management Tips */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Management Tips</p>
          {info.managementTips.map((tip, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-start gap-2.5 hover:bg-slate-100 transition-colors">
              <div className="p-1 bg-white rounded-md text-emerald-600 shadow-sm mt-0.5 shrink-0">
                <tip.icon size={12} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{tip.category}</span>
                <span className="text-xs font-medium text-slate-700 leading-snug block">{tip.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Field Notes */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <StickyNote size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Notes</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              {savingNotes ? <RefreshCw size={10} className="animate-spin" /> : <Cloud size={10} />}
              {savingNotes ? 'Syncing...' : 'Cloud Synced'}
            </div>
          </div>
          <textarea
            className="w-full text-xs p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-300 resize-none font-medium placeholder-slate-400"
            rows={3}
            placeholder="Add notes about fertilizer, pests, or field work..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
          />
        </div>
      </div>
    </div>
  );
};
