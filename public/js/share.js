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
  function san(s) {
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

  function fetchLogo() {
    return fetch("img/logo-mark.png").then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).catch(function () { return null; });
  }

  function buildReport(row) {
    var name = clean(row["Startup Name"]);
    return Promise.all([
      window.PDFLib ? Promise.resolve() : loadScript("js/vendor/pdf-lib.min.js"),
      fetchNews(name), fetchLogo()
    ]).then(function (r) { return render(row, r[1], r[2]); });
  }

  function render(row, news, logoBytes) {
    var L = window.PDFLib, rgb = L.rgb, degrees = L.degrees;
    var NAVY = rgb(0.043, 0.071, 0.125), GOLD = rgb(0.851, 0.643, 0.255), GOLD_D = rgb(0.54, 0.42, 0.19);
    var INK = rgb(0.10, 0.12, 0.17), MUTED = rgb(0.40, 0.43, 0.49), RULE = rgb(0.86, 0.85, 0.82), PANEL = rgb(0.965, 0.955, 0.93), TEAL = rgb(0.227, 0.561, 0.541);
    var W = 595.28, H = 841.89, M = 44, CW = W - 2 * M, FOOT = 64;
    var host = siteHost(), base = siteBase();
    var date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    var name = clean(row["Startup Name"]);

    return L.PDFDocument.create().then(function (pdf) {
      pdf.setTitle(name + ": Startup report | Useful Startups");
      pdf.setAuthor("Useful Startups"); pdf.setSubject("Startup profile from the Useful Startups Ledger"); pdf.setCreator(host);
      return Promise.all([
        pdf.embedFont(L.StandardFonts.Helvetica), pdf.embedFont(L.StandardFonts.HelveticaBold),
        pdf.embedFont(L.StandardFonts.HelveticaOblique), pdf.embedFont(L.StandardFonts.TimesRomanBold),
        logoBytes ? pdf.embedPng(logoBytes).catch(function () { return null; }) : Promise.resolve(null)
      ]).then(function (f) {
        var reg = f[0], bold = f[1], ital = f[2], serif = f[3], logo = f[4];
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
          var c1 = "Brought to you by ", c2 = "Useful Startups", fy = FOOT - 24;
          pg.drawText(c1, { x: M, y: fy, size: 11, font: reg, color: rgb(0.79, 0.77, 0.72) });
          var x2 = M + reg.widthOfTextAtSize(c1, 11);
          pg.drawText(c2, { x: x2, y: fy, size: 11, font: bold, color: GOLD });
          var vis = "Visit " + host, vw = bold.widthOfTextAtSize(vis, 11);
          pg.drawText(vis, { x: W - M - vw, y: fy, size: 11, font: bold, color: rgb(0.949, 0.937, 0.914) });
          pg.drawText(san("Source: the Useful Startups Ledger, " + date + ". Information only, not investment advice. Verify details before relying on them."), { x: M, y: fy - 16, size: 7.2, font: reg, color: rgb(0.62, 0.61, 0.58) });
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
      }).catch(function (e) { console.error(e); say("Couldn't build the report. Please try again.", "err"); })
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
