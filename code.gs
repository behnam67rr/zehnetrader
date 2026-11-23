/**
 * Zehn Trader 2.0 — Google Sheets read-only API bridge
 *
 * این اسکریپت را در یک پروژه مستقل Google Apps Script قرار بده.
 * آن را به پروژه فعلی ربات MT5 اضافه نکن؛ تا doGet/doPost ربات دست‌نخورده بماند.
 *
 * سازگار با index.html ذهن تریدر 2.0:
 *   GET /exec?action=journal&token=...&sheet=Journal&callback=__ztSheetCallback
 *
 * دسترسی این API فقط خواندن است و هیچ سلولی را تغییر نمی‌دهد.
 */

// شناسه فایل Google Sheets را از URL، بین /d/ و /edit، اینجا قرار بده.
const ZT_SPREADSHEET_ID = '1rRX8-P3UeA0RhrBh8TA3D07TJ0sNtJwlaMk0PneoKRI';
const ZT_DEFAULT_SHEET_NAME = 'Journal';
const ZT_TOKEN_PROPERTY = 'ZT_API_TOKEN';
const ZT_ALLOWED_CALLBACK = '__ztSheetCallback';

/**
 * راه‌اندازی اولیه:
 * 1) شناسه شیت را در بالای فایل قرار بده.
 * 2) این تابع را یک بار از محیط Apps Script اجرا کن.
 * 3) مجوز Google Sheets را تأیید کن.
 * 4) کلید چاپ‌شده در Execution log را در ذهن تریدر وارد کن.
 *
 * اگر کلید قبلاً ساخته شده باشد، دوباره همان کلید را نمایش می‌دهد.
 */
function ztInitialize() {
  ztValidateConfiguration_();

  const spreadsheet = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(ZT_DEFAULT_SHEET_NAME);
  if (!sheet) {
    throw new Error('شیت «' + ZT_DEFAULT_SHEET_NAME + '» در فایل Google Sheets پیدا نشد. نام شیت را بررسی کن.');
  }

  const properties = PropertiesService.getScriptProperties();
  let token = properties.getProperty(ZT_TOKEN_PROPERTY);

  if (!token) {
    token = ztGenerateToken_();
    properties.setProperty(ZT_TOKEN_PROPERTY, token);
  }

  Logger.log('Zehn Trader API Token: ' + token);
  Logger.log('Spreadsheet: ' + spreadsheet.getName());
  Logger.log('Sheet: ' + ZT_DEFAULT_SHEET_NAME);
  Logger.log('Initialization completed. Copy the API token into Zehn Trader settings.');

  return 'راه‌اندازی انجام شد. کلید API را از Execution log کپی کن.';
}

/**
 * ساخت کلید جدید و باطل کردن کلید قبلی.
 * فقط زمانی اجرا کن که قصد تعویض کلید را داری؛ سپس کلید جدید را در برنامه وارد کن.
 */
function ztRotateToken() {
  ztValidateConfiguration_();
  const spreadsheet = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
  if (!spreadsheet.getSheetByName(ZT_DEFAULT_SHEET_NAME)) {
    throw new Error('شیت Journal پیدا نشد.');
  }

  const token = ztGenerateToken_();
  PropertiesService.getScriptProperties().setProperty(ZT_TOKEN_PROPERTY, token);
  Logger.log('NEW Zehn Trader API Token: ' + token);
  Logger.log('کلید قبلی باطل شد؛ کلید جدید را در تنظیمات ذهن تریدر جایگزین کن.');
  return 'کلید جدید ساخته شد. آن را از Execution log کپی کن.';
}

