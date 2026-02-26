
import { SheetRow, SensorData, GatewayStatus } from '../types';

// --- CACHING CONSTANTS ---
// Default (10-day) data cache: 10 minutes
const CACHE_TTL_MS = 10 * 60 * 1000;
// Full history cache: 30 minutes (fetched lazily per-sensor)
const FULL_HISTORY_CACHE_TTL_MS = 30 * 60 * 1000;

// --- DATA CONFIGURATION ---
const DEFAULT_DATA_SOURCES = [
  // 1. Original LoRa Gateway Sheet (Primary for Settings)
  'https://script.google.com/macros/s/AKfycbwMl7VGQlu4--r5DjptzE8JF5XXDoRIWSnYJ-0qCuYBEQnLbaBvXHzBNmuQcgjiynnf/exec',

  // 2. Standalone GSM Device Sheet
  'https://script.google.com/macros/s/AKfycby61hthQVULKFW_1--hI0V2t-gjxOVSnUzZ6iHK-Q-RT2cpUbvgvmM7BfFt5rSOuR0MFw/exec',

  // 3. Standalone WiFi Device Sheet
  'https://script.google.com/macros/s/AKfycbyUep63cVY28X9M-P-1ypTfXILhTCb9h0_YJkqQkiwoNlkhgOavrj2qlESiXge8OPEA0w/exec?action=readAll'
];

// Helper to get active sources
const getActiveDataSources = () => {
  try {
    const saved = localStorage.getItem('app_data_sources');
    if (saved) {
      const sources = JSON.parse(saved);
      if (Array.isArray(sources) && sources.length > 0) return sources;
    }
  } catch (e) {
    console.error("Error reading data sources", e);
  }
  return DEFAULT_DATA_SOURCES;
};

export const saveDataSources = (sources: string[]) => {
  localStorage.setItem('app_data_sources', JSON.stringify(sources));
};

export const resetDataSources = () => {
  localStorage.removeItem('app_data_sources');
};

// --- CLOUD SETTINGS API ---
// We use the first data source (LoRa Sheet) as the "Master" for settings
const getSettingsApiUrl = () => {
  const sources = getActiveDataSources();
  return sources.length > 0 ? sources[0] : '';
};

