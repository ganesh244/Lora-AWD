
export interface SheetRow {
  "Gateway Received Time": string;
  "Device ID": string;
  "Transmitter Data": string;
  "Water Level (cm)": number;
  "Status": string;
  "Network": string;
  "Batch Upload Time": string;
  "SIM Operator": string;
  "WiFi Strength (dBm)": number | string;
  "GSM Strength (CSQ)": number | string;
  "GSM Strength (RSSI)"?: number | string; // legacy — kept for rows written before v5.0 script
  "SD Free (MB)": number | string;
  "Source"?: string; // v5.0+
}

export interface SensorData {
  id: string;
  name: string;
  currentLevel: number;
  lastUpdated: string;
  status: 'Low' | 'Good' | 'Excess' | 'Flood Alert' | 'Unknown';
  history: { time: string; level: number }[];
  raw: SheetRow;
}

export interface GatewayStatus {
  network: string;
  simOperator: string;
  wifiSignal: string;
  gsmSignal: string;
  sdFree: string;
  lastBatchUpload: string;
  source?: string;
}
