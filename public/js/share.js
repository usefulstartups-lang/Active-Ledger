/* Share a startup from the Ledger.
   Opens a share sheet (download / native share / WhatsApp / LinkedIn / X / copy link) and builds a
   structured PDF report of the startup, watermarked "Brought to you by Useful Startups".
   Loaded on demand by ledger.html (openShare). The PDF library (js/vendor/pdf-lib.min.js, MIT) is only
   downloaded when someone actually creates a report. */
(function () {
  "use strict";

  /* ---------------- small helpers ---------------- */
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var clean = function (v) { v = String(v == null ? "" : v).trim(); return v === "-" ? "" : v; };
  var list = function (v) { return clean(v).split(",").map(function (x) { return x.trim(); }).filter(Boolean); };
  var siteBase = function () { return ((window.ULSite && window.ULSite.url) || (typeof SITE_URL !== "undefined" ? SITE_URL : location.origin)).replace(/\/+$/, ""); };
  var siteHost = function () { return siteBase().replace(/^https?:\/\//, ""); };
  var slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "startup"; };

  function linkFor(row) { return siteBase() + "/ledger.html#s=" + encodeURIComponent(clean(row["Startup Name"])); }

  function summaryText(row) {
    var name = clean(row["Startup Name"]), tag = clean(row["Tagline / Description"]);
    var facts = [clean(row["Sector"]), clean(row["Headquarters"]), clean(row["Founded In"]) ? "Est. " + clean(row["Founded In"]) : ""].filter(Boolean).join(" · ");
    var fund = [clean(row["Funding Amount"]), clean(row["Funding Stage"])].filter(Boolean).join(" · ");
    return [name + (tag ? ": " + tag : ""),
      facts, fund ? "Funding: " + fund : "",
      "Full profile: " + linkFor(row), "",
      "Brought to you by Useful Startups, India's startup ledger and news. Visit " + siteBase()
    ].filter(function (x, i, a) { return x !== "" || a[i - 1] !== ""; }).join("\n");
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  /* ---------------- PDF report ---------------- */
  var WIN_ANSI_EXTRA = "\u2014\u2013\u2018\u2019\u201C\u201D\u2022\u2026\u2122\u20AC\u2039\u203A\u2020\u2021\u2030";
  // The built-in PDF fonts only cover Latin-1 + a few symbols. Swap what we can, drop the rest (e.g. emoji).
  var ALLOWED = null;                       // set from the font itself once it is loaded
  function san(s) {
    var t = sanBase(s);
    if (!ALLOWED) return t;
    var o = ""; for (var i = 0; i < t.length; i++) if (ALLOWED[t.charCodeAt(i)]) o += t[i];
    return o;
  }
  function sanBase(s) {
    return String(s == null ? "" : s)
      .replace(/\u20B9\s*/g, "Rs. ").replace(/\u2192/g, "->").replace(/[\u2010\u2011\u2012]/g, "-").replace(/[\r\n\t]+/g, " ")
      .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, function (c) { return WIN_ANSI_EXTRA.indexOf(c) >= 0 ? c : ""; })
      .replace(/\s{2,}/g, " ").trim();
  }

  function wrap(text, font, size, maxW) {
    var words = san(text).split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      while (font.widthOfTextAtSize(w, size) > maxW) {            // a single very long word: hard-split it
        var cut = w.length; while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) cut--;
        if (cur) { lines.push(cur); cur = ""; }
        lines.push(w.slice(0, cut)); w = w.slice(cut);
      }
      var t = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  function fetchNews(name) {
    if (typeof SUPABASE_URL === "undefined") return Promise.resolve([]);
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 3000);
    var url = SUPABASE_URL + "/rest/v1/articles?select=title,source,published_at&startup_name=eq." + encodeURIComponent(name) + "&order=published_at.desc&limit=3";
    return fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); }).then(function (a) { return Array.isArray(a) ? a : []; })
      .catch(function () { return []; }).then(function (a) { clearTimeout(t); return a; });
  }

  // Useful Startups mark, embedded so the report never depends on a file being reachable.
  var LOGO_B64 = "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";
  function logoBytes() {
    var bin = atob(LOGO_B64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  /* Other startups in the same sector (best effort: the report still builds without them). */
  function relatedFor(row, rows) {
    var sec = clean(row["Sector"]);
    if (!sec || !rows || !rows.length) return { sector: "", total: 0, items: [] };
    var me = clean(row["Startup Name"]).toLowerCase(), city = clean(row["Headquarters"]).toLowerCase();
    var same = rows.filter(function (r) {
      var n = clean(r["Startup Name"]).toLowerCase();
      return n && n !== me && clean(r["Sector"]).toLowerCase() === sec.toLowerCase() && !/^(no|false|0|hide|hidden)$/i.test(String(r["Visible"] || "").trim());
    });
    same.sort(function (a, b) {
      var fa = /^yes$/i.test(clean(a["Featured"])) ? 0 : 1, fb = /^yes$/i.test(clean(b["Featured"])) ? 0 : 1;
      var ca = clean(a["Headquarters"]).toLowerCase() === city ? 0 : 1, cb = clean(b["Headquarters"]).toLowerCase() === city ? 0 : 1;
      return fa - fb || ca - cb || clean(a["Startup Name"]).localeCompare(clean(b["Startup Name"]));
    });
    return { sector: sec, total: same.length, items: same.slice(0, 5) };
  }

  function buildReport(row) {
    var name = clean(row["Startup Name"]);
    var lib = window.PDFLib ? Promise.resolve() : loadScript("js/vendor/pdf-lib.min.js");
    return lib.catch(function () { throw new Error("PDF library could not be loaded"); }).then(function () {
      if (!window.PDFLib || !window.PDFLib.PDFDocument) throw new Error("PDF library is missing from the website files");
      return Promise.all([
        fetchNews(name),
        (window.ULData ? ULData.load(["ledger"]).then(function (d) { return d.ledger || []; }) : Promise.resolve([])).catch(function () { return []; })
      ]);
    }).then(function (r) { return render(row, r[0], relatedFor(row, r[1])); });
  }

  function render(row, news, related) {
    var L = window.PDFLib, rgb = L.rgb, degrees = L.degrees;
    var NAVY = rgb(0.043, 0.071, 0.125), GOLD = rgb(0.851, 0.643, 0.255), GOLD_D = rgb(0.54, 0.42, 0.19);
    var INK = rgb(0.10, 0.12, 0.17), MUTED = rgb(0.40, 0.43, 0.49), RULE = rgb(0.86, 0.85, 0.82), PANEL = rgb(0.965, 0.955, 0.93), TEAL = rgb(0.227, 0.561, 0.541);
    var W = 595.28, H = 841.89, M = 44, CW = W - 2 * M, FOOT = 64;
    var host = san(siteHost()), base = siteBase();
    var date = san(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    var name = clean(row["Startup Name"]);

    return L.PDFDocument.create().then(function (pdf) {
      pdf.setTitle(name + ": Startup report | Useful Startups");
      pdf.setAuthor("Useful Startups"); pdf.setSubject("Startup profile from the Useful Startups Ledger"); pdf.setCreator(host);
      return Promise.all([
        pdf.embedFont(L.StandardFonts.Helvetica), pdf.embedFont(L.StandardFonts.HelveticaBold),
        pdf.embedFont(L.StandardFonts.HelveticaOblique), pdf.embedFont(L.StandardFonts.TimesRomanBold),
        pdf.embedPng(logoBytes()).catch(function () { return null; })
      ]).then(function (f) {
        var reg = f[0], bold = f[1], ital = f[2], serif = f[3], logo = f[4];
        ALLOWED = {}; reg.getCharacterSet().forEach(function (c) { ALLOWED[c] = 1; });
        var pages = [], page, y;

        function T(txt, x, yy, o) {
          o = o || {};
          var t = san(txt); if (!t) return;
          page.drawText(t, { x: x, y: yy, size: o.size || 10, font: o.font || reg, color: o.color || INK });
        }
        function newPage(first) {
          page = pdf.addPage([W, H]); pages.push(page);
          if (first) {
            page.drawRectangle({ x: 0, y: H - 112, width: W, height: 112, color: NAVY });
            page.drawRectangle({ x: 0, y: H - 114, width: W, height: 2, color: GOLD });
            var lx = M;
            if (logo) { var s = 44 / logo.height; page.drawImage(logo, { x: M, y: H - 78, width: logo.width * s, height: 44 }); lx = M + logo.width * s + 12; }
            T("Useful Startups", lx, H - 56, { size: 19, font: serif, color: rgb(0.949, 0.937, 0.914) });
            T("India's startup ledger and news", lx, H - 72, { size: 8.5, color: rgb(0.79, 0.77, 0.72) });
            var tag = "STARTUP PROFILE", tw = bold.widthOfTextAtSize(tag, 8.5);
            T(tag, W - M - tw, H - 52, { size: 8.5, font: bold, color: GOLD });
            var dw = reg.widthOfTextAtSize(date, 8.5);
            T(date, W - M - dw, H - 66, { size: 8.5, color: rgb(0.79, 0.77, 0.72) });
            y = H - 114 - 34;
          } else {
            page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: NAVY });
            T(name, M, H - 30, { size: 9, font: bold, color: MUTED });
            y = H - 56;
          }
        }
        function ensure(h) { if (y - h < FOOT + 14) newPage(false); }
        function section(title) {
          ensure(40);
          T(title.toUpperCase(), M, y, { size: 8.5, font: bold, color: GOLD_D });
          page.drawRectangle({ x: M, y: y - 6, width: CW, height: 0.7, color: RULE });
          y -= 20;
        }
        function paragraph(txt, size, o) {
          o = o || {};
          var lines = wrap(txt, o.font || reg, size, o.w || CW), lh = size * 1.5;
          lines.forEach(function (ln) { ensure(lh); T(ln, o.x || M, y, { size: size, font: o.font || reg, color: o.color || INK }); y -= lh; });
        }
        function chips(items, o) {
          o = o || {}; var size = 9, padX = 9, h = 19, gap = 6, x = M;
          items.forEach(function (it) {
            var t = san(it); if (!t) return;
            var w = reg.widthOfTextAtSize(t, size) + padX * 2;
            if (x + w > M + CW) { x = M; y -= h + gap; }
            ensure(h + 4);
            page.drawRectangle({ x: x, y: y - 5, width: w, height: h, color: o.fill || PANEL, borderColor: o.border || RULE, borderWidth: 0.6 });
            T(t, x + padX, y + 1, { size: size, color: o.text || INK });
            x += w + gap;
          });
          y -= h + 8;
        }

        newPage(true);

        /* ---- title block ---- */
        var ini = name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
        page.drawRectangle({ x: M, y: y - 36, width: 52, height: 52, color: NAVY });
        page.drawRectangle({ x: M, y: y - 36, width: 52, height: 2, color: GOLD });
        var iw = serif.widthOfTextAtSize(san(ini), 20);
        T(ini, M + 26 - iw / 2, y - 16, { size: 20, font: serif, color: GOLD });
        var nx = M + 68, nameLines = wrap(name, serif, 26, CW - 68);
        nameLines.slice(0, 2).forEach(function (ln, i) { T(ln, nx, y - 4 - i * 28, { size: 26, font: serif }); });
        var yy = y - 4 - (Math.min(nameLines.length, 2) - 1) * 28 - 20;
        var sub = [clean(row["Sector"]), clean(row["Headquarters"]), clean(row["Founded In"]) ? "Est. " + clean(row["Founded In"]) : ""].filter(Boolean).join("   |   ");
        T(sub, nx, yy, { size: 10, color: MUTED });
        y = Math.min(y - 52, yy) - 22;

        var tagline = clean(row["Tagline / Description"]);
        if (tagline) { paragraph(tagline, 13, { font: ital, color: INK }); y -= 8; }

        /* ---- at a glance ---- */
        var stats = [["FUNDING", clean(row["Funding Amount"]) || "Undisclosed"], ["STAGE", clean(row["Funding Stage"]) || "-"], ["FOUNDED", clean(row["Founded In"]) || "-"], ["TEAM SIZE", clean(row["Team Size"]) || "-"]];
        ensure(70);
        var bw = (CW - 3 * 8) / 4;
        stats.forEach(function (s, i) {
          var bx = M + i * (bw + 8);
          page.drawRectangle({ x: bx, y: y - 52, width: bw, height: 56, color: PANEL, borderColor: RULE, borderWidth: 0.6 });
          page.drawRectangle({ x: bx, y: y + 2, width: bw, height: 2, color: GOLD });
          T(s[0], bx + 10, y - 12, { size: 7.5, font: bold, color: GOLD_D });
          var v = wrap(s[1], bold, 13, bw - 20)[0];
          T(v, bx + 10, y - 33, { size: 13, font: bold });
        });
        y -= 82;

        /* ---- overview ---- */
        var overview = [["Business model", row["Business Model"]], ["Status", row["Status"]],
          ["User base", row["User Base"]], ["Primary competition", row["Primary Competition"]]].filter(function (p) { return clean(p[1]); });
        if (overview.length) {
          section("Overview");
          overview.forEach(function (p) {
            var lines = wrap(clean(p[1]), reg, 10.5, CW - 130);
            ensure(lines.length * 15 + 22);
            T(p[0], M, y, { size: 9, font: bold, color: MUTED });
            lines.forEach(function (ln, i) { T(ln, M + 130, y - i * 15, { size: 10.5 }); });
            y -= lines.length * 15 - 3;
            page.drawRectangle({ x: M, y: y, width: CW, height: 0.4, color: RULE });
            y -= 16;
          });
          y -= 8;
        }

        /* ---- competitive edge ---- */
        var edge = clean(row["Competitive Edge"]);
        if (edge) {
          section("Competitive edge");
          var el = wrap(edge, reg, 10.5, CW - 28), bh = el.length * 15 + 16;
          ensure(bh + 6);
          page.drawRectangle({ x: M, y: y - bh + 12, width: CW, height: bh, color: PANEL });
          page.drawRectangle({ x: M, y: y - bh + 12, width: 3, height: bh, color: GOLD });
          el.forEach(function (ln, i) { T(ln, M + 16, y - 4 - i * 15, { size: 10.5 }); });
          y -= bh + 12;
        }

        /* ---- people / money / tech ---- */
        var founders = list(row["Founders"]), investors = list(row["Key Investors"]), tech = list(row["Underlying Tech"]), tags = list(row["Tags"]);
        if (founders.length) { section("Founders"); chips(founders); }
        if (investors.length) { section("Key investors"); chips(investors, { border: GOLD, fill: rgb(0.995, 0.97, 0.92) }); }
        if (tech.length) { section("Underlying technology"); chips(tech, { border: TEAL, fill: rgb(0.93, 0.97, 0.965) }); }
        if (tags.length) { section("Tags"); chips(tags); }

        /* ---- recent news ---- */
        if (news && news.length) {
          section("Recent news");
          news.forEach(function (n) {
            var dt = ""; try { dt = new Date(n.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { /* ignore */ }
            var lines = wrap(n.title, bold, 10.5, CW);
            ensure(lines.length * 14 + 22);
            lines.forEach(function (ln) { T(ln, M, y, { size: 10.5, font: bold }); y -= 14; });
            T([n.source, dt].filter(Boolean).join("  |  "), M, y, { size: 8.5, color: MUTED }); y -= 18;
          });
        }

        /* ---- more startups in this sector ---- */
        if (related && related.items.length) {
          section("More startups in " + related.sector);
          related.items.forEach(function (r) {
            var nm = clean(r["Startup Name"]), meta = [clean(r["Funding Stage"]), clean(r["Headquarters"]), clean(r["Funding Amount"])].filter(Boolean).join("  |  ");
            var tl = wrap(clean(r["Tagline / Description"]) || "", reg, 9.5, CW - 14).slice(0, 2);
            var hh = 15 + (meta ? 12 : 0) + (clean(r["Tagline / Description"]) ? tl.length * 12.5 : 0) + 12;
            ensure(hh);
            page.drawRectangle({ x: M, y: y - hh + 14, width: 2.5, height: hh - 6, color: GOLD });
            T(nm, M + 12, y, { size: 11, font: bold }); y -= 14;
            if (meta) { T(meta, M + 12, y, { size: 8.5, color: GOLD_D }); y -= 12; }
            if (clean(r["Tagline / Description"])) tl.forEach(function (ln) { T(ln, M + 12, y, { size: 9.5, color: MUTED }); y -= 12.5; });
            y -= 10;
          });
          var more = related.total - related.items.length;
          ensure(46);
          page.drawRectangle({ x: M, y: y - 30, width: CW, height: 40, color: NAVY });
          page.drawRectangle({ x: M, y: y - 30, width: 3, height: 40, color: GOLD });
          T(more > 0 ? "Plus " + more + " more " + related.sector + " startups in the Ledger" : "Discover more startups in the Ledger", M + 16, y - 6, { size: 10.5, font: bold, color: rgb(0.949, 0.937, 0.914) });
          T(host + "/ledger.html", M + 16, y - 21, { size: 9, color: GOLD });
          y -= 52;
        }

        /* ---- website + profile link ---- */
        var web = clean(row["Website URL"]);
        ensure(60); y -= 4;
        if (web) { T("Website", M, y, { size: 9, font: bold, color: MUTED }); T(web.replace(/^https?:\/\//, "").replace(/\/$/, ""), M + 130, y, { size: 10.5, color: TEAL }); y -= 18; }
        T("Full profile", M, y, { size: 9, font: bold, color: MUTED });
        T(decodeURIComponent(linkFor(row)).replace(/^https?:\/\//, ""), M + 130, y, { size: 10.5, color: TEAL });

        /* ---- on every page: watermark + footer ---- */
        var n = pages.length;
        pages.forEach(function (pg, i) {
          var wm = "USEFUL STARTUPS", size = 66, th = 35 * Math.PI / 180, tw = bold.widthOfTextAtSize(wm, size);
          pg.drawText(wm, { x: W / 2 - (tw / 2) * Math.cos(th) + 11, y: H / 2 - (tw / 2) * Math.sin(th) - 14, size: size, font: bold, color: GOLD_D, opacity: 0.07, rotate: degrees(35) });

          pg.drawRectangle({ x: 0, y: 0, width: W, height: FOOT, color: NAVY });
          pg.drawRectangle({ x: 0, y: FOOT, width: W, height: 1.5, color: GOLD });
          var c1 = "Brought to you by ", c2 = "Useful Startups", fy = FOOT - 24, fx = M;
          if (logo) { var ls = 26 / logo.height; pg.drawImage(logo, { x: M, y: fy - 10, width: logo.width * ls, height: 26 }); fx = M + logo.width * ls + 9; }
          pg.drawText(c1, { x: fx, y: fy, size: 11, font: reg, color: rgb(0.79, 0.77, 0.72) });
          var x2 = fx + reg.widthOfTextAtSize(c1, 11);
          pg.drawText(c2, { x: x2, y: fy, size: 11, font: bold, color: GOLD });
          var vis = "Visit " + host, vw = bold.widthOfTextAtSize(vis, 11);
          pg.drawText(vis, { x: W - M - vw, y: fy, size: 11, font: bold, color: rgb(0.949, 0.937, 0.914) });
          pg.drawText(san("Source: the Useful Startups Ledger, " + date + ". Information only, not investment advice. Verify details before relying on them."), { x: fx, y: fy - 16, size: 7.2, font: reg, color: rgb(0.62, 0.61, 0.58) });
          var pn = "Page " + (i + 1) + " of " + n, pnw = reg.widthOfTextAtSize(pn, 7.2);
          pg.drawText(pn, { x: W - M - pnw, y: fy - 16, size: 7.2, font: reg, color: rgb(0.62, 0.61, 0.58) });
        });

        return pdf.save();
      });
    }).then(function (bytes) { return new Blob([bytes], { type: "application/pdf" }); });
  }

  /* ---------------- share sheet ---------------- */
  var ICON = {
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.41-1.35a9.86 9.86 0 0 0 4.63 1.15h.01c5.46 0 9.9-4.45 9.9-9.9C21.96 6.45 17.51 2 12.04 2zm5.8 14.18c-.24.68-1.4 1.3-1.93 1.37-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.93-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.14.14-.29.29-.13.58.17.29.75 1.24 1.62 2.01 1.12.99 2.06 1.3 2.35 1.44.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.68-.17 1.36z"/></svg>',
    li: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 5a2 2 0 1 1-4-.01 2 2 0 0 1 4 .01zM7 8.48H3V21h4V8.48zm6.32 0H9.35V21h3.97v-6.57c0-3.66 4.77-3.96 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.9L4.5 22H1.4l8.1-9.3L1 2h7l4.9 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-2.83 2.83a5 5 0 0 0 7.07 7.07L12.5 19.5"/></svg>'
  };

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { /* ignore */ }
      document.body.removeChild(ta); ok ? res() : rej();
    });
  }

  function open(row) {
    var overlay = document.getElementById("shareOverlay"), box = document.getElementById("shareModalContent");
    if (!overlay || !box) return;
    var name = clean(row["Startup Name"]), file = slug(name) + "-startup-report-useful-startups.pdf";
    var text = summaryText(row), link = linkFor(row), blobP = null;
    var canNative = !!navigator.share;

    box.innerHTML =
      '<button class="modal-close" id="shClose" aria-label="Close">&times;</button>' +
      '<h2 style="margin-bottom:6px;">Share ' + esc(name) + '</h2>' +
      '<p class="sh-sub">Get a clean, one-page report with the startup\'s funding, founders, investors and competitive edge, stamped with ' + esc(siteHost()) + '.</p>' +
      '<button class="sh-primary" id="shPdf" type="button">' + ICON.dl + ' Download PDF report</button>' +
      '<div class="sh-grid">' +
      (canNative ? '<button class="sh-opt" id="shNative" type="button">' + ICON.share + ' Share report…</button>' : '') +
      '<a class="sh-opt" id="shWa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">' + ICON.wa + ' WhatsApp</a>' +
      '<a class="sh-opt" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link) + '">' + ICON.li + ' LinkedIn</a>' +
      '<a class="sh-opt" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(name + " on Useful Startups. Brought to you by Useful Startups.") + '&url=' + encodeURIComponent(link) + '">' + ICON.x + ' X</a>' +
      '<button class="sh-opt" id="shCopy" type="button">' + ICON.copy + ' Copy link</button>' +
      '</div>' +
      '<div class="sh-status" id="shStatus" role="status" aria-live="polite"></div>';

    var st = document.getElementById("shStatus");
    var say = function (t, c) { st.textContent = t; st.className = "sh-status" + (c ? " " + c : ""); };
    var close = function () { overlay.classList.remove("open"); };
    document.getElementById("shClose").onclick = close;
    overlay.onclick = function (e) { if (e.target === overlay) close(); };

    function getBlob() { return blobP || (blobP = buildReport(row).catch(function (e) { blobP = null; throw e; })); }
    function busy(btn, on) { btn.disabled = on; }

    var pdfBtn = document.getElementById("shPdf");
    pdfBtn.onclick = function () {
      busy(pdfBtn, true); say("Building your report…");
      getBlob().then(function (b) {
        var u = URL.createObjectURL(b), a = document.createElement("a");
        a.href = u; a.download = file; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        say("Report downloaded.", "ok");
      }).catch(function (e) { console.error(e); say("Couldn't build the report" + (e && e.message ? " (" + String(e.message).slice(0, 90) + ")" : "") + ". Please try again.", "err"); })
        .then(function () { busy(pdfBtn, false); });
    };

    var nat = document.getElementById("shNative");
    if (nat) nat.onclick = function () {
      busy(nat, true); say("Preparing…");
      getBlob().then(function (b) {
        var f = new File([b], file, { type: "application/pdf" });
        var data = navigator.canShare && navigator.canShare({ files: [f] }) ? { files: [f], title: name + " | Useful Startups", text: text } : { title: name + " | Useful Startups", text: text, url: link };
        return navigator.share(data).then(function () { say(""); });
      }).catch(function (e) { if (e && e.name === "AbortError") say(""); else { console.error(e); say("Sharing isn't available here. Try Download or Copy link.", "err"); } })
        .then(function () { busy(nat, false); });
    };

    document.getElementById("shCopy").onclick = function () {
      copyText(text).then(function () { say("Link and summary copied.", "ok"); }, function () { say("Couldn't copy. Please copy the link manually: " + link, "err"); });
    };

    overlay.classList.add("open");
    getBlob().catch(function () { /* warm up in the background; errors surface when the user clicks */ });
  }

  window.ULShare = { open: open, build: buildReport };
})();
