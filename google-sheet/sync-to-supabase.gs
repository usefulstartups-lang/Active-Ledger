/**
 * Useful Startups: Google Sheet -> Supabase sync.
 *
 * The Sheet stays your control panel. Edit it exactly like before (add, change or
 * delete startups, change texts, hide rows with Visible = no ...). This script copies
 * every tab into Supabase, and the website reads from Supabase.
 *
 * ONE-TIME SETUP (5 minutes)
 *  1. In the Sheet: Extensions > Apps Script. Create a new file (+ > Script), name it
 *     sync-to-supabase, paste this whole file. (forms.gs lives in the same project; they don't clash.)
 *  2. Project Settings (gear icon) > Script properties > Add:
 *        SUPABASE_URL          https://YOUR-PROJECT.supabase.co
 *        SUPABASE_SERVICE_KEY  your service_role key  (Supabase > Project Settings > API)
 *     The service key lives ONLY here. Never put it in the website code.
 *  3. Pick the function  installSync  in the toolbar and press Run. Approve the
 *     permissions. It creates the automatic triggers and does a first full sync.
 *
 * AFTER THAT
 *  - Edit the Sheet; the website updates about a minute later.
 *  - Want it instantly? Menu  Useful Startups > Sync to website now.
 */

// ---- Which Sheet tab feeds which part of the website ------------------------------------
// The key (left) is what the website asks Supabase for. The name (right) must match your tab name exactly.
// Rename a tab in the Sheet? Change the name here too.
var TABS = {
  ledger:     { name: 'Ledger' },
  founders:   { name: 'Founders' },
  settings:   { name: 'Settings' },
  nav:        { name: 'Nav' },
  pages:      { name: 'Pages' },
  team:       { name: 'Team' },
  highlights: { name: 'Highlights' },
  unlisted:   { name: 'Unlisted Shares', optional: true }   // optional: skipped if the tab doesn't exist
};

var HIDDEN_RE = /^(no|false|0|hide|hidden)$/i;
var DEBOUNCE_MS = 60 * 1000;

// ---- Menu + manual sync ----------------------------------------------------------------
function syncOnOpen() {
  SpreadsheetApp.getUi().createMenu('Useful Startups')
    .addItem('Sync to website now', 'syncNowFromMenu')
    .addItem('Check connection', 'checkConnection')
    .addToUi();
}

function syncNowFromMenu() {
  var report = syncAll();
  SpreadsheetApp.getActive().toast(report, 'Synced to the website', 8);
}

function checkConnection() {
  var p = props_();
  var res = UrlFetchApp.fetch(p.url + '/rest/v1/sheet_data?select=tab&limit=1', {
    headers: { apikey: p.key, Authorization: 'Bearer ' + p.key }, muteHttpExceptions: true
  });
  SpreadsheetApp.getUi().alert(res.getResponseCode() === 200
    ? 'Connected to Supabase.'
    : 'Supabase answered ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
}

// ---- Core sync -------------------------------------------------------------------------
function syncAll() {
  var done = [];
  Object.keys(TABS).forEach(function (key) {
    var n = syncTab(key);
    if (n !== null) done.push(key + ' ' + n);
  });
  PropertiesService.getScriptProperties().deleteProperty('dirty');
  return done.join(' · ');
}

/** Copies one tab to Supabase. Returns the number of rows, or null if the tab is absent. */
function syncTab(key) {
  var cfg = TABS[key];
  var sheet = findSheet_(cfg);
  if (!sheet) {
    if (cfg.optional) return null;
    throw new Error('Tab "' + cfg.name + '" not found. Check the tab name against TABS at the top of this script.');
  }
  var rows = buildRows_(sheet.getDataRange().getDisplayValues());
  var p = props_();
  var res = UrlFetchApp.fetch(p.url + '/rest/v1/rpc/replace_tab', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: p.key, Authorization: 'Bearer ' + p.key },
    payload: JSON.stringify({ p_tab: key, p_rows: rows }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('Supabase rejected "' + key + '" (' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 300));
  }
  return rows.length;
}

/**
 * Turns a sheet (array of rows of strings) into an array of objects keyed by the header row.
 * Rows that are completely empty, or marked Visible = no/false/0/hide/hidden, are left out, so
 * hidden rows never reach the public database.
 */
function buildRows_(values) {
  if (!values || values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var visCol = headers.indexOf('Visible');
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!row.some(function (c) { return String(c).trim() !== ''; })) continue;
    if (visCol >= 0 && HIDDEN_RE.test(String(row[visCol]).trim())) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (headers[c]) obj[headers[c]] = String(row[c] == null ? '' : row[c]).trim();
    }
    out.push(obj);
  }
  return out;
}

function findSheet_(cfg) {
  var sheets = SpreadsheetApp.getActive().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === cfg.name) return sheets[i];
  }
  return null;
}

function props_() {
  var sp = PropertiesService.getScriptProperties();
  var url = (sp.getProperty('SUPABASE_URL') || '').replace(/\/+$/, '');
  var key = sp.getProperty('SUPABASE_SERVICE_KEY') || '';
  if (!url || !key) throw new Error('Add SUPABASE_URL and SUPABASE_SERVICE_KEY under Project Settings > Script properties.');
  return { url: url, key: key };
}

// ---- Automatic syncing (installed once by installSync) ---------------------------------
/** Runs on every edit. Only records WHICH tab changed; the real sync is debounced below. */
function syncOnEdit(e) {
  try {
    var name = e && e.range ? e.range.getSheet().getName() : '';
    var hit = Object.keys(TABS).filter(function (k) {
      return TABS[k].name === name;
    });
    if (hit.length) markDirty_(hit);
  } catch (err) { /* never block editing */ }
}

/** Runs on structural changes (rows/columns inserted or deleted). */
function syncOnChange(e) {
  if (e && /ROW|COLUMN|OTHER/.test(e.changeType)) markDirty_(Object.keys(TABS));
}

function markDirty_(keys) {
  var sp = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var cur = JSON.parse(sp.getProperty('dirty') || '[]');
    keys.forEach(function (k) { if (cur.indexOf(k) < 0) cur.push(k); });
    sp.setProperty('dirty', JSON.stringify(cur));
    var pending = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncFlushDirty'; });
    if (!pending) ScriptApp.newTrigger('syncFlushDirty').timeBased().after(DEBOUNCE_MS).create();
  } finally { lock.releaseLock(); }
}

/** One minute after the last edit burst: sync only the tabs that changed. */
function syncFlushDirty() {
  var sp = PropertiesService.getScriptProperties();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncFlushDirty') ScriptApp.deleteTrigger(t);
  });
  var dirty = JSON.parse(sp.getProperty('dirty') || '[]');
  sp.deleteProperty('dirty');
  dirty.forEach(function (k) { syncTab(k); });
}

/** Run this ONCE. Creates the triggers and does the first full sync. */
function installSync() {
  var mine = ['syncOnOpen', 'syncOnEdit', 'syncOnChange', 'syncFlushDirty', 'syncAll'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (mine.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  var ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('syncOnOpen').forSpreadsheet(ss).onOpen().create();
  ScriptApp.newTrigger('syncOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('syncOnChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('syncAll').timeBased().everyHours(1).create();   // safety net
  Logger.log('First sync: ' + syncAll());
}
