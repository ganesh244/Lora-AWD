/**
 * @file Code.gs
 * @brief LoRa Gateway & Settings Manager (V7.81 Firmware Compatible)
 * @version 5.0 (Merged Firmware V7.81 payloads with Quota-Friendly Fetching)
 * @details Handles logging LoRa sensor data, Heartbeat diagnostics, AND syncing App Settings.
 */

// --- CONFIGURATION ---
const BATCHED_DATA_SHEET_NAME = 'AWD_Gateway_Data'; 
const SETTINGS_SHEET_NAME = 'AppSettings';
const HEARTBEAT_SHEET_NAME = 'Heartbeat';

/**
 * ENTRY POINT: HANDLE GET REQUESTS
 * Routes to either Settings retrieval or Data retrieval
 */
function doGet(e) {
  try {
    if (e.parameter && e.parameter.action === 'getSettings') {
      return handleGetSettings(e);
    }
    return handleGetData(e);
  } catch (err) {
    return createJSONOutput({ status: "error", message: err.message });
  }
}

/**
 * ENTRY POINT: HANDLE POST REQUESTS
 * Routes payload to Settings, Heartbeats, or Batched Telemetry
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // 1. Settings Update
    if (payload.action === 'saveSetting') {
      return handleSaveSetting(payload);
    }
    
    // 2. Gateway Heartbeat
    if (payload.type === 'heartbeat') {
      return handleHeartbeat(payload);
    }
    
    // 3. Batched Telemetry
    if (payload.readings && Array.isArray(payload.readings)) {
      return handleLogData(payload);
    }

    throw new Error("Invalid payload format received.");
  } catch (err) {
    return createJSONOutput({ result: "error", message: err.message });
  }
}

// ==========================================
// SECTION 1: SETTINGS MANAGEMENT
// ==========================================

function getAndPrepareSettingsSheet(ss) {
  let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    sheet.appendRow(["DeviceID", "Key", "Value", "Timestamp"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  }
  return sheet;
}

function handleGetSettings(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getAndPrepareSettingsSheet(ss);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    const deviceId = data[i][0];
    const key = data[i][1];
    let value = data[i][2];
    try { value = JSON.parse(value); } catch(e) {}
    if (!settings[deviceId]) settings[deviceId] = {};
    settings[deviceId][key] = value;
  }
  return createJSONOutput(settings);
}

function handleSaveSetting(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getAndPrepareSettingsSheet(ss);
  const { deviceId, key, value } = payload;
  if (!deviceId || !key) throw new Error("Missing deviceId or key");
  const range = sheet.getDataRange();
  const data = range.getValues();
  let rowToUpdate = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === deviceId && data[i][1] === key) {
      rowToUpdate = i + 1;
      break;
    }
  }
  const timestamp = new Date().toISOString();
  const valString = JSON.stringify(value);
  if (rowToUpdate > 0) {
    sheet.getRange(rowToUpdate, 3).setValue(valString);
    sheet.getRange(rowToUpdate, 4).setValue(timestamp);
  } else {
    sheet.appendRow([deviceId, key, valString, timestamp]);
  }
  return createJSONOutput({ result: "success", device: deviceId, key: key });
}

// ==========================================
// SECTION 2: HEARTBEAT DIAGNOSTICS
// ==========================================

function handleHeartbeat(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(HEARTBEAT_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(HEARTBEAT_SHEET_NAME);
    sheet.appendRow([
      "Upload TS", "Gateway Status", "GSM Module", "Operator", 
      "Signal (CSQ)", "Modem Temp (°C)", "Last LoRa RX"
    ]);
    sheet.getRange("A1:G1").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    payload.upload_ts || new Date().toISOString(),
    payload.gateway || "UNKNOWN",
    payload.gsm || "UNKNOWN",
    payload.simOperator || "UNKNOWN",
    payload.gsmStrength || 0,
    payload.temp || 0.0,
    payload.last_lora_rx || "NO_DATA"
  ]);
  
  return createJSONOutput({ result: "success", message: "Heartbeat Logged" });
}

// ==========================================
// SECTION 3: LORA DATA LOGGING
// ==========================================

function getAndPrepareDataSheet(ss) {
  let sheet = ss.getSheetByName(BATCHED_DATA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BATCHED_DATA_SHEET_NAME);
  }
  const headers = [
    "Gateway Received Time", "Device ID", "Transmitter Data", "Water Level (cm)", 
    "Status", "Network", "Batch Upload Time", "SIM Operator", 
    "WiFi Strength (dBm)", "GSM Strength (CSQ)", "SD Free (MB)", "Source"
  ];
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function handleLogData(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getAndPrepareDataSheet(ss);
  
  const batchUploadTime = payload.upload_ts || new Date().toISOString();
  const network = payload.network || "N/A";
  const simOperator = payload.simOperator || "N/A";
  const wifiStrength = payload.wifiStrength ?? "";
  const gsmStrength = payload.gsmStrength ?? "";
  const sdFreeMB = payload.sdFreeMB ? Number(payload.sdFreeMB).toFixed(2) : "";
  
  const colorMap = {
    "Low": "#FFC0CB",
    "Good": "#98FB98",
    "Excess": "#FFFFE0",
    "Flood Alert": "#D8BFD8"
  };

  const newRows = [];
  const backgroundColors = [];

  payload.readings.forEach(reading => {
    newRows.push([
      reading.gateway_rx_ts || "", 
      reading.device || "Unknown Device",
      reading.tx_data || "",       
      reading.waterLevel ?? "",
      reading.status || "N/A",
      network,                     
      batchUploadTime,
      simOperator,
      wifiStrength,
      gsmStrength,
      sdFreeMB,
      reading.source || "live"
    ]);
    backgroundColors.push([colorMap[reading.status] || "#FFFFFF"]);
  });

  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    const numRows = newRows.length;
    const numCols = newRows[0].length;
    sheet.getRange(startRow, 1, numRows, numCols).setValues(newRows);
    sheet.getRange(startRow, 5, numRows, 1).setBackgrounds(backgroundColors);
  }
  
  return createJSONOutput({ result: "success", message: `${newRows.length} records processed.` });
}

function handleGetData(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BATCHED_DATA_SHEET_NAME);
  
  if (!sheet) {
    return createJSONOutput({ status: "error", message: "Sheet not found." });
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  if (values.length <= 1) return createJSONOutput([]);

  const headers = values[0];
  let rows = values.slice(1);

  // Reverse so newest rows come first
  rows.reverse();

  // ── ?days=N filter for Quota-Friendly Fetching ──
  if (e.parameter && e.parameter.days && e.parameter.days !== 'all') {
    const days = parseInt(e.parameter.days);
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      rows = rows.filter(function(row) {
        try {
          var rowDate = new Date(row[0]); // "Gateway Received Time"
          return rowDate >= cutoff;
        } catch(err) {
          return true;
        }
      });
    }
  }

  // Existing ?limit param
  if (e.parameter && e.parameter.limit) {
    const limit = parseInt(e.parameter.limit);
    if (!isNaN(limit)) rows = rows.slice(0, limit);
  }

  const jsonData = rows.map(row => {
    let record = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] instanceof Date) ? row[index].toISOString() : row[index];
    });
    return record;
  });

  return createJSONOutput(jsonData);
}

// ==========================================
// UTILITIES
// ==========================================

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
