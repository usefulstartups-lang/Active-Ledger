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

let lastAll=null,lastLen=-1;
function draw(){
  if(typeof ALL==="undefined"||!ALL)return;
  if(ALL===lastAll&&ALL.length===lastLen)return;
  lastAll=ALL;lastLen=ALL.length;
  const by={},cities={},unplaced={};
  Object.keys(TILES).forEach(k=>by[k]={rows:[],sectors:{}});
  ALL.forEach(r=>{
    const hq=cl(r["Headquarters"]);const s=stateOf(hq);
    if(!s){if(hq)unplaced[hq]=(unplaced[hq]||0)+1;return}
    by[s].rows.push(r);
    const sec=cl(r["Sector"]);if(sec)by[s].sectors[sec]=(by[s].sectors[sec]||0)+1;
    cities[hq]=cities[hq]||{n:0,rows:[]};cities[hq].n++;cities[hq].rows.push(r);
  });
  const max=Math.max(1,...Object.values(by).map(v=>v.rows.length));
  const map=document.getElementById("hmMap");map.innerHTML="";
  Object.entries(TILES).forEach(([name,[c,r,code]])=>{
    const n=by[name].rows.length,a=n?0.16+0.8*Math.sqrt(n/max):0;
    const t=document.createElement("div");
    t.className="hm-tile "+(n?"has":"zero");
    t.style.gridColumn=c+1;t.style.gridRow=r+1;
    if(n){t.style.background=`rgba(217,164,65,${a.toFixed(2)})`;t.style.color=a>0.5?"#0B1220":"#F2EFE9"}
    t.innerHTML=`<b>${n||""}</b><span>${code}</span>`;
    t.setAttribute("aria-label",`${name}: ${n} startups`);
    const show=e=>{const top=Object.entries(by[name].sectors).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>x[0]).join(", ");
      tip.innerHTML=`<b>${esc(name)}</b>${n} startup${n===1?"":"s"}${top?`<small>${esc(top)}</small>`:""}`;tip.style.display="block";
      tip.style.left=Math.min(e.clientX+14,window.innerWidth-250)+"px";tip.style.top=(e.clientY+14)+"px"};
    t.addEventListener("mousemove",show);t.addEventListener("mouseleave",()=>tip.style.display="none");
    t.addEventListener("click",()=>{tip.style.display="none";open("State — "+name,by[name].rows)});
    map.appendChild(t);
  });
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
    const q=`${SUPABASE_URL}/rest/v1/articles?select=title,link,source,published_at&startup_name=eq.${encodeURIComponent('"'+name.replace(/"/g,'\\"')+'"')}&order=published_at.desc&limit=3`;
    fetch(q,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY}})
      .then(r=>r.json()).then(items=>{
        if(!box.isConnected)return;
        const d=box.querySelector(".ln-empty");
        if(!Array.isArray(items)||!items.length){d.textContent="No recent news yet — we check for new stories every hour.";return}
        box.innerHTML=`<div class="pill-group-label">Recent news</div>`+items.map(a=>{
          const dt=new Date(a.published_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
          const ok=/^https?:\/\//.test(a.link)?a.link:"#";
          return `<a class="ln-item" href="${esc(ok)}" target="_blank" rel="noopener">${esc(a.title)}<small>${esc(a.source)} · ${esc(dt)}</small></a>`}).join("");
      }).catch(()=>{const d=box.querySelector(".ln-empty");if(d)d.textContent="News is unavailable right now."});
  };
}
})();
