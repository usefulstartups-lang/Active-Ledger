/* Data layer. The Google Sheet is the control panel; Supabase is the database the site reads.
   Each Sheet tab lives in the `sheet_data` table (see supabase/schema.sql) and is synced by
   google-sheet/sync-to-supabase.gs. Rows come back as plain objects keyed by the Sheet's column
   headers, exactly like the old CSV parser produced, so page code didn't need to change.

   ULData.cached(tabs)  -> {tab: rows|null}   instant, from this browser's last visit
   ULData.load(tabs)    -> Promise<{tab: rows|null}>  fresh from Supabase (falls back to the cache offline) */
(function () {
  "use strict";
  var URL_ = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  var KEY = typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "";
  var PAGE = 1000;                      // Supabase returns at most 1000 rows per request
  var CK = "ul_tab_";
  var inflight = {};

  function readCache(tab) { try { return JSON.parse(localStorage.getItem(CK + tab)); } catch (e) { return null; } }
  function writeCache(tab, rows) { try { localStorage.setItem(CK + tab, JSON.stringify(rows)); } catch (e) { /* storage full or blocked */ } }

  function fetchTabs(tabs) {
    var out = {}; tabs.forEach(function (t) { out[t] = []; });
    var base = URL_ + "/rest/v1/sheet_data?select=tab,data&order=tab.asc,row_num.asc&tab=in.(" + tabs.join(",") + ")";
    function page(from) {
      return fetch(base + "&limit=" + PAGE + "&offset=" + from, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (rows) {
          rows.forEach(function (x) { (out[x.tab] || (out[x.tab] = [])).push(x.data); });
          return rows.length === PAGE ? page(from + PAGE) : out;
        });
    }
    return page(0);
  }

  // What a search looks at. Used by BOTH the home search and the Ledger search, so they always agree.
  var HAY = ["Startup Name", "Founders", "Key Investors", "Tagline / Description", "Tags", "Underlying Tech"];

  window.ULData = {
    hay: function (row) { return HAY.map(function (k) { var v = row[k]; return v && v !== "-" ? v : ""; }).join(" ").toLowerCase(); },
    cached: function (tabs) {
      var o = {}; tabs.forEach(function (t) { var c = readCache(t); o[t] = c && c.length ? c : null; }); return o;
    },
    load: function (tabs) {
      var missing = tabs.filter(function (t) { return !inflight[t]; });
      if (missing.length && URL_ && KEY) {
        var req = fetchTabs(missing);
        missing.forEach(function (t) {
          inflight[t] = req.then(function (all) {
            if (all[t].length) writeCache(t, all[t]);
            return all[t].length ? all[t] : readCache(t);          // empty answer: keep what we had
          }).catch(function () { return readCache(t); });           // offline / error: last known copy
        });
      }
      return Promise.all(tabs.map(function (t) { return inflight[t] || Promise.resolve(readCache(t)); })).then(function (res) {
        var o = {}; tabs.forEach(function (t, i) { o[t] = res[i] && res[i].length ? res[i] : null; });
        tabs.forEach(function (t) { delete inflight[t]; });
        return o;
      });
    }
  };
})();