/** بررسی دسترسی اسکریپت به فایل و شیت؛ بدون نمایش کلید API. */
function ztTestConnection() {
  ztValidateConfiguration_();
  const spreadsheet = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(ZT_DEFAULT_SHEET_NAME);
  if (!sheet) throw new Error('شیت Journal پیدا نشد.');

  const result = {
    spreadsheet: spreadsheet.getName(),
    sheet: sheet.getName(),
    rows: sheet.getLastRow(),
    columns: sheet.getLastColumn(),
    tokenConfigured: Boolean(PropertiesService.getScriptProperties().getProperty(ZT_TOKEN_PROPERTY))
  };
  Logger.log(JSON.stringify(result));
  return result;
}

/** نقطه ورود وب‌اپ؛ پاسخ JSON یا JSONP مطابق نیاز مرورگر برنامه. */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const callback = String(params.callback || '');
  let payload;

  try {
    ztValidateConfiguration_();

    const savedToken = PropertiesService.getScriptProperties().getProperty(ZT_TOKEN_PROPERTY);
    const suppliedToken = String(params.token || '');

    if (!savedToken) {
      throw new Error('API token تنظیم نشده است. ابتدا تابع ztInitialize را اجرا کن.');
    }
    if (!suppliedToken || !ztSafeEqual_(suppliedToken, savedToken)) {
      throw new Error('کلید دسترسی نامعتبر است. API Token را در تنظیمات ذهن تریدر بررسی کن.');
    }

    const action = String(params.action || 'journal').toLowerCase();
    if (action !== 'journal' && action !== 'mt5_state' && action !== 'mt5_cmd') {
      throw new Error('درخواست API ناشناخته است.');
    }

    const sheetName = String(params.sheet || ZT_DEFAULT_SHEET_NAME).trim();
    if (!sheetName || sheetName.length > 80) {
      throw new Error('نام شیت معتبر نیست.');
    }

    if (action === 'mt5_state') {
      const ssLive = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
      const liveData = ztReadLiveState_(ssLive);
      payload = Object.assign({ status: 'success', ok: true }, liveData);
    } else if (action === 'mt5_cmd') {
      const ssCmd = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
      let cmdParams = {};
      if (params.params) {
        try { cmdParams = JSON.parse(String(params.params)); } catch (e) { cmdParams = {}; }
      }
      const queuedCmd = ztEnqueueCommand_(ssCmd, params.cmd || '', cmdParams);
      payload = Object.assign({ status: 'success', ok: true }, queuedCmd);
    } else {
      payload = ztReadJournal_(sheetName);
    }
  } catch (error) {
    payload = {
      status: 'error',
      message: String(error && error.message ? error.message : error),
      trades: [],
      count: 0
    };
  }

  // فقط callback ثابت و مورد انتظار برنامه پذیرفته می‌شود.
  if (callback) {
    if (callback !== ZT_ALLOWED_CALLBACK) {
      return ContentService
        .createTextOutput('/* Invalid callback */')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    const jsonp = JSON.stringify(payload)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    return ContentService
      .createTextOutput('window.' + ZT_ALLOWED_CALLBACK + ' && window.' + ZT_ALLOWED_CALLBACK + '(' + jsonp + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/** خواندن سطرهای شیت و تبدیل آن‌ها به آرایه‌ای از objectها. */
function ztReadJournal_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return {
      status: 'error',
      message: 'شیت «' + sheetName + '» پیدا نشد.',
      sheet: sheetName,
      trades: [],
      count: 0
    };
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    return {
      status: 'success',
      sheet: sheetName,
      headers: [],
      trades: [],
      count: 0,
      syncedAt: new Date().toISOString()
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0].map(function (header, index) {
    const name = header === null || header === undefined || String(header).trim() === ''
      ? 'column_' + (index + 1)
      : String(header).trim();
    return name;
  });

  const trades = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const isEmpty = row.every(function (value) {
      return value === '' || value === null || value === undefined;
    });
    if (isEmpty) continue;

    const record = {};
    headers.forEach(function (header, columnIndex) {
      record[header] = ztSerializeValue_(row[columnIndex]);
    });
    trades.push(record);
  }

  return {
    status: 'success',
    sheet: sheetName,
    headers: headers,
    trades: trades,
    count: trades.length,
    syncedAt: new Date().toISOString()
  };
}

/** تبدیل مقادیر Date به ISO؛ سایر مقادیر JSON-compatible باقی می‌مانند. */
function ztSerializeValue_(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return '';
  return value;
}

/** تولید توکن تصادفی ۲۵۶ بیتی با استفاده از UUIDهای Google Apps Script. */
function ztGenerateToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

/** مقایسه زمان‌ثابت برای جلوگیری از مقایسه ساده رشته کلید. */
function ztSafeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

/** بررسی تنظیم شناسه فایل قبل از اجرای توابع اصلی. */
function ztValidateConfiguration_() {
  if (!ZT_SPREADSHEET_ID || ZT_SPREADSHEET_ID === 'PASTE_GOOGLE_SHEET_ID_HERE') {
    throw new Error('ابتدا مقدار ZT_SPREADSHEET_ID را در ابتدای فایل با شناسه Google Sheets خودت جایگزین کن.');
  }
}

// ============================================================================
// Zehn Trader + MT5 Live Control Bridge (doPost & Live Telemetry / Command Queue)
// ============================================================================
const WSFX_API_KEY_PROP = 'WSFX_API_KEY';
const ZT_JOURNAL_HEADERS = [
  'Date', 'SignalID', 'Symbol', 'Side', 'EntryPrice', 'SL', 'TP',
  'ExitPrice', 'Status', 'ProfitUSD', 'Lots', 'Risk', 'RewardR', 'Pips', 'Deal'
];

function ztAuthorizePost_(params, bodyObj) {
  const props = PropertiesService.getScriptProperties();
  const expected = String(props.getProperty(WSFX_API_KEY_PROP) || props.getProperty(ZT_TOKEN_PROPERTY) || '').trim();
  const supplied = String((bodyObj && bodyObj.apiKey) || params.apiKey || params.token || '').trim();
  if (!expected) {
    throw new Error('کلید امنیتی در Script Properties تنظیم نشده است.');
  }
  if (!supplied || !ztSafeEqual_(supplied, expected)) {
    throw new Error('کلید دسترسی نامعتبر است.');
  }
}

function ztEnsureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (headers && headers.length > 0) {
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(v => String(v || '').trim());
      let changed = false;
      const merged = existing.slice();
      headers.forEach(h => {
        if (merged.indexOf(h) === -1) {
          merged.push(h);
          changed = true;
        }
      });
      if (changed) {
        sh.getRange(1, 1, 1, merged.length).setValues([merged]);
      }
    }
  }
  return sh;
}

