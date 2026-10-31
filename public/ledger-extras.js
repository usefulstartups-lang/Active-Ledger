/* Ledger add-ons: (1) India startup heat map, (2) "Recent news" inside each startup's detail popup.
   Loaded on ledger.html AFTER config.js. Reads the ledger's own data (ALL), so no extra setup. */
(function(){
'use strict';

/* ---------- 1. HEAT MAP ---------- */
// [column, row, short code] — a tile-grid map of India (each state = one tile).
const TILES={
"Ladakh":[3,0,"LA"],"Jammu & Kashmir":[2,1,"JK"],"Himachal Pradesh":[3,1,"HP"],
"Punjab":[2,2,"PB"],"Chandigarh":[3,2,"CH"],"Uttarakhand":[4,2,"UK"],"Sikkim":[6,2,"SK"],"Arunachal Pradesh":[8,2,"AR"],
"Rajasthan":[1,3,"RJ"],"Haryana":[2,3,"HR"],"Delhi":[3,3,"DL"],"Uttar Pradesh":[4,3,"UP"],"Bihar":[5,3,"BR"],"West Bengal":[6,3,"WB"],"Assam":[7,3,"AS"],"Nagaland":[8,3,"NL"],
"Gujarat":[1,4,"GJ"],"Madhya Pradesh":[2,4,"MP"],"Chhattisgarh":[3,4,"CG"],"Jharkhand":[4,4,"JH"],"Meghalaya":[7,4,"ML"],"Manipur":[8,4,"MN"],
"Dadra & Nagar Haveli and Daman & Diu":[1,5,"DD"],"Maharashtra":[2,5,"MH"],"Telangana":[3,5,"TG"],"Odisha":[4,5,"OD"],"Tripura":[7,5,"TR"],"Mizoram":[8,5,"MZ"],
"Goa":[1,6,"GA"],"Karnataka":[2,6,"KA"],"Andhra Pradesh":[3,6,"AP"],
"Lakshadweep":[1,7,"LD"],"Kerala":[2,7,"KL"],"Tamil Nadu":[3,7,"TN"],"Puducherry":[4,7,"PY"],"Andaman & Nicobar":[7,7,"AN"]
};
// Cities (what your Headquarters column holds) -> state.
const CITIES={
"Karnataka":"bengaluru,bangalore,mysuru,mysore,hubli,hubballi,mangaluru,mangalore,belagavi,belgaum,dharwad,udupi",
"Maharashtra":"mumbai,pune,nagpur,nashik,thane,navi mumbai,aurangabad,chhatrapati sambhajinagar,kolhapur,solapur,bombay",
"Delhi":"delhi,new delhi,delhi ncr,ncr,nct of delhi",
"Haryana":"gurugram,gurgaon,faridabad,panipat,sonipat,ambala,hisar,rohtak,karnal,panchkula,manesar",
"Uttar Pradesh":"noida,greater noida,ghaziabad,lucknow,kanpur,agra,varanasi,meerut,allahabad,prayagraj,bareilly,gorakhpur,aligarh,mathura",
"Telangana":"hyderabad,secunderabad,warangal,telengana",
"Tamil Nadu":"chennai,coimbatore,madurai,tiruchirappalli,trichy,salem,tirupur,vellore,erode,hosur,tamilnadu,madras",
"Gujarat":"ahmedabad,surat,vadodara,baroda,rajkot,gandhinagar,bhavnagar,jamnagar,gift city,anand,morbi",
"West Bengal":"kolkata,calcutta,howrah,siliguri,durgapur",
"Rajasthan":"jaipur,jodhpur,udaipur,kota,ajmer,bikaner",
"Kerala":"kochi,cochin,thiruvananthapuram,trivandrum,kozhikode,calicut,thrissur,kannur,kollam",
"Madhya Pradesh":"indore,bhopal,gwalior,jabalpur,ujjain",
"Punjab":"ludhiana,amritsar,jalandhar,mohali,patiala,sas nagar",
"Chandigarh":"chandigarh",
"Andhra Pradesh":"visakhapatnam,vizag,vijayawada,amaravati,guntur,tirupati,nellore,kakinada",
"Odisha":"bhubaneswar,cuttack,rourkela,orissa",
"Bihar":"patna,gaya,muzaffarpur,bhagalpur",
"Jharkhand":"ranchi,jamshedpur,dhanbad,bokaro",
"Chhattisgarh":"raipur,bhilai,bilaspur,chattisgarh",
"Uttarakhand":"dehradun,haridwar,roorkee,haldwani,uttaranchal",
"Himachal Pradesh":"shimla,manali,dharamshala,solan,himachal",
"Assam":"guwahati,dibrugarh,jorhat,silchar",
"Goa":"panaji,panjim,margao,vasco",
"Jammu & Kashmir":"srinagar,jammu,jammu and kashmir",
"Ladakh":"leh,kargil",
"Puducherry":"puducherry,pondicherry",
"Meghalaya":"shillong","Tripura":"agartala","Manipur":"imphal","Nagaland":"kohima,dimapur","Mizoram":"aizawl","Sikkim":"gangtok","Arunachal Pradesh":"itanagar",
"Dadra & Nagar Haveli and Daman & Diu":"daman,diu,silvassa,dadra,dadra and nagar haveli,daman and diu",
"Andaman & Nicobar":"port blair,andaman,andaman and nicobar",
"Lakshadweep":"kavaratti"
};
const MAP={};
Object.keys(CITIES).forEach(st=>CITIES[st].split(",").forEach(c=>MAP[c.trim()]=st));
Object.keys(TILES).forEach(st=>{MAP[norm(st)]=st;MAP[norm(st.replace(/&/g,"and"))]=st});
const KEYS=Object.keys(MAP).filter(k=>k.length>3).sort((a,b)=>b.length-a.length).map(k=>[new RegExp("\\b"+k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b"),MAP[k]]);
function norm(s){return String(s||"").toLowerCase().replace(/\(.*?\)/g," ").replace(/&/g," and ").replace(/[^a-z\s,/-]/g," ").replace(/\s+/g," ").trim()}
function stateOf(hq){
  const n=norm(hq);if(!n)return null;
  if(MAP[n])return MAP[n];
  const parts=n.split(/[,/-]/).map(x=>x.trim()).filter(Boolean);
  for(const p of parts){if(MAP[p])return MAP[p]}
  for(const [re,st] of KEYS){if(re.test(n))return st}
  return null;
}
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cl=v=>{v=(v||"").trim();return v==="-"?"":v};

const css=`
.hm{max-width:1180px;margin:0 auto;padding:44px 24px 10px;border-bottom:1px solid var(--rule)}
.hm-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.hm-head h2{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,3.4vw,34px);margin:0 0 6px}
.hm-head p{margin:0;color:var(--paper-dim);font-size:14px;max-width:520px;line-height:1.55}
.hm-toggle{background:transparent;border:1px solid var(--rule);color:var(--paper-dim);font:11px 'IBM Plex Mono',monospace;padding:8px 12px;border-radius:3px;cursor:pointer}
.hm-toggle:hover{border-color:var(--gold);color:var(--gold)}
.hm-body{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:40px;align-items:start}
.hm.closed .hm-body,.hm.closed .hm-foot{display:none}
.hm-map{display:grid;grid-template-columns:repeat(9,1fr);gap:5px;max-width:560px;width:100%}
.hm-map.geo{display:block;max-width:520px}
.hm-svg{width:100%;height:auto;display:block}
.hm-st .u{fill:#0B1220;stroke:#0B1220;stroke-width:2.2;stroke-linejoin:round}
.hm-st .o{stroke-width:1;stroke-linejoin:round;transition:filter .15s}
.hm-st.has{cursor:pointer}
.hm-st.has:hover .u{stroke:#F2EFE9}
.hm-st.has:hover .o{filter:brightness(1.18)}
.hm-pin{pointer-events:none}
.hm-pin circle{fill:#0B1220;stroke:#D9A441;stroke-width:1}
.hm-pin text{fill:#F2EFE9;font:600 8.5px 'IBM Plex Mono',monospace;text-anchor:middle;dominant-baseline:central}
.hm-tile{aspect-ratio:1/1;border:1px solid var(--rule);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:default;transition:transform .15s,border-color .15s;position:relative;user-select:none}
.hm-tile b{font:600 clamp(11px,1.6vw,15px) 'IBM Plex Mono',monospace;line-height:1}
.hm-tile span{font:9px 'IBM Plex Mono',monospace;letter-spacing:.04em;opacity:.75}
.hm-tile.has{cursor:pointer}
.hm-tile.has:hover{transform:scale(1.12);border-color:var(--paper);z-index:2}
.hm-tile.zero{color:var(--paper-dim);opacity:.55}
.hm-side h3{font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
.hm-side ol{list-style:none;margin:0 0 28px;padding:0}
.hm-side li{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;padding:5px 0;font-size:13.5px;cursor:pointer}
.hm-side li:hover .hm-nm{color:var(--gold)}
.hm-bar{grid-column:1/-1;height:3px;background:var(--rule);border-radius:2px;overflow:hidden}
.hm-bar i{display:block;height:100%;background:var(--gold)}
.hm-num{font:12px 'IBM Plex Mono',monospace;color:var(--gold)}
.hm-foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center;padding:18px 0 4px;font:11px 'IBM Plex Mono',monospace;color:var(--paper-dim)}
.hm-legend{display:flex;align-items:center;gap:8px}
.hm-legend i{display:block;width:90px;height:8px;border-radius:2px;background:linear-gradient(90deg,rgba(217,164,65,.14),rgba(217,164,65,.95))}
.hm-tip{position:fixed;z-index:300;pointer-events:none;background:var(--ink-2);border:1px solid var(--gold-dim);padding:10px 12px;font-size:12.5px;line-height:1.5;border-radius:3px;max-width:240px;box-shadow:0 8px 24px rgba(0,0,0,.5);display:none}
.hm-tip b{color:var(--gold);font-family:'Fraunces',serif;font-weight:500;font-size:15px;display:block}
.hm-tip small{color:var(--paper-dim);display:block}
@media(max-width:800px){.hm-body{grid-template-columns:1fr}}
.us-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-4px 0 16px;padding-right:28px}
.us-bar.in-modal{margin:0 0 22px;padding:0}
.us-chip{font:600 11px 'IBM Plex Mono',monospace;border-radius:999px;padding:6px 12px;cursor:pointer;transition:transform .15s,background-color .15s,color .15s}
.us-chip:active{transform:scale(.97)}
.us-chip.avail{background:rgba(217,164,65,.16);color:var(--gold);border:1px solid var(--gold)}
.us-chip.avail::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#6fbf73;margin-right:8px;box-shadow:0 0 0 3px rgba(111,191,115,.2)}
.us-chip.avail:hover{background:var(--gold);color:var(--ink)}
.us-chip.req{background:transparent;color:var(--paper-dim);border:1px dashed var(--paper-dim)}
.us-chip.req:hover{color:var(--paper);border-color:var(--paper)}
.us-sub{font:11px 'IBM Plex Mono',monospace;color:var(--paper-dim)}
.us-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.us-alt{font:12px 'IBM Plex Mono',monospace;color:var(--paper);border:1px solid var(--rule);padding:11px 14px;border-radius:3px;text-decoration:none}
.us-alt:hover{border-color:var(--gold);color:var(--gold)}
.us-note{font-size:12px;line-height:1.55;color:var(--paper-dim);margin:22px 0 0}
.ledger-news{margin:26px 0 24px;border-top:1px dashed var(--rule);padding-top:20px}
.ledger-news a.ln-item{display:block;padding:11px 0;border-bottom:1px solid var(--rule);color:var(--paper);text-decoration:none;font-size:14px;line-height:1.4}
.ledger-news a.ln-item:hover{color:var(--gold)}
.ledger-news small{display:block;font:11px 'IBM Plex Mono',monospace;color:var(--paper-dim);margin-top:4px}
.ledger-news .ln-empty{font-size:13px;color:var(--paper-dim)}
`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

const sec=document.createElement("section");sec.className="hm";sec.id="heatmap";
sec.innerHTML=`<div class="hm-head"><div><div class="eyebrow">Startup Heat Map</div><h2>Where India's startups are based</h2>
<p>Every startup in the Ledger, placed by its headquarters city. Tap a state to see its startups.</p></div>
<button class="hm-toggle" id="hmToggle" type="button">Hide map</button></div>
<div class="hm-body"><div class="hm-map" id="hmMap"></div><aside class="hm-side"><h3>Top states</h3><ol id="hmTop"></ol><h3>Top cities</h3><ol id="hmCities"></ol></aside></div>
<div class="hm-foot"><div class="hm-legend">Fewer <i></i> More</div><div id="hmNote"></div></div>`;
const anchor=document.querySelector(".controls")||document.querySelector("main");
anchor.parentNode.insertBefore(sec,anchor);
const tip=document.createElement("div");tip.className="hm-tip";document.body.appendChild(tip);
document.getElementById("hmToggle").onclick=function(){const c=sec.classList.toggle("closed");this.textContent=c?"Show map":"Hide map"};

function open(title,rows){if(typeof showListModal==="function"&&rows.length)showListModal(title,rows)}

// ---- Real India map: state boundaries come from an open dataset (district polygons grouped by state) ----
const GEO_URL="https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@2884453/geojson/india.geojson";
const CK="hm_geo_v1";
let geo=null,geoState="idle";
const mixc=t=>{const a=[26,35,56],b=[217,164,65];return"rgb("+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(",")+")"};
function buildGeo(gj){
  const X=lon=>(lon-68)*18.7,Y=lat=>(37.6-lat)*20,out={};
  gj.features.forEach(f=>{
    const pr=f.properties||{};
    const st=stateOf(pr.st_nm||pr.ST_NM||pr.NAME_1||pr.name||"");
    if(!st||!f.geometry)return;
    const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
    const o=out[st]||(out[st]={d:"",A:0,sx:0,sy:0,x0:1e9,x1:-1e9});
    polys.forEach(poly=>poly.forEach((ring,ri)=>{
      const pts=[];let lx=-99,ly=-99;
      ring.forEach(p=>{const x=X(p[0]),y=Y(p[1]);if(Math.abs(x-lx)+Math.abs(y-ly)<0.8)return;lx=x;ly=y;pts.push([x,y])});
      if(pts.length<3)return;
      o.d+="M"+pts.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join("L")+"Z";
      if(ri)return; // exterior rings only, for the label position
      let a=0,cx=0,cy=0;
      for(let i=0;i<pts.length;i++){const[p,q]=[pts[i],pts[(i+1)%pts.length]],c=p[0]*q[1]-q[0]*p[1];a+=c;cx+=(p[0]+q[0])*c;cy+=(p[1]+q[1])*c;if(p[0]<o.x0)o.x0=p[0];if(p[0]>o.x1)o.x1=p[0]}
      a/=2;if(Math.abs(a)<0.01)return;
      o.A+=Math.abs(a);o.sx+=Math.abs(a)*cx/(6*a);o.sy+=Math.abs(a)*cy/(6*a);
    }));
  });
  Object.values(out).forEach(o=>{o.cx=+(o.sx/o.A).toFixed(1);o.cy=+(o.sy/o.A).toFixed(1);delete o.sx;delete o.sy;delete o.A});
  return out;
}
function loadGeo(){
  if(geoState!=="idle")return;
  geoState="loading";
  try{const c=JSON.parse(localStorage.getItem(CK));if(c&&c.v===1&&c.s){geo=c.s;geoState="ready";return}}catch(e){}
  fetch(GEO_URL).then(r=>{if(!r.ok)throw 0;return r.json()}).then(gj=>{
    geo=buildGeo(gj);if(Object.keys(geo).length<20)throw 0;geoState="ready";
    try{localStorage.setItem(CK,JSON.stringify({v:1,s:geo}))}catch(e){}
  }).catch(()=>{geoState="failed"}).then(()=>{lastAll=null;draw()});
}
function showTip(e,name,by){
  const n=by[name].rows.length,top=Object.entries(by[name].sectors).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>x[0]).join(", ");
  tip.innerHTML=`<b>${esc(name)}</b>${n} startup${n===1?"":"s"}${top?`<small>${esc(top)}</small>`:""}`;tip.style.display="block";
  tip.style.left=Math.min(e.clientX+14,window.innerWidth-250)+"px";tip.style.top=(e.clientY+14)+"px";
}
function drawGeo(by,max){
  const map=document.getElementById("hmMap");map.className="hm-map geo";
  let g="",p="";
  Object.entries(geo).forEach(([name,o])=>{
    const n=(by[name]||{rows:[]}).rows.length,c=n?mixc(0.2+0.8*Math.sqrt(n/max)):"#1a2338";
    g+=`<g class="hm-st${n?" has":""}" data-s="${esc(name)}"><path class="u" d="${o.d}"/><path class="o" d="${o.d}" style="fill:${c};stroke:${c}"/></g>`;
    if(n)p+=`<g class="hm-pin"><circle cx="${o.cx}" cy="${o.cy}" r="${n>99?10:8.5}"/><text x="${o.cx}" y="${o.cy}">${n}</text></g>`;
  });
  map.innerHTML=`<svg class="hm-svg" viewBox="0 0 560 640" role="img" aria-label="Map of India showing startups per state">${g}${p}</svg>`;
  const svg=map.firstChild,st=e=>e.target.closest&&e.target.closest(".hm-st");
  svg.addEventListener("mousemove",e=>{const s=st(e);if(s&&by[s.dataset.s])showTip(e,s.dataset.s,by);else tip.style.display="none"});
  svg.addEventListener("mouseleave",()=>tip.style.display="none");
  svg.addEventListener("click",e=>{const s=st(e);if(s&&by[s.dataset.s]){tip.style.display="none";open("State — "+s.dataset.s,by[s.dataset.s].rows)}});
}
function drawTiles(by,max){
  const map=document.getElementById("hmMap");map.className="hm-map";map.innerHTML="";
  Object.entries(TILES).forEach(([name,[c,r,code]])=>{
    const n=by[name].rows.length,a=n?0.16+0.8*Math.sqrt(n/max):0;
    const t=document.createElement("div");
    t.className="hm-tile "+(n?"has":"zero");
    t.style.gridColumn=c+1;t.style.gridRow=r+1;
    if(n){t.style.background=`rgba(217,164,65,${a.toFixed(2)})`;t.style.color=a>0.5?"#0B1220":"#F2EFE9"}
    t.innerHTML=`<b>${n||""}</b><span>${code}</span>`;
    t.addEventListener("mousemove",e=>showTip(e,name,by));t.addEventListener("mouseleave",()=>tip.style.display="none");
    t.addEventListener("click",()=>{tip.style.display="none";open("State — "+name,by[name].rows)});
    map.appendChild(t);
  });
}

let lastAll=null,lastLen=-1,lastMode="";
function draw(){
  if(typeof ALL==="undefined"||!ALL)return;
  loadGeo();
  const mode=geoState==="ready"?"geo":geoState==="failed"?"tile":"wait";
  if(ALL===lastAll&&ALL.length===lastLen&&mode===lastMode)return;
  lastAll=ALL;lastLen=ALL.length;lastMode=mode;
  const by={},cities={},unplaced={};
  Object.keys(TILES).forEach(k=>by[k]={rows:[],sectors:{}});
  ALL.forEach(r=>{
    const hq=cl(r["Headquarters"]);const s=stateOf(hq);
    if(!s){if(hq)unplaced[hq]=(unplaced[hq]||0)+1;return}
    by[s].rows.push(r);
    const sc=cl(r["Sector"]);if(sc)by[s].sectors[sc]=(by[s].sectors[sc]||0)+1;
    cities[hq]=cities[hq]||{n:0,rows:[]};cities[hq].n++;cities[hq].rows.push(r);
  });
  const max=Math.max(1,...Object.values(by).map(v=>v.rows.length));
  if(mode==="geo")drawGeo(by,max);
  else if(mode==="tile")drawTiles(by,max);
  else document.getElementById("hmMap").innerHTML='<div style="color:var(--paper-dim);font:12px \'IBM Plex Mono\',monospace;padding:40px 0">Loading map…</div>';
  const list=(id,items,total)=>{document.getElementById(id).innerHTML=items.map(([nm,n,rows])=>`<li data-i="${esc(nm)}"><span class="hm-nm">${esc(nm)}</span><span class="hm-num">${n}</span><span class="hm-bar"><i style="width:${Math.max(4,n/total*100)}%"></i></span></li>`).join("")||`<li style="cursor:default;color:var(--paper-dim)">No data yet</li>`};
  const ts=Object.entries(by).map(([k,v])=>[k,v.rows.length,v.rows]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const tc=Object.entries(cities).map(([k,v])=>[k,v.n,v.rows]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  list("hmTop",ts,ts.length?ts[0][1]:1);list("hmCities",tc,tc.length?tc[0][1]:1);
  document.querySelectorAll("#hmTop li[data-i]").forEach((li,i)=>li.onclick=()=>open("State — "+ts[i][0],ts[i][2]));
  document.querySelectorAll("#hmCities li[data-i]").forEach((li,i)=>li.onclick=()=>open("City — "+tc[i][0],tc[i][2]));
  const placed=ALL.length-Object.values(unplaced).reduce((a,b)=>a+b,0);
  const miss=Object.keys(unplaced);
  document.getElementById("hmNote").textContent=`${placed} of ${ALL.length} startups placed`+(miss.length?` · not placed: ${miss.slice(0,5).join(", ")}${miss.length>5?"…":""}`:"");
}
draw();
// The ledger redraws its count pill whenever data loads/changes — use that as our cue to refresh.
const pill=document.getElementById("countPill");
if(pill)new MutationObserver(draw).observe(pill,{childList:true,characterData:true,subtree:true});

/* ---------- 2. RECENT NEWS in each startup's popup ---------- */
const hasDb=typeof SUPABASE_URL!=="undefined"&&typeof SUPABASE_ANON_KEY!=="undefined";
const baseOpen=window.openModal;
if(typeof baseOpen==="function"&&hasDb){
  window.openModal=function(row){
    baseOpen(row);
    const modal=document.getElementById("modalContent");if(!modal)return;
    const name=cl(row["Startup Name"]);if(!name)return;
    const box=document.createElement("div");box.className="ledger-news";
    box.innerHTML=`<div class="pill-group-label">Recent news</div><div class="ln-empty">Loading…</div>`;
    const visit=modal.querySelector(".visit-btn");
    visit?modal.insertBefore(box,visit):modal.appendChild(box);
    const hdr={apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY};
    const get=f=>fetch(`${SUPABASE_URL}/rest/v1/articles?select=title,link,source,published_at&startup_name=${f}&order=published_at.desc&limit=3`,{headers:hdr}).then(r=>r.json());
    get("eq."+encodeURIComponent(name))
      .then(items=>Array.isArray(items)&&!items.length?get("ilike."+encodeURIComponent(name.replace(/[%_*]/g,""))):items)
      .then(items=>{
        if(!box.isConnected)return;
        const d=box.querySelector(".ln-empty");
        if(!Array.isArray(items)){console.error("Ledger news query failed:",items);d.textContent="News is unavailable right now.";return}
        if(!items.length){d.textContent="No recent news yet — we check for new stories every hour.";return}
        box.innerHTML=`<div class="pill-group-label">Recent news</div>`+items.map(a=>{
          const dt=new Date(a.published_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
          const ok=/^https?:\/\//.test(a.link)?a.link:"#";
          return `<a class="ln-item" href="${esc(ok)}" target="_blank" rel="noopener">${esc(a.title)}<small>${esc(a.source)} · ${esc(dt)}</small></a>`}).join("");
      }).catch(()=>{const d=box.querySelector(".ln-empty");if(d)d.textContent="News is unavailable right now."});
  };
}

/* ---------- 3. PROPER-CASE NAMES (founders, headquarters) — whatever is typed in the sheet ---------- */
const KEEPU=new Set(["NCR","UK","USA","UAE","IIT","IIM"]);
function pc(s){return String(s==null?"":s).trim().toLowerCase().replace(/(^|[\s\-'’.(\/])([a-z\u00c0-\u024f])/g,(m,a,b)=>a+b.toUpperCase()).replace(/[A-Za-z]+/g,w=>KEEPU.has(w.toUpperCase())?w.toUpperCase():w)}
const pcList=s=>String(s||"").split(",").map(pc).filter(Boolean).join(", ");
function fixNames(){if(typeof ALL==="undefined"||!ALL)return;ALL.forEach(r=>{if(r["Founders"])r["Founders"]=pcList(r["Founders"]);if(r["Headquarters"])r["Headquarters"]=pc(r["Headquarters"])})}
const baseParse=window.parseCsvText;
if(typeof baseParse==="function")window.parseCsvText=function(t){baseParse(t);fixNames();if(typeof applyFilters==="function")applyFilters()};
const baseFounder=window.openFounderPopup;
if(typeof baseFounder==="function")window.openFounderPopup=function(n){baseFounder(n);const h=document.querySelector("#listModalContent h2");if(h)h.textContent=pc(h.textContent)};
fixNames();

/* ---------- 4. UNLISTED SHARES (Oak Sprouts) ----------
   Paste the published-CSV link of your "Unlisted Shares" sheet below. Its first column (or a column named
   "Startup Name") holds the company names you can supply. Optional columns: Also Known As, Indicative Price,
   Min Investment, Visible. */
const UNLISTED_CSV_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQLabEueKpWa1-IkDKAVIAO_la6ZaFiqVYFlUhrlFe8PeDHffQapbBpdXzNUXXeiyZ8OySIQ02p5nh8/pubhtml";
const OAK={name:"Oak Sprouts",email:"team.oaksprouts@gmail.com",phone:"+91 77889 90390",whatsapp:"917788990390",website:"https://www.oaksprouts.com/"};
const nk=s=>String(s||"").toLowerCase().replace(/\b(pvt|private|ltd|limited|llp|inc)\b/g," ").replace(/[^a-z0-9]/g,"");
let UNL=null;
const unlName=r=>cl(r["Startup Name"])||cl(r["Company Name"])||cl(r["Name"])||cl(Object.values(r)[0]);
function loadUnl(){
  if(!UNLISTED_CSV_URL||typeof Papa==="undefined")return;
  fetch(UNLISTED_CSV_URL,{cache:"no-store"}).then(r=>{if(!r.ok)throw 0;return r.text()}).then(t=>{
    const m=new Map();
    Papa.parse(t,{header:true,skipEmptyLines:true}).data.forEach(r=>{
      if(/^(no|false|0|hide|hidden)$/i.test(cl(r["Visible"])))return;
      [unlName(r)].concat(cl(r["Also Known As"]).split(",")).forEach(n=>{if(n&&n.trim())m.set(nk(n),r)});
    });
    UNL=m;if(typeof applyFilters==="function")applyFilters();
  }).catch(()=>{UNL=null});
}
const ustatus=row=>UNL?(UNL.has(nk(row["Startup Name"]))?"avail":"request"):null;
const wa=msg=>`https://wa.me/${OAK.whatsapp}?text=${encodeURIComponent(msg)}`;
function bar(row,s){
  const b=document.createElement("div");b.className="us-bar";
  b.innerHTML=s==="avail"?`<button type="button" class="us-chip avail">Unlisted shares available</button><span class="us-sub">via ${esc(OAK.name)}</span>`
    :`<button type="button" class="us-chip req">Not listed yet · we can find it</button>`;
  b.querySelector("button").addEventListener("click",e=>{e.stopPropagation();openUnl(row,s)});
  return b;
}
const DISC="Unlisted shares are not traded on a stock exchange. They carry higher risk, can be hard to sell and are priced by negotiation. This is information, not investment advice.";
function openUnl(row,s){
  const name=esc(cl(row["Startup Name"])),raw=cl(row["Startup Name"]);
  let ov=document.getElementById("unlOverlay");
  if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="unlOverlay";ov.style.zIndex=175;ov.innerHTML='<div class="modal" id="unlModal"></div>';document.body.appendChild(ov);
    ov.addEventListener("click",e=>{if(e.target===ov)ov.classList.remove("open")})}
  const m=document.getElementById("unlModal");
  const links=(msg)=>`<a class="visit-btn" href="${wa(msg)}" target="_blank" rel="noopener">Chat on WhatsApp</a>
    <a class="us-alt" href="tel:${esc(OAK.phone.replace(/\s/g,""))}">Call ${esc(OAK.phone)}</a>
    <a class="us-alt" href="mailto:${esc(OAK.email)}?subject=${encodeURIComponent("Unlisted shares: "+raw)}&body=${encodeURIComponent(msg)}">Email us</a>
    ${OAK.website?`<a class="us-alt" href="${esc(OAK.website)}" target="_blank" rel="noopener">Visit ${esc(OAK.name)} website</a>`:""}`;
  if(s==="avail"){
    const u=UNL.get(nk(raw))||{},price=cl(u["Indicative Price"]),min=cl(u["Min Investment"]);
    m.innerHTML=`<button class="modal-close" id="unlX">&times;</button><h2>${name}: unlisted shares</h2>
      <p class="modal-tagline">${esc(OAK.name)} deals in unlisted shares and currently has <b>${name}</b> available. Contact us for the latest availability and price.</p>
      ${price||min?`<div class="field-grid">${price?`<div class="field"><label>Indicative price</label><div>${esc(price)}</div></div>`:""}${min?`<div class="field"><label>Minimum investment</label><div>${esc(min)}</div></div>`:""}</div>`:""}
      <div class="us-actions">${links(`Hi ${OAK.name}, I'm interested in unlisted shares of ${raw}. Please share availability and price.`)}</div>
      <p class="us-note">${DISC}</p>`;
  }else{
    m.innerHTML=`<button class="modal-close" id="unlX">&times;</button><h2>Want ${name} unlisted shares?</h2>
      <p class="modal-tagline">We don't have ${name} listed right now, but ${esc(OAK.name)} can try to source it. Tell us a little and we'll check availability and get back to you.</p>
      <form id="unlForm"><div class="form-field"><label>Your name</label><input type="text" name="n" required></div>
      <div class="form-field"><label>Phone or email</label><input type="text" name="c" required></div>
      <div class="form-field"><label>Roughly how much do you want to invest? (optional)</label><input type="text" name="a" placeholder="e.g. ₹5 lakh"></div>
      <button class="form-submit-btn" type="submit">Request via WhatsApp</button></form>
      <div class="us-actions" style="margin-top:14px"><a class="us-alt" href="tel:${esc(OAK.phone.replace(/\s/g,""))}">Call ${esc(OAK.phone)}</a><a class="us-alt" href="mailto:${esc(OAK.email)}?subject=${encodeURIComponent("Unlisted share request: "+raw)}">Email us</a></div>
      <p class="us-note">${DISC}</p>`;
    m.querySelector("#unlForm").onsubmit=e=>{e.preventDefault();const f=e.target;
      window.open(wa(`Hi ${OAK.name}, I'd like to buy unlisted shares of ${raw}. Please check if you can source them.\nName: ${f.n.value.trim()}\nContact: ${f.c.value.trim()}${f.a.value.trim()?"\nBudget: "+f.a.value.trim():""}`),"_blank","noopener")};
  }
  m.querySelector("#unlX").onclick=()=>ov.classList.remove("open");
  ov.classList.add("open");
}
function decorate(list){
  const grid=document.getElementById("grid");if(!grid)return;
  [...grid.children].forEach((card,i)=>{
    const row=list[i];if(!row||!card.classList.contains("card"))return;
    card.style.setProperty("--i",Math.min(i,14));
    card.querySelectorAll(".us-bar").forEach(x=>x.remove());
    const s=ustatus(row);if(s)card.insertBefore(bar(row,s),card.firstChild);
  });
  if(!decorate.done&&list.length){decorate.done=1;grid.classList.add("ul-enter");setTimeout(()=>grid.classList.remove("ul-enter"),1100)}
}
const baseRender=window.render;
if(typeof baseRender==="function")window.render=function(l){baseRender(l);decorate(l)};
// inside each startup's popup too
const prevOpen=window.openModal;
if(typeof prevOpen==="function")window.openModal=function(row){prevOpen(row);
  const s=ustatus(row),t=document.querySelector("#modalContent .modal-tagline");
  if(s&&t){const b=bar(row,s);b.classList.add("in-modal");t.after(b)}};
document.addEventListener("mousemove",e=>{const c=e.target.closest&&e.target.closest(".card");if(c){const r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")}},{passive:true});
loadUnl();
if(typeof applyFilters==="function")applyFilters();
})();
