/* Site-wide search: startups, founders, news, team and pages in one box.
   ULSearch.mount(el)           put a search box inside el (live suggestions; Enter opens search.html?q=...)
   ULSearch.results(el, query)  fill el with full grouped results (used by search.html)
   Anything with  data-ugs  is mounted automatically. Needs config.js + data.js. */
(function () {
  "use strict";
  var TABS = ["ledger", "founders", "team", "pages", "nav"];
  var FALLBACK_PAGES = [["Home", "index.html"], ["Ledger", "ledger.html"], ["News", "news.html"], ["About", "about.html"], ["Team", "team.html"], ["Contact", "contact.html"], ["Support us", "support.html"], ["Terms", "terms.html"], ["Privacy", "privacy.html"]];

  if (!document.querySelector('link[href$="gsearch.css"]')) {
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "css/gsearch.css"; document.head.appendChild(l);
  }

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var clean = function (v) { v = String(v == null ? "" : v).trim(); return v === "-" ? "" : v; };
  var visible = function (r) { return !/^(no|false|0|hide|hidden)$/i.test(String(r.Visible || "").trim()); };
  var pc = function (v) { return String(v || "").trim().toLowerCase().replace(/(^|[\s\-'’.(\/])([a-z\u00c0-\u024f])/g, function (m, a, b) { return a + b.toUpperCase(); }); };
  var safeUrl = function (u) { return /^\s*(javascript|data|vbscript):/i.test(u) ? "#" : u; };
  var plain = function (t) { return String(t || "").replace(/\*\*|\[([^\]]+)\]\([^)]*\)|^##\s*|^[-•]\s+/gm, "$1").replace(/\s+/g, " ").trim(); };
  var tokens = function (q) { return String(q).toLowerCase().trim().split(/\s+/).filter(Boolean); };

  /* ---------- index (built from the same Supabase tabs the pages use) ---------- */
  var IDX = null, idxP = null;

  function build(d) {
    var ledger = (d.ledger || []).filter(function (r) { return clean(r["Startup Name"]) && visible(r); });
    var startups = ledger.map(function (r) {
      var name = clean(r["Startup Name"]);
      var hay = [ULData.hay(r), r["Sector"], r["Headquarters"], r["Funding Stage"], r["Business Model"], r["Primary Competition"]].join(" ").toLowerCase();
      return { type: "startup", title: name, sub: [clean(r["Sector"]), pc(clean(r["Headquarters"]))].filter(Boolean).join(" · "), snip: clean(r["Tagline / Description"]), url: "ledger.html#s=" + encodeURIComponent(name), hay: hay };
    });

    var fmap = {};
    function addF(n, biz) {
      n = pc(n); if (!n) return; var k = n.toLowerCase();
      var f = fmap[k] || (fmap[k] = { name: n, biz: [] });
      if (biz && f.biz.indexOf(biz) < 0) f.biz.push(biz);
    }
    ledger.forEach(function (r) { clean(r["Founders"]).split(",").forEach(function (n) { addF(n, clean(r["Startup Name"])); }); });
    (d.founders || []).forEach(function (r) {
      var n = clean(r["Founder Name"]); if (!n) return; addF(n, "");
      clean(r["Startups / Businesses"]).split(",").forEach(function (b) { b = b.trim(); if (b) addF(n, b); });
    });
    var founders = Object.keys(fmap).map(function (k) {
      var f = fmap[k];
      return { type: "founder", title: f.name, sub: f.biz.length ? "Founder · " + f.biz.slice(0, 3).join(", ") : "Founder", snip: "", url: "ledger.html#q=" + encodeURIComponent(f.name), hay: (f.name + " " + f.biz.join(" ")).toLowerCase() };
    });

    var pages = [];
    var nav = (d.nav && d.nav.length ? d.nav.filter(visible).map(function (r) { return [clean(r.Label), clean(r.URL)]; }) : FALLBACK_PAGES);
    nav.forEach(function (n) { if (n[0] && n[1] && !/^https?:\/\//i.test(n[1])) pages.push({ type: "page", title: n[0], sub: "Page", snip: "", url: n[1], hay: n[0].toLowerCase() }); });
    (d.pages || []).forEach(function (r) {
      var pg = clean(r.Page).toLowerCase();
      if (["about", "terms", "privacy"].indexOf(pg) < 0 || !visible(r)) return;
      var body = plain(r.Body);
      pages.push({ type: "page", title: clean(r.Heading) || pc(pg), sub: pc(pg) + " page", snip: body.slice(0, 140), url: pg + ".html", hay: (clean(r.Heading) + " " + body).toLowerCase() });
    });
    (d.team || []).filter(visible).forEach(function (r) {
      var n = clean(r.Name); if (!n) return;
      pages.push({ type: "page", title: pc(n), sub: [clean(r.Role), "Team"].filter(Boolean).join(" · "), snip: plain(r.Bio).slice(0, 140), url: "team.html", hay: (n + " " + r.Role + " " + r.Bio).toLowerCase() });
    });
    return { startups: startups, founders: founders, pages: pages };
  }

  function getIndex() {
    if (!IDX) { var c = ULData.cached(TABS); if (c.ledger || c.pages || c.nav) IDX = build(c); }
    if (!idxP) idxP = ULData.load(TABS).then(function (d) { IDX = build(d); return IDX; });
    return idxP;
  }

  function rank(list, toks, q, max) {
    var out = [];
    list.forEach(function (x) {
      for (var i = 0; i < toks.length; i++) if (x.hay.indexOf(toks[i]) < 0) return;
      var t = x.title.toLowerCase();
      out.push({ x: x, s: t.indexOf(q) === 0 ? 0 : t.indexOf(q) >= 0 ? 1 : 2 });
    });
    out.sort(function (a, b) { return a.s - b.s || a.x.title.localeCompare(b.x.title); });
    return { total: out.length, items: out.slice(0, max).map(function (o) { return o.x; }) };
  }

  function localSearch(q, lim) {
    var toks = tokens(q), ql = q.toLowerCase().trim();
    if (!IDX || !toks.length) return { startups: { total: 0, items: [] }, founders: { total: 0, items: [] }, pages: { total: 0, items: [] } };
    return { startups: rank(IDX.startups, toks, ql, lim.startups), founders: rank(IDX.founders, toks, ql, lim.founders), pages: rank(IDX.pages, toks, ql, lim.pages) };
  }

  var newsSeq = 0;
  function newsSearch(q, limit) {
    if (typeof SUPABASE_URL === "undefined") return Promise.resolve([]);
    var safe = q.replace(/[*,()%\\"':;]/g, " ").replace(/\s+/g, " ").trim();
    if (safe.length < 2) return Promise.resolve([]);
    var url = SUPABASE_URL + "/rest/v1/articles?select=title,link,source,published_at,summary&or=(title.ilike.*" + encodeURIComponent(safe) + "*,summary.ilike.*" + encodeURIComponent(safe) + "*)&order=published_at.desc&limit=" + limit;
    return fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (a) {
        return (Array.isArray(a) ? a : []).map(function (n) {
          var dt = ""; try { dt = new Date(n.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { /* ignore */ }
          return { type: "news", title: n.title, sub: [n.source, dt].filter(Boolean).join(" · "), snip: plain(n.summary).slice(0, 140), url: n.link, ext: true };
        });
      }).catch(function () { return []; });
  }

  var LABELS = { startups: "Startups", founders: "Founders", pages: "Pages and team", news: "News" };

  /* ---------- dropdown search box ---------- */
  function mount(el, opts) {
    if (!el || el.__ugs) return; el.__ugs = true; opts = opts || {};
    el.classList.add("ugs-slot");
    el.innerHTML = '<form class="ugs" role="search" autocomplete="off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="text" aria-label="Search the whole website" aria-autocomplete="list" enterkeyhint="search" placeholder="' + esc(opts.placeholder || "Search startups, founders, news, pages…") + '"><button type="submit">Search</button>' +
      '<div class="ugs-dd" role="listbox" hidden></div></form>';
    var form = el.firstChild, inp = form.querySelector("input"), dd = form.querySelector(".ugs-dd");
    if (opts.value) inp.value = opts.value;
    var act = -1, news = [], timer = null, cur = "";
    getIndex().then(function () { if (document.activeElement === inp) show(); });

    function opts_() { return [].slice.call(dd.querySelectorAll("[data-o]")); }
    function paint() { opts_().forEach(function (e, i) { e.classList.toggle("on", i === act); e.setAttribute("aria-selected", i === act); if (i === act) e.scrollIntoView({ block: "nearest" }); }); }
    function close() { dd.hidden = true; act = -1; }
    function render() {
      var q = inp.value.trim(); if (!q) { close(); return; }
      var r = localSearch(q, { startups: 4, founders: 2, pages: 3 }), h = "", n = 0, tot = 0;
      ["startups", "founders", "pages"].forEach(function (g) {
        tot += r[g].total;
        if (!r[g].items.length) return;
        h += '<div class="ugs-h">' + LABELS[g] + "</div>";
        r[g].items.forEach(function (x) { h += '<a class="ugs-o" data-o role="option" href="' + esc(safeUrl(x.url)) + '"><b>' + esc(x.title) + "</b><span>" + esc(x.sub) + "</span></a>"; n++; });
      });
      if (news.length) {
        tot += news.length; h += '<div class="ugs-h">' + LABELS.news + "</div>";
        news.slice(0, 3).forEach(function (x) { h += '<a class="ugs-o" data-o role="option" href="' + esc(safeUrl(x.url)) + '" target="_blank" rel="noopener"><b>' + esc(x.title) + "</b><span>" + esc(x.sub) + "</span></a>"; n++; });
      }
      h = (n ? h : '<div class="ugs-n">No quick matches yet.</div>') + '<a class="ugs-f" data-o data-all href="search.html?q=' + encodeURIComponent(q) + '">See all results for “' + esc(q) + '” →</a>';
      dd.innerHTML = h; dd.hidden = false; act = -1;
    }
    function show() {
      render();
      var q = inp.value.trim(), my = ++newsSeq; clearTimeout(timer);
      if (q.length < 2) { news = []; return; }
      timer = setTimeout(function () {
        newsSearch(q, 3).then(function (a) { if (my !== newsSeq || inp.value.trim() !== q) return; news = a; if (!dd.hidden) { var keep = act; render(); act = keep; } });
      }, 220);
    }
    inp.addEventListener("input", function () { news = []; show(); });
    inp.addEventListener("focus", function () { if (inp.value.trim()) show(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); return; }
      var o = opts_(); if (dd.hidden || !o.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); act = (act + (e.key === "ArrowDown" ? 1 : -1) + o.length) % o.length; paint(); }
      else if (e.key === "Enter" && act >= 0) { e.preventDefault(); var a = o[act]; if (a.target === "_blank") window.open(a.href, "_blank", "noopener"); else location.href = a.href; }
    });
    dd.addEventListener("mousemove", function (e) { var a = e.target.closest("[data-o]"); if (a) { act = opts_().indexOf(a); paint(); } });
    form.addEventListener("submit", function (e) { e.preventDefault(); var q = inp.value.trim(); location.href = q ? "search.html?q=" + encodeURIComponent(q) : "search.html"; });
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) close(); });
  }

  /* ---------- full results page ---------- */
  function card(x) {
    return '<a class="ugs-c" href="' + esc(safeUrl(x.url)) + '"' + (x.ext ? ' target="_blank" rel="noopener"' : "") + "><b>" + esc(x.title) + "</b>" +
      (x.sub ? "<i>" + esc(x.sub) + "</i>" : "") + (x.snip ? "<p>" + esc(x.snip) + "</p>" : "") + "</a>";
  }
  function results(el, q) {
    q = String(q || "").trim();
    el.classList.add("ugs-res");
    el.innerHTML = '<div id="ugsBox"></div><div id="ugsOut" aria-live="polite"></div>';
    mount(el.querySelector("#ugsBox"), { value: q });
    var out = el.querySelector("#ugsOut");
    if (!q) { out.innerHTML = '<div class="ugs-none">Type something above to search startups, founders, news and pages.</div>'; return; }
    out.innerHTML = '<div class="ugs-none">Searching…</div>';
    function paint(news) {
      var r = localSearch(q, { startups: 24, founders: 12, pages: 12 }), h = "", any = false;
      [["startups", r.startups.total, r.startups.items], ["founders", r.founders.total, r.founders.items], ["news", news ? news.length : 0, news || []], ["pages", r.pages.total, r.pages.items]].forEach(function (g) {
        if (!g[2].length) return; any = true;
        h += '<section class="ugs-g"><h2>' + LABELS[g[0]] + " <small>" + g[1] + (g[1] > g[2].length ? ", showing " + g[2].length : "") + '</small></h2><div class="ugs-list">' + g[2].map(card).join("") + "</div></section>";
      });
      out.innerHTML = any ? h : '<div class="ugs-none">Nothing found for “' + esc(q) + '”. Try a shorter word, or <a href="ledger.html">browse the whole Ledger</a>.</div>';
    }
    var haveNews = false, newsRes = null;
    getIndex().then(function () { if (haveNews) paint(newsRes); else paint(null); });
    newsSearch(q, 20).then(function (a) { haveNews = true; newsRes = a; if (IDX) paint(a); });
  }

  window.ULSearch = { mount: mount, results: results };
  function auto() { [].forEach.call(document.querySelectorAll("[data-ugs]"), function (el) { mount(el); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