function ztUpsertJournalTrade_(ss, payload) {
  const sh = ztEnsureSheet_(ss, ZT_DEFAULT_SHEET_NAME, ZT_JOURNAL_HEADERS);
  const lastCol = Math.max(sh.getLastColumn(), ZT_JOURNAL_HEADERS.length);
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(v => String(v || '').trim());
  const dealStr = String(payload.deal || '').trim();
  const sigStr = String(payload.signalId || '').trim();
  const dealCol = headers.indexOf('Deal');

  let targetRow = -1;
  if (dealStr && dealCol >= 0 && sh.getLastRow() >= 2) {
    const deals = sh.getRange(2, dealCol + 1, sh.getLastRow() - 1, 1).getValues();
    for (let r = 0; r < deals.length; r++) {
      if (String(deals[r][0] || '').trim() === dealStr) {
        targetRow = r + 2;
        break;
      }
    }
  }

  const rowValues = new Array(lastCol).fill('');
  if (targetRow > 0) {
    const prev = sh.getRange(targetRow, 1, 1, lastCol).getValues()[0];
    for (let c = 0; c < lastCol; c++) rowValues[c] = prev[c];
  }

  const fieldMap = {
    'Date': payload.date || new Date().toISOString(),
    'SignalID': sigStr,
    'Symbol': String(payload.symbol || '').trim().toUpperCase(),
    'Side': String(payload.side || '').trim(),
    'EntryPrice': payload.entryPrice !== undefined ? Number(payload.entryPrice) : '',
    'SL': payload.sl !== undefined ? Number(payload.sl) : '',
    'TP': payload.tp !== undefined ? Number(payload.tp) : '',
    'ExitPrice': payload.exitPrice !== undefined ? Number(payload.exitPrice) : '',
    'Status': String(payload.status || '').trim(),
    'ProfitUSD': payload.profit !== undefined ? Number(payload.profit) : 0,
    'Lots': payload.lots !== undefined ? Number(payload.lots) : 0,
    'Risk': payload.risk !== undefined ? String(payload.risk) : '',
    'RewardR': payload.reward !== undefined ? Number(payload.reward) : 0,
    'Pips': payload.pips !== undefined ? Number(payload.pips) : 0,
    'Deal': dealStr
  };

  Object.keys(fieldMap).forEach(colName => {
    const idx = headers.indexOf(colName);
    if (idx >= 0) rowValues[idx] = fieldMap[colName];
  });

  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, lastCol).setValues([rowValues]);
    return { updated: true, row: targetRow };
  } else {
    sh.appendRow(rowValues);
    return { updated: false, row: sh.getLastRow() };
  }
}

