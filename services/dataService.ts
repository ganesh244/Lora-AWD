import { SheetRow, SensorData, GatewayStatus } from '../types';

// The URL extracted from your Arduino code
const API_URL = 'https://script.google.com/macros/s/AKfycbwMl7VGQlu4--r5DjptzE8JF5XXDoRIWSnYJ-0qCuYBEQnLbaBvXHzBNmuQcgjiynnf/exec';

// Helper to parse date strings robustly handling multiple formats (ISO, US, Euro)
export const parseDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const cleanStr = String(dateStr).trim().replace(/['"]/g, '');
  
  // 1. Try native Date parsing first (Handles ISO 8601 and standard formats)
  const nativeTime = Date.parse(cleanStr);
  if (!isNaN(nativeTime) && nativeTime > 946684800000) { // > Year 2000
    return nativeTime;
  }

  // 2. Fallback: Manual regex parsing for specific formats like "11/21/2025 3:44:49"
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
       // Heuristic: If first part > 12, it must be Day (DD/MM/YYYY)
       // Otherwise, default to US format (MM/DD/YYYY)
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
       const constructed = new Date(year, month - 1, day, hour, min, sec);
       if (!isNaN(constructed.getTime())) return constructed.getTime();
    }
  }

  return 0;
};

// Returns date in format: "21 Nov, 3:44 PM"
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

// Returns date in standard format: "YYYY-MM-DD HH:mm:ss"
export const formatDateTime = (dateStr: string): string => {
  const ts = parseDate(dateStr);
  if (ts === 0) return "N/A";
  const date = new Date(ts);
  
  const pad = (n: number) => n < 10 ? '0' + n : n;
  // Returns format: 2025-11-20 22:22:29
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const fetchSensorData = async (): Promise<{ sensors: SensorData[], gateway: GatewayStatus, logs: SheetRow[] }> => {
  try {
    // Append timestamp to prevent browser caching of the GET request
    const response = await fetch(`${API_URL}?nocache=${Date.now()}`, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error("Received non-JSON response:", text.substring(0, 200));
      throw new Error("Received invalid response from Google Sheets.");
    }

    const rawData = await response.json();

    if (rawData && !Array.isArray(rawData)) {
      if (rawData.status === 'error' || rawData.result === 'error') {
        return { sensors: [], gateway: getDefaultGateway(), logs: [] };
      }
      if (Object.keys(rawData).length === 0) {
         return { sensors: [], gateway: getDefaultGateway(), logs: [] };
      }
      throw new Error("Invalid data format received.");
    }

    if (!rawData || rawData.length === 0) {
      return { sensors: [], gateway: getDefaultGateway(), logs: [] };
    }

    const rows = rawData as SheetRow[];

    // 1. Sort all raw data by time (Oldest -> Newest) for correct history
    const sortedRows = [...rows]
      .filter(r => r["Gateway Received Time"])
      .sort((a, b) => parseDate(a["Gateway Received Time"]) - parseDate(b["Gateway Received Time"]));
    
    // 2. Group by Device
    const groupedSensors: Record<string, SensorData> = {};
    // Determine latest gateway info from the absolute last row
    let latestGatewayRow = sortedRows.length > 0 ? sortedRows[sortedRows.length - 1] : rows[0];

    sortedRows.forEach(row => {
      const deviceId = row["Device ID"];
      
      // Raw water level from sensor (assumed cm)
      const rawLevel = Number(row["Water Level (cm)"]);
      const realLevel = rawLevel;
      
      const time = row["Gateway Received Time"];
      
      if (!groupedSensors[deviceId]) {
        groupedSensors[deviceId] = {
          id: deviceId,
          name: mapDeviceNickname(deviceId),
          currentLevel: realLevel,
          lastUpdated: time,
          status: row["Status"] as any, // Note: Status from sheet might be based on raw, but we display our calculated level
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
      gsmSignal: String(latestGatewayRow["GSM Strength (RSSI)"] || "0"),
      sdFree: String(latestGatewayRow["SD Free (MB)"] || "0"),
      lastBatchUpload: latestGatewayRow["Batch Upload Time"] || latestGatewayRow["Gateway Received Time"] || "N/A"
    };

    // 3. Logs should be Newest -> Oldest (Latest at top)
    const logs = [...sortedRows].reverse();

    return { sensors, gateway, logs };

  } catch (error) {
    console.error("Fetching from Google Sheets failed:", error);
    throw error; 
  }
};

export const mapDeviceNickname = (id: string): string => {
  if (!id) return "Unknown";
  if (id.includes("Lora1")) return "Plot 1";
  if (id.includes("Lora2")) return "Plot 2";
  if (id.includes("Lora3")) return "Plot 3";
  if (id.includes("Lora4")) return "Plot 4";
  if (id.includes("Lora5")) return "Plot 5";
  return id;
};

const getDefaultGateway = (): GatewayStatus => ({
  network: "Unknown",
  simOperator: "-",
  wifiSignal: "-",
  gsmSignal: "-",
  sdFree: "-",
  lastBatchUpload: "-"
});