export const fetchCloudSettings = async () => {
  try {
    const url = getSettingsApiUrl();
    if (!url) return null;
    // Handle potential query params in URL
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}action=getSettings&_t=${Date.now()}`;
    const response = await fetch(finalUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error("Failed to fetch cloud settings", e);
    return null;
  }
};

export const saveCloudSetting = async (deviceId: string, key: string, value: any) => {
  try {
    const url = getSettingsApiUrl();
    if (!url) return false;
    // Clean URL for POST (remove query params if any, though usually Apps Script handles POST to exec)
    const cleanUrl = url.split('?')[0];

    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script quirk
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveSetting',
        deviceId,
        key,
        value
      })
    });
    return true;
  } catch (e) {
    console.error("Failed to save cloud setting", e);
    return false;
  }
};

export const syncAllSettingsToCloud = async () => {
  // Placeholder for bulk sync if needed
};
// --------------------------

// Helper to parse date strings robustly handling multiple formats (ISO, US, Euro)
export const parseDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const cleanStr = String(dateStr).trim().replace(/['"]/g, '');

  // Convert ' ' to 'T' and append 'Z' if missing, so Date.parse treats it as UTC instead of local time
  let isoStr = cleanStr;
  if (!isoStr.includes('T') && isoStr.includes(' ')) {
    isoStr = isoStr.replace(' ', 'T');
  }
  if (!isoStr.endsWith('Z') && !isoStr.includes('+') && !isoStr.match(/-\d{2}:\d{2}$/)) {
    isoStr += 'Z';
  }

  // 1. Try native Date parsing first (Handles ISO 8601 and standard formats)
  const nativeTime = Date.parse(isoStr);
  if (!isNaN(nativeTime) && nativeTime > 946684800000) { // > Year 2000
    return nativeTime;
  }

  // 2. Fallback: Manual regex parsing for specific formats
  const parts = cleanStr.split(/[^0-9]+/);

  if (parts.length >= 3) {
    const nums = parts.map(p => parseInt(p, 10));

    let year = 0, month = 0, day = 0, hour = 0, min = 0, sec = 0;

    // Case A: Year first (YYYY-MM-DD)
    if (nums[0] > 1000) {
      year = nums[0];
      month = nums[1];
      day = nums[2];
      if (parts.length > 3) hour = nums[3];
      if (parts.length > 4) min = nums[4];
      if (parts.length > 5) sec = nums[5];
    }
    // Case B: Year third (MM/DD/YYYY or DD/MM/YYYY)
    else if (nums[2] > 1000) {
      year = nums[2];
      if (nums[0] > 12) {
        day = nums[0];
        month = nums[1];
      } else {
        month = nums[0];
        day = nums[1];
      }

      if (parts.length > 3) hour = nums[3];
      if (parts.length > 4) min = nums[4];
      if (parts.length > 5) sec = nums[5];
    }

    if (year > 0 && month > 0 && day > 0) {
      // Month is 0-indexed in JS Date
      // Use Date.UTC to prevent the browser from assuming local timezone and creating an offset
      const utcTime = Date.UTC(year, month - 1, day, hour, min, sec);
      const constructed = new Date(utcTime);
      if (!isNaN(constructed.getTime())) return constructed.getTime();
    }
  }

  return 0;
};

export const formatFriendlyDate = (dateStr: string): string => {
  const ts = parseDate(dateStr);
  if (ts === 0) return "N/A";
  const date = new Date(ts);

  try {
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return date.toDateString();
  }
};

export const formatDateTime = (dateStr: string): string => {
  const ts = parseDate(dateStr);
  if (ts === 0) return "N/A";
  const date = new Date(ts);

  const pad = (n: number) => n < 10 ? '0' + n : n;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// --- VALIDATION HELPER ---
const isValidDeviceId = (id: string): boolean => {
  if (!id) return false;
  const cleanId = String(id).trim();

  if (cleanId.length === 0) return false;
  if (['N/A', 'n/a', 'undefined', 'null', 'unknown'].includes(cleanId.toLowerCase())) return false;

  // Check if ID looks like an ISO Timestamp (e.g. 2025-11-25T10:46:14.272Z)
  // Contains 'T', ends with 'Z' (optional), starts with 202x
  if (cleanId.match(/^202[0-9]-[0-1][0-9]-[0-3][0-9]T/)) return false;

  // Check if ID looks like a standard Date (YYYY-MM-DD)
  if (cleanId.match(/^202[0-9]-[0-1][0-9]-[0-3][0-9]$/)) return false;

  return true;
};
// -------------------------

// In-flight request deduplication
let _fetchInFlight: Promise<{ sensors: SensorData[], gateway: GatewayStatus, logs: SheetRow[] }> | null = null;
let _fetchFullInFlight: Promise<{ sensors: SensorData[], gateway: GatewayStatus, logs: SheetRow[] }> | null = null;

// Default fetch — last 10 days only (quota-friendly)
export const fetchSensorData = async (forceRefresh = false): Promise<{ sensors: SensorData[], gateway: GatewayStatus, logs: SheetRow[] }> => {
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem('sensor_cache');
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          console.log(`[dataService] Returning 10-day cache`);
          return data;
        }
      }
    } catch (e) { /* fall through */ }

    if (_fetchInFlight) return _fetchInFlight;
  }

  // forceRefresh completely replaces the flight promise to ensure immediate real-time network requests
  _fetchInFlight = _doFetchSensorData(10);
  try { return await _fetchInFlight; } finally { _fetchInFlight = null; }
};

// Extended fetch — all historical data, triggered on-demand by chart
export const fetchSensorDataExtended = async (forceRefresh = false): Promise<{ sensors: SensorData[], gateway: GatewayStatus, logs: SheetRow[] }> => {
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem('sensor_cache_full');
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < FULL_HISTORY_CACHE_TTL_MS) {
          console.log(`[dataService] Returning full-history cache`);
          return data;
        }
      }
    } catch (e) { /* fall through */ }

    if (_fetchFullInFlight) return _fetchFullInFlight;
  }

  // forceRefresh completely replaces the flight promise to ensure immediate real-time network requests
  _fetchFullInFlight = _doFetchSensorData(0); // 0 = all days
  try { return await _fetchFullInFlight; } finally { _fetchFullInFlight = null; }
};

const _doFetchSensorData = async (days = 10): Promise<{ sensors: SensorData[], gateway: GatewayStatus, logs: SheetRow[] }> => {
  try {
    const activeSources = getActiveDataSources().filter(url => url && url.trim().length > 0 && url.startsWith('http'));

    if (activeSources.length === 0) {
      console.warn("No data sources configured in dataService.ts");
      return { sensors: [], gateway: getDefaultGateway(), logs: [] };
    }

    // Build URLs — append ?days=N for server-side date filtering.
    // days=0 means fetch everything (used by fetchSensorDataExtended).
    const sourcesWithDays = activeSources.map(url => {
      let finalUrl = url;
      if (days > 0) {
        const sep = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${sep}days=${days}`;
      }
      // Add a cache buster parameter to bypass browser caching
      const tsSep = finalUrl.includes('?') ? '&' : '?';
      return `${finalUrl}${tsSep}_t=${Date.now()}`;
    });

    const fetchPromises = sourcesWithDays.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'omit',
          redirect: 'follow',
          cache: 'no-store'
        });

        if (!response.ok) {
          console.warn(`HTTP Error from source ${url}: ${response.status}`);
          return [];
        }

        const contentType = response.headers.get('content-type');

        // Google Apps Script returns HTML when quota is exceeded (content-type: text/html)
        // Detect this case and throw so the caller falls back to cache.
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text().catch(() => '');
          if (
            text.includes('exceeded') ||
            text.includes('quota') ||
            text.includes('Service invoked too many times')
          ) {
            throw new Error('The quota has been exceeded. Showing cached data.');
          }
          return [];
        }

        const data = await response.json();

        // Apps Script can also return a JSON error object when quota is hit
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const errMsg = data.error || data.message || '';
          if (
            typeof errMsg === 'string' &&
            (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exceeded'))
          ) {
            throw new Error('The quota has been exceeded. Showing cached data.');
          }
        }

        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          if (data.data && Array.isArray(data.data)) return data.data;
          // Handle single object return (fallback, though readAll should return array)
          if (data.timestamp || data.waterLevel) return [data];
          return [];
        }
        return [];
      } catch (error: any) {
        // Re-throw quota errors so the main handler can fall back to cache
        if (error?.message?.includes('quota') || error?.message?.includes('exceeded')) {
          throw error;
        }
        console.warn(`Failed to fetch from source: ${url}`, error);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);

    // Merge and Normalize Data
    let allRows: SheetRow[] = [];
    results.forEach(rows => {
      if (Array.isArray(rows)) {
        const normalized = rows.map((r: any) => {
          // Detect Data Type based on available fields (camelCase keys from standalone devices)

          // 1. GSM Device (Has gsmStrength, usually CSQ)
          if (r.gsmStrength !== undefined || (r.network && r.network.toLowerCase().includes('gsm'))) {
            return {
              "Gateway Received Time": r.timestamp,
              "Device ID": r.device || "Standalone GSM",
              "Transmitter Data": r.dataType || "Direct",
              "Water Level (cm)": Number(r.waterLevel || 0),
              "Status": r.status || "Unknown",
              "Network": "GSM",
              "Batch Upload Time": r.timestamp,
              "SIM Operator": r.simOperator || "-",
              "WiFi Strength (dBm)": 0,
              "GSM Strength (CSQ)": r.gsmStrength || 0,
              "SD Free (MB)": r.sdRemaining || 0
            } as SheetRow;
          }

          // 2. WiFi Device (Has wifiStrength, usually 0-10 scale)
          if (r.wifiStrength !== undefined || (r.network && r.network.toLowerCase().includes('wifi'))) {
            // Normalize WiFi Signal: Arduino sends 0-10, we need dBm (-90 to -30)
            const rawWifi = Number(r.wifiStrength || 0);
            // If raw is small (0-10), convert. If already negative (dBm), keep it.
            const wifiDbm = rawWifi > 0 && rawWifi <= 10 ? (rawWifi * 6) - 90 : (rawWifi < 0 ? rawWifi : -95);

            return {
              "Gateway Received Time": r.timestamp,
              "Device ID": r.device || "Standalone WiFi",
              "Transmitter Data": r.dataType || "Direct",
              "Water Level (cm)": Number(r.waterLevel || 0),
              "Status": r.status || "Unknown",
              "Network": "WiFi",
              "Batch Upload Time": r.timestamp,
              "SIM Operator": "-",
              "WiFi Strength (dBm)": wifiDbm,
              "GSM Strength (CSQ)": 0,
              "SD Free (MB)": r.sdRemaining || 0
            } as SheetRow;
          }

          // 3. LoRa Gateway (Standard keys)
          return r as SheetRow;
        });
        allRows = [...allRows, ...normalized];
      }
    });

    if (allRows.length === 0) {
      return { sensors: [], gateway: getDefaultGateway(), logs: [] };
    }

    const rows = allRows;

    // 1. Sort by time (Oldest -> Newest) for history
    const sortedRows = [...rows]
      .filter(r => r["Gateway Received Time"])
      .sort((a, b) => parseDate(a["Gateway Received Time"]) - parseDate(b["Gateway Received Time"]));

    // 2. Group by Device
    const groupedSensors: Record<string, SensorData> = {};

    // Determine latest system info from the absolute last row
    let latestGatewayRow = sortedRows.length > 0 ? sortedRows[sortedRows.length - 1] : rows[0];

    sortedRows.forEach(row => {
      const deviceId = row["Device ID"];

      // --- STRICT FILTER ---
      if (!isValidDeviceId(deviceId)) {
        return; // Skip invalid, empty, or timestamp-like IDs
      }
      // --------------------

      const rawLevel = Number(row["Water Level (cm)"]);
      const realLevel = isNaN(rawLevel) ? 0 : rawLevel;
      const time = row["Gateway Received Time"];

      if (!groupedSensors[deviceId]) {
        groupedSensors[deviceId] = {
          id: deviceId,
          name: mapDeviceNickname(deviceId),
          currentLevel: realLevel,
          lastUpdated: time,
          status: row["Status"] as any,
          history: [],
          raw: row
        };
      }

      groupedSensors[deviceId].currentLevel = realLevel;
      groupedSensors[deviceId].lastUpdated = time;
      groupedSensors[deviceId].status = row["Status"] as any;
      groupedSensors[deviceId].raw = row;

      groupedSensors[deviceId].history.push({
        time: time,
        level: realLevel
      });
    });

    const sensors = Object.values(groupedSensors);

    const gateway: GatewayStatus = {
      network: latestGatewayRow["Network"] || "Offline",
      simOperator: latestGatewayRow["SIM Operator"] || "N/A",
      wifiSignal: String(latestGatewayRow["WiFi Strength (dBm)"] || "0"),
      // Support both old (RSSI) and new (CSQ) column header names for backward compat
      gsmSignal: String(latestGatewayRow["GSM Strength (CSQ)"] || latestGatewayRow["GSM Strength (RSSI)"] || "0"),
      sdFree: String(latestGatewayRow["SD Free (MB)"] || "0"),
      lastBatchUpload: latestGatewayRow["Batch Upload Time"] || latestGatewayRow["Gateway Received Time"] || "N/A",
      source: latestGatewayRow["Device ID"] // Track which device provided this status
    };

    // 3. Logs (Newest -> Oldest)
    const logs = [...sortedRows].reverse();

    return { sensors, gateway, logs };

  } catch (error) {
    console.error("Critical error processing sensor data:", error);
    throw error;
  }
};

export const mapDeviceNickname = (id: string): string => {
  if (!id) return "Unknown";
  const lowerId = id.toLowerCase();

  // LoRa Nodes
  if (lowerId.includes("lora1")) return "Plot 1";
  if (lowerId.includes("lora2")) return "Plot 2";
  if (lowerId.includes("lora3")) return "Plot 3";
  if (lowerId.includes("lora4")) return "Plot 4";
  if (lowerId.includes("lora5")) return "Plot 5";

  // GSM / Standalone Device Mappings
  if (lowerId.includes("wifi")) return "Standalone WiFi";
  if (lowerId.includes("gsm")) return "Standalone GSM";
  if (lowerId.includes("standalone") || lowerId.includes("sa_") || lowerId.includes("esp32")) return "Standalone Field";

  return id;
};

const getDefaultGateway = (): GatewayStatus => ({
  network: "Unknown",
  simOperator: "-",
  wifiSignal: "-",
  gsmSignal: "-",
  sdFree: "-",
  lastBatchUpload: "-",
  source: "None"
});