function ztSyncLiveStateAndFetchCommand_(ss, payload) {
  const liveSh = ztEnsureSheet_(ss, 'LiveState', ['Key', 'Value', 'UpdatedAt']);
  const nowIso = new Date().toISOString();
  const stateObj = {
    account: payload.account || '',
    currency: payload.currency || 'USD',
    balance: Number(payload.balance || 0),
    equity: Number(payload.equity || 0),
    freeMargin: Number(payload.freeMargin || 0),
    floating: Number(payload.floating || 0),
    todayPL: Number(payload.todayPL || 0),
    autoEnabled: Boolean(payload.autoEnabled),
    secondEnabled: Boolean(payload.secondEnabled),
    signalEnabled: Boolean(payload.signalEnabled),
    dailyLimitEnabled: Boolean(payload.dailyLimitEnabled),
    dailyLimitPct: Number(payload.dailyLimitPct || 0),
    riskMode: String(payload.riskMode || 'PERCENT'),
    riskValue: Number(payload.riskValue || 0),
    rr: Number(payload.rr || 1),
    positions: Array.isArray(payload.positions) ? payload.positions : [],
    orders: Array.isArray(payload.orders) ? payload.orders : [],
    lastAck: payload.lastAck || null,
    heartbeatAt: nowIso
  };

  liveSh.getRange('A1:C2').setValues([
    ['Key', 'Value', 'UpdatedAt'],
    ['MT5_LIVE_STATE', JSON.stringify(stateObj), nowIso]
  ]);

  const cmdSh = ztEnsureSheet_(ss, 'CommandQueue', ['CommandID', 'Command', 'ParamsJson', 'Status', 'CreatedAt', 'Result']);
  const lastRow = cmdSh.getLastRow();
  let nextCmd = null;

  if (lastRow >= 2) {
    const rows = cmdSh.getRange(2, 1, lastRow - 1, 6).getValues();
    for (let i = 0; i < rows.length; i++) {
      const st = String(rows[i][3] || '').trim().toUpperCase();
      if (st === 'PENDING') {
        const cmdId = String(rows[i][0] || '').trim();
        const cmdName = String(rows[i][1] || '').trim();
        let parsedParams = {};
        try {
          parsedParams = rows[i][2] ? JSON.parse(String(rows[i][2])) : {};
        } catch (err) {
          parsedParams = {};
        }
        cmdSh.getRange(i + 2, 4, 1, 2).setValues([['SENT', nowIso]]);
        nextCmd = {
          cmdId: cmdId,
          cmd: cmdName,
          params: parsedParams
        };
        break;
      }
    }
  }

  return nextCmd;
}

