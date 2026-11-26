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


  // ---------- tidy-up applied to the Ledger on the way in, so EVERY page sees the same clean data ----------
  // "Not available", "Not  Available." (double space, full stop), "N/A", "unknown", "not specified (stealth)" ... all count as "no data"
  var BLANK_RE = /^(n ?\/? ?a|nil|null|none|tbd|unknown|undisclosed|not (available|applicable|specified|disclosed|provided|known|found|mentioned|sure|yet)( .*)?)$/;
  var isBlank = function (v) {
    v = String(v == null ? "" : v).toLowerCase().replace(/[^a-z\/ ]+/g, " ").replace(/\s+/g, " ").trim();
    return !v || BLANK_RE.test(v);
  };

  var STATES = ["andhra pradesh","arunachal pradesh","assam","bihar","chhattisgarh","goa","gujarat","haryana","himachal pradesh","jharkhand","karnataka","kerala","madhya pradesh","maharashtra","manipur","meghalaya","mizoram","nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","tamilnadu","telangana","tripura","uttar pradesh","uttarakhand","west bengal","jammu and kashmir","jammu & kashmir","ladakh","puducherry","chandigarh","andaman and nicobar"];
  var ALIAS = { "bangalore": "Bengaluru", "bengaluru urban": "Bengaluru", "bengalooru": "Bengaluru", "bangaluru": "Bengaluru", "bengaluru rural": "Bengaluru",
    "gurgaon": "Gurugram", "bombay": "Mumbai", "greater mumbai": "Mumbai", "madras": "Chennai", "calcutta": "Kolkata", "poona": "Pune",
    "cochin": "Kochi", "trivandrum": "Thiruvananthapuram", "baroda": "Vadodara", "vizag": "Visakhapatnam", "mysore": "Mysuru", "mangalore": "Mangaluru",
    "new delhi": "Delhi", "delhi ncr": "Delhi", "ncr": "Delhi", "nct of delhi": "Delhi", "delhi/ncr": "Delhi", "allahabad": "Prayagraj", "pondicherry": "Puducherry",
    "sas nagar": "Mohali", "trichy": "Tiruchirappalli", "belgaum": "Belagavi", "hubli": "Hubballi", "calicut": "Kozhikode", "noida extension": "Noida", "greater noida": "Greater Noida", "gift city": "GIFT City" };
  var titleCase = function (v) { return v.toLowerCase().replace(/(^|[\s\-'’.(\/])([a-z\u00c0-\u024f])/g, function (m, a, b) { return a + b.toUpperCase(); }); };

  // "bengaluru, karnataka" / "Bangalore, India" / "Bengaluru India" / "Karnataka, Bengaluru"  ->  "Bengaluru"
  function cityOf(raw) {
    if (isBlank(raw)) return "";
    var parts = String(raw).replace(/\(.*?\)/g, " ").split(/[,\/|;]|\s[-–—]\s/).map(function (p) { return p.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    var pick = "";
    for (var i = 0; i < parts.length; i++) {
      var l = parts[i].toLowerCase();
      if (l === "india" || STATES.indexOf(l) >= 0) continue;           // a country / state on its own is not the city
      pick = parts[i]; break;
    }
    if (!pick) return "";
    var low = pick.toLowerCase().replace(/\s+(india|city)$/, function (m, w) { return /gift\s+city$/.test(pick.toLowerCase()) ? m : ""; });
    STATES.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (st) {
      if (low.length > st.length + 1 && low.slice(-(st.length + 1)) === " " + st) low = low.slice(0, -(st.length + 1)).trim();
    });
    low = low.replace(/\s+india$/, "").trim();
    if (isBlank(low)) return "";
    return ALIAS[low] || titleCase(low);
  }

  function tidyLedger(rows) {
    if (!rows) return rows;
    var forms = {};                                                       // sector spelling -> use the most common one
    rows.forEach(function (r) {
      if (r._tidy) return;
      r._tidy = 1;
      r._hq = r["Headquarters"] || "";                                    // keep the original text (the map uses its state hint)
      r["Headquarters"] = cityOf(r["Headquarters"]);
      if (isBlank(r["Sector"])) r["Sector"] = "";
    });
    rows.forEach(function (r) {
      var s = (r["Sector"] || "").trim(); if (!s) return;
      var k = s.toLowerCase().replace(/[^a-z0-9]+/g, ""), f = forms[k] || (forms[k] = {});
      f[s] = (f[s] || 0) + 1;
    });
    rows.forEach(function (r) {
      var s = (r["Sector"] || "").trim(); if (!s) return;
      var f = forms[s.toLowerCase().replace(/[^a-z0-9]+/g, "")], best = s, n = 0;
      Object.keys(f).forEach(function (x) { if (f[x] > n) { n = f[x]; best = x; } });
      r["Sector"] = best;
    });
    return rows;
  }
  var tidy = function (tab, rows) { return tab === "ledger" ? tidyLedger(rows) : rows; };

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
    isBlank: isBlank, city: cityOf,
    // Where the contact / suggestion / missed-search forms are sent. js/config.js FORMS_URL, or the Sheet's Settings tab (key: forms_url).
    formsUrl: function () {
      if (typeof FORMS_URL !== "undefined" && FORMS_URL) return Promise.resolve(FORMS_URL);
      return window.ULData.load(["settings"]).then(function (d) {
        var u = ""; (d.settings || []).forEach(function (r) {
          var k = String(r.Key || "").trim(), v = String(r.Value || "").trim();
          if ((k === "forms_url" || k === "contact_form_url") && v) u = v;
        });
        return /^https:\/\//.test(u) ? u : "";
      }).catch(function () { return ""; });
    },
    hay: function (row) { return HAY.map(function (k) { var v = row[k]; return v && v !== "-" ? v : ""; }).join(" ").toLowerCase(); },
    cached: function (tabs) {
      var o = {}; tabs.forEach(function (t) { var c = readCache(t); o[t] = c && c.length ? tidy(t, c) : null; }); return o;
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
        var o = {}; tabs.forEach(function (t, i) { o[t] = res[i] && res[i].length ? tidy(t, res[i]) : null; });
        tabs.forEach(function (t) { delete inflight[t]; });
        return o;
      });
    }
  };
})();
