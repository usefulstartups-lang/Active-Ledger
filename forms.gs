/**
 * Useful Startups: form receiver (Contact page, "Suggest a startup", missed searches).
 *
 * Deploy ONCE from the Google Sheet:
 *   Extensions > Apps Script > new file, paste this > Deploy > New deployment > type "Web app"
 *   Execute as: Me   |   Who has access: Anyone   > Deploy
 * Copy the web app URL (ends in /exec) into  public/js/config.js  as  FORMS_URL.
 *
 * Everything lands in the Sheet, so the Sheet stays your one control panel:
 *   Contacts        every message from the Contact page
 *   Submissions     every "Suggest a startup" request (review, then copy good ones into the Ledger tab)
 *   Missed Searches what visitors searched for in the Ledger and did not find (with a counter)
 * The tabs are created automatically the first time something arrives.
 *
 * If you change this code later: Deploy > Manage deployments > Edit > New version.
 */
var MAX = 3000;

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.formType === 'contact') {
      append_('Contacts', ['Time', 'Name', 'Email', 'Message'],
        [new Date(), cut_(d.name, 100), cut_(d.email, 200), cut_(d.message, MAX)]);
    } else if (d.formType === 'activeSuggestion') {
      append_('Submissions', ['Time', 'Name', 'Email', 'Relationship', 'Startup status', 'Startup', 'Website', 'Tagline', 'Sector', 'Notes'],
        [new Date(), cut_(d.submitterName, 100), cut_(d.submitterEmail, 200), cut_(d.relationship, 100), cut_(d.startupStatus, 100),
         cut_(d.startupName, 150), cut_(d.startupWebsite, 300), cut_(d.tagline, 300), cut_(d.sector, 100), cut_(d.notes, MAX)]);
    } else if (d.keyword) {
      missed_(cut_(d.keyword, 120).toLowerCase());
    } else {
      return out_({ ok: false, error: 'unknown form' });
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function cut_(v, n) { v = String(v == null ? '' : v).trim().slice(0, n); return /^[=+\-@]/.test(v) ? "'" + v : v; }  // stops spreadsheet formula injection

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers); sh.setFrozenRows(1); sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function append_(name, headers, row) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { sheet_(name, headers).appendRow(row); } finally { lock.releaseLock(); }
}

function missed_(term) {
  if (!term) return;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sh = sheet_('Missed Searches', ['Keyword', 'Count', 'First seen', 'Last seen']);
    var last = sh.getLastRow(), now = new Date();
    if (last > 1) {
      var keys = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]).toLowerCase() === term) {
          var r = i + 2;
          sh.getRange(r, 2).setValue((Number(sh.getRange(r, 2).getValue()) || 0) + 1);
          sh.getRange(r, 4).setValue(now);
          return;
        }
      }
    }
    sh.appendRow([term, 1, now, now]);
  } finally { lock.releaseLock(); }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