function ztAckCommand_(ss, payload) {
  const cmdSh = ztEnsureSheet_(ss, 'CommandQueue', ['CommandID', 'Command', 'ParamsJson', 'Status', 'CreatedAt', 'Result']);
  const cmdId = String(payload.cmdId || '').trim();
  const status = String(payload.status || 'EXECUTED').trim();
  const resultText = String(payload.result || '').trim();
  const nowIso = new Date().toISOString();
  if (cmdId && cmdSh.getLastRow() >= 2) {
    const rows = cmdSh.getRange(2, 1, cmdSh.getLastRow() - 1, 6).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === cmdId) {
        cmdSh.getRange(i + 2, 4, 1, 3).setValues([[status, rows[i][4] || nowIso, resultText]]);
        break;
      }
    }
  }
}

function ztEnqueueCommand_(ss, cmdName, paramsObj) {
  const cmdSh = ztEnsureSheet_(ss, 'CommandQueue', ['CommandID', 'Command', 'ParamsJson', 'Status', 'CreatedAt', 'Result']);
  const cmdId = 'CMD_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  const nowIso = new Date().toISOString();
  cmdSh.appendRow([cmdId, String(cmdName || '').trim(), JSON.stringify(paramsObj || {}), 'PENDING', nowIso, '']);
  return { cmdId: cmdId, status: 'PENDING', createdAt: nowIso };
}

function ztReadLiveState_(ss) {
  const liveSh = ss.getSheetByName('LiveState');
  let stateObj = null;
  if (liveSh && liveSh.getLastRow() >= 2) {
    const raw = liveSh.getRange(2, 2).getValue();
    if (raw) {
      try {
        stateObj = JSON.parse(String(raw));
      } catch (e) {
        stateObj = null;
      }
    }
  }
  const cmdSh = ss.getSheetByName('CommandQueue');
  const recentCommands = [];
  if (cmdSh && cmdSh.getLastRow() >= 2) {
    const startRow = Math.max(2, cmdSh.getLastRow() - 9);
    const rows = cmdSh.getRange(startRow, 1, cmdSh.getLastRow() - startRow + 1, 6).getValues();
    for (let i = rows.length - 1; i >= 0; i--) {
      if (!rows[i][0]) continue;
      recentCommands.push({
        cmdId: String(rows[i][0] || ''),
        cmd: String(rows[i][1] || ''),
        status: String(rows[i][3] || ''),
        createdAt: String(rows[i][4] || ''),
        result: String(rows[i][5] || '')
      });
    }
  }
  return { state: stateObj, recentCommands: recentCommands, syncedAt: new Date().toISOString() };
}

function doPost(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  let payloadObj = {};
  let output;

  try {
    ztValidateConfiguration_();
    const rawPost = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '';
    if (rawPost) {
      payloadObj = JSON.parse(rawPost);
    }
    ztAuthorizePost_(params, payloadObj);

    const ss = SpreadsheetApp.openById(ZT_SPREADSHEET_ID);
    const action = String(payloadObj.action || params.action || 'journal').toLowerCase();

    if (action === 'sync_state') {
      const nextCmd = ztSyncLiveStateAndFetchCommand_(ss, payloadObj);
      output = Object.assign({ status: 'success', ok: true }, nextCmd || {});
    } else if (action === 'cmd_ack') {
      ztAckCommand_(ss, payloadObj);
      output = { status: 'success', ok: true };
    } else if (action === 'enqueue_cmd') {
      const queued = ztEnqueueCommand_(ss, payloadObj.cmd, payloadObj.params || {});
      output = Object.assign({ status: 'success', ok: true }, queued);
    } else {
      const saved = ztUpsertJournalTrade_(ss, payloadObj);
      output = Object.assign({ status: 'success', ok: true }, saved);
    }
  } catch (err) {
    output = {
      status: 'error',
      ok: false,
      message: String(err && err.message ? err.message : err)
    };
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
