/**
 * @file LoRa Gateway & Settings Manager
 * @version 4.1 (Added ?days=N filter for quota-friendly fetches)
 * @details Handles logging LoRa sensor data AND syncing App Settings.
 */

// --- CONFIGURATION ---
const BATCHED_DATA_SHEET_NAME = 'AWD_Gateway_Data'; 
const SETTINGS_SHEET_NAME = 'AppSettings';

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
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'saveSetting') {
      return handleSaveSetting(payload);
    }
    return handleLogData(payload);
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
// SECTION 2: LORA DATA LOGGING
// ==========================================

function getAndPrepareDataSheet(ss) {
  let sheet = ss.getSheetByName(BATCHED_DATA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BATCHED_DATA_SHEET_NAME);
  }
  const headers = [
    "Gateway Received Time", "Device ID", "Transmitter Data", "Water Level (cm)", 
    "Status", "Network", "Batch Upload Time", "SIM Operator", 
    "WiFi Strength (dBm)", "GSM Strength (RSSI)", "SD Free (MB)"
  ];
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function setStatusColor(cell, status) {
  const colors = {
    "Low": "#FFC0CB",
    "Good": "#98FB98",
    "Excess": "#FFFFE0",
    "Flood Alert": "#D8BFD8"
  };
  cell.setBackground(colors[status] || "#FFFFFF");
}

function handleLogData(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getAndPrepareDataSheet(ss);
  if (!payload.readings || !Array.isArray(payload.readings)) {
    throw new Error("Invalid or non-batched data format received.");
  }
  const batchUploadTime = payload.upload_ts || new Date().toISOString();
  const network = payload.network || "N/A";
  const simOperator = payload.simOperator || "N/A";
  const wifiStrength = payload.wifiStrength ?? "";
  const gsmStrength = payload.gsmStrength ?? "";
  const sdFreeMB = payload.sdFreeMB ? Number(payload.sdFreeMB).toFixed(2) : "";
  const newRows = payload.readings.map(reading => [
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
    sdFreeMB
  ]);
  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    const numRows = newRows.length;
    const numCols = newRows[0].length;
    sheet.getRange(startRow, 1, numRows, numCols).setValues(newRows);
    for(let i = 0; i < numRows; i++) {
      setStatusColor(sheet.getRange(startRow + i, 5), newRows[i][4]);
    }
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

  // ── NEW: ?days=N filter ────────────────────────────────────────────────────
  // The frontend sends ?days=10 by default to fetch only recent data.
  // ?days=all (or no days param) returns the full history.
  // This reduces JSON payload size and script execution time significantly,
  // helping avoid daily quota exhaustion.
  if (e.parameter && e.parameter.days && e.parameter.days !== 'all') {
    const days = parseInt(e.parameter.days);
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      // "Gateway Received Time" is column index 0 in the raw row
      rows = rows.filter(function(row) {
        try {
          var rowDate = new Date(row[0]);
          return rowDate >= cutoff;
        } catch(err) {
          return true; // keep rows we can't parse
        }
      });
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Existing ?limit param (keep for backward compat)
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
