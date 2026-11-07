/* Shared site shell: nav + footer on every page, plus Home/About/Team/Contact/Terms/Privacy,
   all driven by Google Sheet tabs. Edit a cell in the Sheet -> the site updates. */
(function(){
// ====== CONFIG: paste each new tab's gid (the number after "gid=" in its published link) ======
const SHEET="https://docs.google.com/spreadsheets/d/e/2PACX-1vSnzz7ZtIZdVOzq9FJLG0x1Hz2Y6XYNkTsveYm_sJheBoPIP-jhL27SBGl57CLMJirXvzjSQ4X-CMmB/pub";
const GIDS={ledger:"0",settings:"2125262912",nav:"763580476",pages:"1940886012",team:"2027713606",highlights:"1687804525"};
// Until a gid is filled in, the built-in defaults below are used, so the site works on day one.

const DEF={
settings:{site_name:"Useful Startups",tagline:"India's startup ledger and news, in one place.",
 hero_eyebrow:"Vol. 01 — Live Feed",hero_title:"Know who is building",hero_accent:"India's next.",
 hero_subtext:"A living register of Indian startups, who backs them, and the news that moves them.",
 cta1_label:"Explore the Ledger",cta1_url:"ledger.html",cta2_label:"Read the news",cta2_url:"news.html",
 about_title:"About us",about_intro:"Why this exists and what we believe.",
 team_title:"The team",team_intro:"The people behind the ledger.",
 support_title:"Buy Me a Beer",beer_message:"Good things take support! Your contributions keep us motivated to keep this website running, growing and bringing you more valuable content. Every little contribution makes a difference. ❤️",contact_title:"Get in touch",contact_intro:"Questions, corrections or partnerships — we read everything.",
 terms_title:"Terms of Use",terms_intro:"The rules for using this website.",
 privacy_title:"Privacy Policy",privacy_intro:"What we collect and why.",
 legal_updated:"",contact_email:"hello@example.com",contact_phone:"",address:"",
 linkedin:"",twitter:"",instagram:"",facebook:"",youtube:"",discord:"",blog:"",whatsapp:"",contact_form_url:"",logo_url:"logo-mark.png",
 oak_show:"yes",oak_name:"Oak Sprouts",oak_url:"https://oaksprouts.com",oak_logo:"oaksprouts-logo.png",oak_cta:"Visit oaksprouts.com",
 oak_text:"A startup of our co-founders that manages startup portfolios, with startup investing, seed funding, angel investing and unlisted opportunities.",
 oak_badge:"Useful Startups is part of the Oak Sprouts portfolio",
 footer_blurb:"Tracking India's startups, one row at a time.",copyright:"© 2026 Useful Startups. All rights reserved."},
nav:[{Label:"Home",URL:"index.html",Location:"header",Order:1},{Label:"Ledger",URL:"ledger.html",Location:"both",Group:"Directories",Order:2},
 {Label:"News",URL:"news.html",Location:"both",Group:"Resources",Order:3},{Label:"About",URL:"about.html",Location:"both",Group:"Company",Order:4},
 {Label:"Team",URL:"team.html",Location:"both",Group:"Company",Order:5},{Label:"Contact",URL:"contact.html",Location:"both",Group:"Company",Order:6},{Label:"Buy Me a Beer",URL:"support.html",Location:"footer",Group:"Company",Order:7},
 {Label:"Terms",URL:"terms.html",Location:"footer",Group:"Resources",Order:7},{Label:"Privacy",URL:"privacy.html",Location:"footer",Group:"Resources",Order:8}],
highlights:[{Value:"auto:startups",Label:"Startups tracked",Order:1},{Value:"Hourly",Label:"News refresh",Order:2},{Value:"100%",Label:"Free to browse",Order:3}],
team:[{Name:"Founder Name",Role:"Founder",Bio:"Edit this in the Team tab of your Google Sheet.",Order:1}],
pages:[
 {Page:"home",Order:1,Heading:"The Active Ledger",Body:"Search, filter and compare startups by sector, tech and investors.",Link:"ledger.html"},
 {Page:"home",Order:2,Heading:"The Runway",Body:"Fresh startup and business news, refreshed every hour.",Link:"news.html"},
 {Page:"home",Order:3,Heading:"Suggest a startup",Body:"Know one that belongs here? Send it in for review.",Link:"ledger.html"},
  {Page:"steps",Order:1,Heading:"Search",Body:"Find startups by name, sector, city, founder or investor."},
 {Page:"steps",Order:2,Heading:"Compare",Body:"Put up to four startups side by side and see who backs them."},
 {Page:"steps",Order:3,Heading:"Connect",Body:"Spot an unlisted opportunity? Oak Sprouts can help you get the shares."},
 {Page:"about",Order:1,Heading:"Our mission",Body:"Replace this text from the Pages tab of your Google Sheet.\n\nSeparate paragraphs with a blank line. Use **bold**, [links](https://example.com) and\n- bullet lists."},
 {Page:"terms",Order:1,Heading:"1. Acceptance",Body:"By using this website you agree to these terms. Replace this placeholder with your reviewed legal text."},
 {Page:"privacy",Order:1,Heading:"1. What we collect",Body:"Replace this placeholder with your reviewed privacy policy."}]
};

// ====== helpers ======
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=u=>/^\s*(javascript|data|vbscript):/i.test(u)?"#":u;
const clean=v=>{v=(v||"").trim();return v==="-"?"":v};
const pc=v=>String(v==null?"":v).trim().toLowerCase().replace(/(^|[\s\-'’.(\/])([a-z\u00c0-\u024f])/g,(m,a,b)=>a+b.toUpperCase());
const vis=r=>!/^(no|false|0|hide)$/i.test((r.Visible||"").trim());
const by=(a,b)=>(parseFloat(a.Order)||99)-(parseFloat(b.Order)||99);
const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>`<a href="${url(u)}">${t}</a>`);
function md(t){const o=[];let ul=false;String(t||"").split(/\r?\n/).forEach(l=>{l=l.trim();
 if(/^[-•]\s+/.test(l)){if(!ul){o.push("<ul>");ul=true}o.push("<li>"+inline(l.replace(/^[-•]\s+/,""))+"</li>")}
 else{if(ul){o.push("</ul>");ul=false}if(/^##\s+/.test(l))o.push("<h3>"+inline(l.slice(3))+"</h3>");else if(l)o.push("<p>"+inline(l)+"</p>")}});
 if(ul)o.push("</ul>");return o.join("")}
function drive(u){u=clean(u);if(!u)return"";const m=u.match(/\/d\/([\w-]+)/)||u.match(/id=([\w-]+)/);return m?`https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`:u}
const initials=n=>String(n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
function loadScript(src){return new Promise((res,rej)=>{if(window.Papa)return res();const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}

function tab(name){
 const gid=GIDS[name],def=DEF[name],ck="ul_tab_"+name;
 if(gid==="")return Promise.resolve(null);
 return loadScript("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js")
  .then(()=>fetch(`${SHEET}?gid=${gid}&single=true&output=csv`,{cache:"no-store"}))
  .then(r=>{if(!r.ok)throw 0;return r.text()})
  .then(t=>{const d=Papa.parse(t,{header:true,skipEmptyLines:true}).data;try{localStorage.setItem(ck,JSON.stringify(d))}catch(e){}return d})
  .catch(()=>{try{return JSON.parse(localStorage.getItem(ck))}catch(e){return null}});
}
async function get(name){const d=await tab(name);return d&&d.length?d:null}
async function getSettings(){const d=await get("settings");const s=Object.assign({},DEF.settings);
 if(d)d.forEach(r=>{const k=clean(r.Key);if(k&&clean(r.Value))s[k]=r.Value.trim()});return s}

// ====== shell ======
function head(){
 const add=(tag,attrs)=>{const e=document.createElement(tag);Object.assign(e,attrs);document.head.appendChild(e)};
 add("link",{rel:"stylesheet",href:"site.css"});
 add("link",{rel:"icon",type:"image/png",sizes:"48x48",href:"favicon-48.png"});
 add("link",{rel:"icon",type:"image/png",sizes:"32x32",href:"favicon-32.png"});
 add("link",{rel:"apple-touch-icon",href:"apple-touch-icon.png"});
 add("link",{rel:"manifest",href:"site.webmanifest"});
 add("meta",{name:"theme-color",content:"#0B1220"});  
 add("link",{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"});
}
function shell(S,nav){
 const here=location.pathname.split("/").pop()||"index.html";
 const items=nav.filter(vis).sort(by);
 const link=(r,cls)=>{const u=clean(r.URL)||"#";const on=u.split("/").pop()===here||(here==="index.html"&&(u==="/"||u==="index.html"));
  return `<a href="${esc(url(u))}"${/^https?:/.test(u)&&!u.includes(location.host)?' target="_blank" rel="noopener"':""} class="${on?"on":""}">${esc(r.Label)}</a>`};
 const loc=(r,w)=>{const l=(r.Location||"header").toLowerCase();return l==="both"||l===w};
 const mark=S.logo_url?`<img src="${esc(drive(S.logo_url))}" alt="">`:esc(initials(S.site_name).charAt(0));
 const brand=`<a class="ul-brand" href="index.html"><span class="ul-mark">${mark}</span><span>${esc(S.site_name)}</span></a>`;
 const nv=document.createElement("div");nv.className="ul-nav";
 nv.innerHTML=`<div class="ul-nav-in">${brand}<nav class="ul-links" id="ulLinks">${items.filter(r=>loc(r,"header")).map(link).join("")}</nav><button class="ul-burger" aria-label="Menu" id="ulBurger">☰</button></div>`;
 document.body.insertBefore(nv,document.body.firstChild);
 addEventListener("scroll",()=>nv.classList.toggle("scrolled",scrollY>8),{passive:true});
 $("#ulBurger").onclick=()=>$("#ulLinks").classList.toggle("open");
 const sv=(p,f)=>`<svg viewBox="0 0 24 24" ${f?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${p}</svg>`;
 const WA=sv('<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.41-1.35a9.86 9.86 0 0 0 4.63 1.15h.01c5.46 0 9.9-4.45 9.9-9.9C21.96 6.45 17.51 2 12.04 2zm5.8 14.18c-.24.68-1.4 1.3-1.93 1.37-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.93-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.14.14-.29.29-.13.58.17.29.75 1.24 1.62 2.01 1.12.99 2.06 1.3 2.35 1.44.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.68-.17 1.36z"/>',1);
 const SOC=[["linkedin","LinkedIn",sv('<path d="M6.94 5a2 2 0 1 1-4-.01 2 2 0 0 1 4 .01zM7 8.48H3V21h4V8.48zm6.32 0H9.35V21h3.97v-6.57c0-3.66 4.77-3.96 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48z"/>',1)],
  ["twitter","X",sv('<path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.9L4.5 22H1.4l8.1-9.3L1 2h7l4.9 6.3L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/>',1)],
  ["instagram","Instagram",sv('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>')],
  ["facebook","Facebook",sv('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>')],
  ["youtube","YouTube",sv('<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><path d="m9.75 15.02 5.75-3.27-5.75-3.27z"/>')],
  ["discord","Discord",sv('<path d="M20.3 4.4A17 17 0 0 0 16 3l-.2.4a15 15 0 0 1 3.8 1.9 13 13 0 0 0-11.2 0A15 15 0 0 1 12.2 3.4L12 3a17 17 0 0 0-4.3 1.4C5 8.4 4.3 12.3 4.6 16.1a17 17 0 0 0 5.2 2.6l.9-1.4a11 11 0 0 1-1.5-.7l.4-.3a12 12 0 0 0 10.8 0l.4.3c-.5.3-1 .5-1.5.7l.9 1.400a17 17 0 0 0 5.2-2.600c.4-4.4-.7-8.3-3.1-11.700zM9.5 13.800c-.9 0-1.6-.8-1.6-1.800s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.800zm5 0c-.9 0-1.6-.8-1.6-1.800s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.800z"/>',1)],
  ["blog","Blog",sv('<path d="M4 6h16M4 12h10M4 18h14"/>')]];
 const soc=SOC.filter(x=>S[x[0]]).map(x=>`<a class="ul-soc" href="${esc(url(S[x[0]]))}" target="_blank" rel="noopener" aria-label="${x[1]}">${x[2]}</a>`).join("");
 const groups={};items.filter(r=>loc(r,"footer")).forEach(r=>{const g=clean(r.Group)||"Company";(groups[g]=groups[g]||[]).push(r)});
 const cols=Object.keys(groups).map(g=>`<div><h4>${esc(g)}</h4>${groups[g].map(link).join("")}</div>`).join("");
 const wa=S.whatsapp?(/^https?:/.test(S.whatsapp)?S.whatsapp:"https://wa.me/"+S.whatsapp.replace(/\D/g,"")):"";
 const ctRows=[[S.contact_email&&"mailto:"+S.contact_email,S.contact_email,sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>')],
  [S.contact_phone&&"tel:"+S.contact_phone.replace(/\s/g,""),S.contact_phone,sv('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>')],
  [wa,wa&&"Chat on WhatsApp",WA],
  [S.address&&"-",S.address,sv('<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>')]];
 const ct=ctRows.filter(r=>r[1]).map(r=>{const inner=`<i>${r[2]}</i><span>${esc(r[1])}</span>`;return r[0]==="-"?`<div class="ul-ct">${inner}</div>`:`<a class="ul-ct" href="${esc(url(r[0]))}"${/^https/.test(r[0])?' target="_blank" rel="noopener"':""}>${inner}</a>`}).join("");
 const ft=document.createElement("div");ft.className="ul-foot";
const oak=S.oak_url&&!/^(no|false|0|hide)$/i.test(S.oak_show)?`<div class="ul-oak"><div class="ul-oak-in"><div class="ul-oak-logo">${S.oak_logo?`<img src="${esc(drive(S.oak_logo))}" alt="${esc(S.oak_name)} logo" loading="lazy">`:""}</div><div class="ul-oak-body"><h3>${esc(S.oak_name)}</h3><p>${esc(S.oak_text)}</p>${S.oak_badge?`<span class="ul-oak-badge">${esc(S.oak_badge)}</span>`:""}</div><a class="ul-oak-cta" href="${esc(url(S.oak_url))}" target="_blank" rel="noopener">${esc(S.oak_cta)} <span aria-hidden="true">→</span></a></div></div>`:"";
  ft.innerHTML=oak+`<div class="ul-foot-in"><div class="ul-fb">${brand}<p>${esc(S.footer_blurb)}</p><div class="ul-socs">${soc}</div></div>
 <div class="ul-groups">${cols}</div><div><h4>Get in touch</h4>${ct}</div></div>
 <div class="ul-copy"><span>${esc(S.copyright)}</span><a href="#" style="display:inline" onclick="window.scrollTo({top:0,behavior:'smooth'});return false">Back to top</a></div>`;
 document.body.appendChild(ft);
 const h=nv.offsetHeight;if(h)document.documentElement.style.setProperty("--ul-nav-h",h+"px");
}

// ====== pages ======
const sections=(rows,p)=>rows.filter(r=>(r.Page||"").toLowerCase()===p&&vis(r)).sort(by);
function pageHead(S,k){return `<div class="ul-pagehead"><div class="ul-aurora"></div><div class="ul-wrap"><div class="ul-eyebrow">${esc(S.site_name)}</div><h1>${esc(S[k+"_title"])}</h1><p class="ul-lead">${esc(S[k+"_intro"])}</p></div></div>`}
function textPage(k,S,P){
 const rows=sections(P,k);const upd=S.legal_updated&&(k==="terms"||k==="privacy")?`<p style="font:12px var(--mono);color:var(--gold2)">Last updated: ${esc(S.legal_updated)}</p>`:"";
 return pageHead(S,k)+`<div class="ul-doc">${upd}${rows.map(r=>`<section class="rv">${clean(r.Heading)?`<h2>${esc(r.Heading)}</h2>`:""}${md(r.Body)}</section>`).join("")||"<p>No content yet.</p>"}</div>`;
}
function teamPage(S,T){
 const m=T.filter(vis).sort(by);
 return pageHead(S,"team")+`<div class="ul-wrap ul-team" style="padding-bottom:90px"><div class="ul-grid">${m.map(r=>{const ph=drive(r.Photo||r["Photo URL"]);
  return `<div class="ul-card tilt rv"><div class="ul-photo">${ph?`<img src="${esc(ph)}" alt="${esc(pc(r.Name))}" onerror="this.remove()">`:esc(initials(pc(r.Name)))}</div><div class="ul-body"><h3>${esc(pc(r.Name))}</h3><div class="ul-role">${esc(r.Role)}</div><p>${inline(r.Bio)}</p>${clean(r.LinkedIn)?`<a class="ul-more" href="${esc(url(r.LinkedIn))}" target="_blank" rel="noopener">LinkedIn →</a>`:""}</div></div>`}).join("")}</div></div>`;
}
function contactPage(S){
 const row=(l,v)=>v?`<div><label>${l}</label>${v}</div>`:"";
 return pageHead(S,"contact")+`<div class="ul-wrap"><div class="ul-contact"><div class="ul-info rv">
 ${row("Email",S.contact_email&&`<a href="mailto:${esc(S.contact_email)}">${esc(S.contact_email)}</a>`)}${row("Phone",esc(S.contact_phone))}${row("Address",esc(S.address))}
 ${row("Follow",["linkedin","twitter","instagram","facebook","youtube","discord"].filter(k=>S[k]).map(k=>`<a href="${esc(url(S[k]))}" target="_blank" rel="noopener">${k}</a>`).join(" · "))}</div>
 <form class="ul-form rv" id="ulForm"><label>Your name</label><input name="fname" required><label>Your email</label><input type="email" name="femail" required>
 <label>Message</label><textarea name="fmsg" required></textarea><div class="ul-hp"><input name="hp" tabindex="-1" autocomplete="off"></div>
 <button class="ul-btn" type="submit">Send message</button><div class="ul-status" id="ulStatus"></div></form></div></div>`;
}
function wireForm(S){
 const f=$("#ulForm");if(!f)return;const st=$("#ulStatus");const t0=Date.now();
 const ok=()=>{st.style.color="#6fbf73";st.textContent="Thanks — your message has been sent.";f.reset()};
 const bad=()=>{st.style.color="#C1543C";st.textContent="Couldn't send that. Please email us directly."};
 f.onsubmit=e=>{e.preventDefault();if(f.hp.value)return ok();if(Date.now()-t0<2500){st.style.color="#C1543C";st.textContent="Please take a moment to fill out the form.";return}
  const d={formType:"contact",name:f.fname.value.trim(),email:f.femail.value.trim(),message:f.fmsg.value.trim()};
  if(S.contact_form_url){st.textContent="Sending…";fetch(S.contact_form_url,{method:"POST",body:JSON.stringify(d),headers:{"Content-Type":"text/plain;charset=utf-8"}}).then(r=>r.json()).then(j=>j.ok?ok():bad()).catch(bad)}
  else location.href="mailto:"+S.contact_email+"?subject="+encodeURIComponent("Message from "+d.name)+"&body="+encodeURIComponent(d.message+"\n\n"+d.email);};
}

const words=(t,n)=>String(t).split(/\s+/).filter(Boolean).map((w,i)=>`<span class="w"><span style="--i:${n+i}">${esc(w)}</span></span>`).join(" ");
async function homePage(S,P,H){
 const cards=sections(P,"home");
 const steps=sections(P,"steps");
 const out=`<section class="ul-hero"><div class="ul-aurora"></div><div class="ul-wrap"><div class="ul-eyebrow">${esc(S.hero_eyebrow)}</div>
 <h1>${words(S.hero_title,0)} <em>${words(S.hero_accent,S.hero_title.split(/\s+/).length)}</em></h1><p class="ul-lead">${esc(S.hero_subtext)}</p>
 <div class="ul-cta"><a class="ul-btn" href="${esc(url(S.cta1_url))}">${esc(S.cta1_label)}</a>${S.cta2_label?`<a class="ul-btn ghost" href="${esc(url(S.cta2_url))}">${esc(S.cta2_label)}</a>`:""}</div><div class="ul-tape" id="ulTape" hidden><div class="ul-tape-in" id="ulTapeIn"></div></div></div></section>
 <section class="ul-sec ul-pulse" id="ulPulse" hidden><div class="ul-wrap"><div class="ul-head"><h2>What's new in the Ledger</h2><a class="ul-link" href="ledger.html">Open the Ledger →</a></div>
 <div class="ul-pulse-grid"><a class="ul-week rv" id="ulWeek" href="ledger.html"></a>
 <div class="ul-pulse-side"><div class="ul-box rv"><h3>Recently added</h3><div id="ulRecent"></div></div>
 <div class="ul-box rv"><h3>Trending sectors</h3><div id="ulTrend"></div></div>
 <a class="ul-box ul-mapcta rv" href="ledger.html#heatmap"><h3>Heat map</h3><p>See which states India's startups are based in →</p></a></div></div></div></section>
 ${steps.length?`<section class="ul-sec"><div class="ul-wrap"><h2>How it works</h2><ol class="ul-steps">${steps.map((r,i)=>`<li class="rv"><span class="ul-num">${String(i+1).padStart(2,"0")}</span><h3>${esc(r.Heading)}</h3><p>${inline(r.Body)}</p></li>`).join("")}</ol></div></section>`:""}
 <section class="ul-sec"><div class="ul-wrap"><div class="ul-eyebrow">Explore</div><h2>Everything in one place</h2><div class="ul-grid">${cards.map(r=>`<a class="ul-card rv" href="${esc(url(clean(r.Link)||"#"))}"><h3>${esc(r.Heading)}</h3><p>${inline(r.Body)}</p><span class="ul-more">Open →</span></a>`).join("")}</div></div></section>
 <section class="ul-sec ul-beer-band"><div class="ul-wrap"><a class="ul-beer-cta rv" href="support.html"><span class="e">🍺</span><div><h3>Enjoying Useful Startups?</h3><p>Buy us a beer and help keep it running.</p></div><span class="ul-more">Support us →</span></a></div></section>
 <section class="ul-sec" id="ulNews" hidden><div class="ul-wrap"><div class="ul-head"><div><div class="ul-eyebrow">Latest</div><h2>From The Runway</h2></div><a class="ul-link" href="news.html">All stories →</a></div><div class="ul-grid" id="ulNewsGrid"></div></div></section>`;
 return out;
}
async function homeData(){
 let rows=[];
 try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js");
  const t=await fetch(`${SHEET}?gid=${GIDS.ledger}&single=true&output=csv`,{cache:"no-store"}).then(r=>r.text());
  rows=Papa.parse(t,{header:true,skipEmptyLines:true}).data.filter(r=>clean(r["Startup Name"])&&vis(r))}catch(e){}
 const tp=$("#ulTapeIn");
 if(tp&&rows.length){const h=rows.slice(0,80).map(r=>`<span><b>${esc(r["Startup Name"])}</b>${esc(clean(r.Sector))}${clean(r.Headquarters)?" · "+esc(pc(r.Headquarters)):""}</span>`).join("");tp.innerHTML=h+h;$("#ulTape").hidden=false;
  const speed=()=>{const w=tp.scrollWidth/2;if(w)tp.style.animationDuration=Math.max(w/38,24)+"s"};speed();
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(speed)}
 if(rows.length){
  const T=r=>encodeURIComponent(r["Startup Name"].trim()),lg=r=>{const l=clean(r["Logo URL"]);if(l)return drive(l);const w=clean(r["Website URL"]);try{return w?"https://www.google.com/s2/favicons?domain="+new URL(/^https?:/.test(w)?w:"https://"+w).hostname+"&sz=128":""}catch(e){return""}};
  const feat=rows.filter(r=>clean(r.Featured).toLowerCase()==="yes"),pool=feat.length?feat:rows,w=pool[Math.floor(Date.now()/6048e5)%pool.length];
  const wl=lg(w),wn=w["Startup Name"].trim(),edge=clean(w["Competitive Edge"]);
  const wk=$("#ulWeek");wk.href="ledger.html#s="+T(w);wk.dataset.i=initials(wn);
  wk.innerHTML=`<span class="ul-meta">Startup of the week</span><div class="ul-wk-top">${wl?`<img src="${esc(wl)}" alt="" onerror="this.remove()">`:`<div class="ul-wk-fb">${esc(initials(wn))}</div>`}<div><h3>${esc(wn)}</h3><div class="ul-wk-sub">${esc([clean(w.Sector),pc(clean(w.Headquarters)),clean(w["Founded In"])?"est. "+clean(w["Founded In"]):""].filter(Boolean).join(" · "))}</div></div></div><p>${esc(clean(w["Tagline / Description"]))}</p>${edge?`<blockquote>${esc(edge)}</blockquote>`:""}<div class="ul-wk-foot"><span>${esc(clean(w["Funding Amount"])||"Funding undisclosed")}${clean(w["Funding Stage"]||w["Funding stage"])?" · "+esc(clean(w["Funding Stage"]||w["Funding stage"])):""}</span><span class="ul-more">Open in the Ledger →</span></div>`;
  const dated=rows.filter(r=>Date.parse(r["Added On"])),rec=(dated.length?dated.slice().sort((a,b)=>Date.parse(b["Added On"])-Date.parse(a["Added On"])):rows.slice().reverse()).slice(0,4);
  $("#ulRecent").innerHTML=rec.map(r=>`<a class="ul-rec" href="ledger.html#s=${T(r)}"><b>${esc(r["Startup Name"])}</b><span>${esc([clean(r.Sector),pc(clean(r.Headquarters))].filter(Boolean).join(" · "))}</span></a>`).join("");
  const c={};rows.forEach(r=>{const x=clean(r.Sector);if(x)c[x]=(c[x]||0)+1});const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5),mx=top.length?top[0][1]:1;
  $("#ulTrend").innerHTML=top.map(([n,k])=>`<div class="ul-bar"><span>${esc(n)}</span><em>${k}</em><i style="--w:${(k/mx*100).toFixed(0)}%"></i></div>`).join("");
  $("#ulPulse").hidden=false}
 try{if(typeof SUPABASE_URL!=="undefined"){const a=await fetch(`${SUPABASE_URL}/rest/v1/articles?select=title,link,source,summary&order=published_at.desc&limit=3`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY}}).then(r=>r.json());
  if(Array.isArray(a)&&a.length){$("#ulNews").hidden=false;$("#ulNewsGrid").innerHTML=a.map(x=>`<a class="ul-card rv" href="${esc(url(x.link))}" target="_blank" rel="noopener"><span class="ul-meta">${esc(x.source)}</span><h3 style="font-size:18px">${esc(x.title)}</h3><p>${esc((x.summary||"").slice(0,120))}</p></a>`).join("")}}}catch(e){}
}
function fx(){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);e.target.querySelectorAll&&e.target.querySelectorAll("b[data-v]").forEach(count)}}),{threshold:.12});
 const watch=()=>document.querySelectorAll(".rv:not(.in)").forEach(el=>io.observe(el));watch();new MutationObserver(watch).observe(document.body,{childList:true,subtree:true});
 document.addEventListener("mousemove",e=>{const c=e.target.closest&&e.target.closest(".ul-card,.ul-hero,.ul-pagehead");if(!c)return;const r=c.getBoundingClientRect();
  const a=c.classList.contains("ul-card")?c:c.querySelector(".ul-aurora")||c;a.style.setProperty("--mx",(e.clientX-r.left)+"px");a.style.setProperty("--my",(e.clientY-r.top)+"px")});
}
function count(el){const v=el.dataset.v||"";const m=v.match(/^(\D*)([\d.,]+)(.*)$/);if(!m||/^auto:/.test(v)){el.textContent=v;return}
 const n=parseFloat(m[2].replace(/,/g,""));let t0;const f=t=>{t0=t0||t;const p=Math.min((t-t0)/1200,1);el.textContent=m[1]+Math.round(n*(1-Math.pow(1-p,3))).toLocaleString("en-IN")+m[3];if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}


// ====== Buy Me a Beer ======
const TIERS=[{id:"beer",icon:"🍺",name:"Buy Me a Beer",amt:10},{id:"round",icon:"🍻",name:"Buy Me a Round",amt:50},{id:"cheers",icon:"🥂",name:"Keep the Cheers Coming",amt:100},{id:"party",icon:"🎉",name:"Party Sponsor",amt:500},{id:"bar",icon:"🏆",name:"Sponsor the Bar",amt:5000}];
const FILL=[30,48,64,80,94],BADGES=[["🥇","Head Brewer","gold"],["🥈","Master Taster","silver"],["🥉","Chief Cheerer","bronze"],["🍺","Regular","reg"],["🍺","Regular","reg"]];
const inr=n=>"₹"+Number(n).toLocaleString("en-IN");
function supportPage(S){
 const bubbles=[[38,0],[52,.9],[64,1.7],[46,2.4],[58,.4],[70,1.2]].map(([x,d],i)=>`<circle class="bb" cx="${x}" cy="125" r="${2.2+i%3}" style="animation-delay:${d}s"/>`).join("");
 return `<section class="beer-hero"><div class="ul-aurora"></div><div class="ul-wrap"><div class="ul-eyebrow">Support us</div><h1>Buy Me a <em>Beer</em> <span class="e">🍺</span></h1><p class="ul-lead">${esc(S.beer_message)}</p></div></section>
 <div class="ul-wrap"><div class="beer-grid"><div class="beer-card" id="beerCard">
  <div class="beer-mugwrap"><svg class="beer-mug" id="beerMug" viewBox="0 0 126 146" aria-hidden="true"><defs><linearGradient id="bgl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D27A"/><stop offset="1" stop-color="#C98A1B"/></linearGradient><clipPath id="glass"><path d="M22 30H86L80 126Q79 132 73 132H35Q29 132 28 126Z"/></clipPath></defs>
   <path d="M86 46H100Q114 46 114 64V80Q114 98 100 98H82" fill="none" stroke="rgba(242,239,233,.5)" stroke-width="7" stroke-linecap="round"/>
   <g clip-path="url(#glass)"><g class="fill" id="beerFill"><rect x="14" y="36" width="80" height="140" fill="url(#bgl)"/>${bubbles}</g></g>
   <path d="M22 30H86L80 126Q79 132 73 132H35Q29 132 28 126Z" fill="rgba(242,239,233,.05)" stroke="rgba(242,239,233,.6)" stroke-width="3" stroke-linejoin="round"/>
   <g class="foam" id="beerFoam" fill="#F2EFE9"><circle cx="30" cy="34" r="9"/><circle cx="44" cy="28" r="11"/><circle cx="60" cy="27" r="12"/><circle cx="76" cy="31" r="10"/><circle cx="84" cy="36" r="7"/></g></svg></div>
  <h2 class="beer-h2">Pick your round</h2>
  <div class="beer-tiers" role="radiogroup" aria-label="Donation amount">${TIERS.map((t,i)=>`<button type="button" class="beer-tier" role="radio" aria-checked="${i===0}" data-i="${i}"><span class="i">${t.icon}</span><b>${esc(t.name)}</b><span class="p">${inr(t.amt)}</span></button>`).join("")}</div>
  <label class="beer-lbl" for="beerName">Your username <small>(shown on the leaderboard)</small></label>
  <input id="beerName" class="beer-input" maxlength="24" autocomplete="nickname" placeholder="e.g. StartupSam">
  <button type="button" class="beer-pay" id="beerPay"><span>Buy Me a Beer</span><b id="beerAmt">${inr(TIERS[0].amt)}</b></button>
  <div class="beer-msg" id="beerMsg" role="status" aria-live="polite"></div></div>
  <aside class="beer-board"><div class="beer-board-h"><h2>Top 5 Beer Supporters</h2><span class="live"><i></i>Live</span></div><ol id="beerBoard" class="beer-list"></ol><p class="beer-note">Rankings update automatically after every successful payment.</p></aside></div>
  <p class="beer-fine">Contributions are voluntary and non-refundable gifts that help keep this website running. Payments are processed securely by Razorpay; we never see your card or UPI details. Usernames on the leaderboard are public.</p></div>`;
}
function loadExt(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const x=document.createElement("script");x.src=src;x.onload=res;x.onerror=rej;document.head.appendChild(x)})}
async function fetchBoard(){
 if(typeof SUPABASE_URL==="undefined")return null;
 try{const r=await fetch(`${SUPABASE_URL}/rest/v1/beer_leaderboard?select=username,total,contributions&order=total.desc,last_paid.asc&limit=5`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY},cache:"no-store"});
  const d=await r.json();return Array.isArray(d)?d:null}catch(e){return null}
}
let boardSig="";
function paintBoard(rows,force){
 const ol=$("#beerBoard");if(!ol)return;
 const sig=JSON.stringify(rows);if(!force&&sig===boardSig)return;boardSig=sig;
 if(!rows||!rows.length){ol.innerHTML=`<li class="beer-empty">No supporters yet. Be the first to raise a glass! 🍻</li>`+[1,2,3,4].map(()=>`<li class="beer-row ghost"><span class="rk">·</span><span class="nm">—</span></li>`).join("");return}
 const mx=Math.max(...rows.map(r=>+r.total))||1;
 ol.innerHTML=rows.map((r,i)=>{const b=BADGES[i];return `<li class="beer-row r${i+1}" style="--d:${i*70}ms"><span class="rk" title="Rank ${i+1}">${b[0]}</span><div class="who"><b>${esc(r.username)}</b><span class="bd ${b[2]}">${b[1]}</span></div><div class="amt"><b data-n="${+r.total}">${inr(r.total)}</b><small>${r.contributions} cheer${+r.contributions===1?"":"s"}</small></div><i class="bar" style="--w:${Math.max(6,(+r.total/mx*100)).toFixed(0)}%"></i></li>`}).join("");
}
async function refreshBoard(force){const d=await fetchBoard();if(d)paintBoard(d,force);else if(!boardSig)paintBoard([],true)}
function confetti(){const f=["🍺","🍻","✨","🥂","🎉"];for(let i=0;i<26;i++){const e=document.createElement("span");e.className="beer-conf";e.textContent=f[i%f.length];e.style.cssText=`left:${Math.random()*100}vw;animation-delay:${(Math.random()*.5).toFixed(2)}s;font-size:${16+Math.random()*16|0}px;--dx:${(Math.random()*120-60)|0}px`;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}}
function wireSupport(S){
 let sel=0;const tiers=[...document.querySelectorAll(".beer-tier")],pay=$("#beerPay"),name=$("#beerName"),msg=$("#beerMsg"),mug=$("#beerMug");
 try{name.value=localStorage.getItem("beer_name")||""}catch(e){}
 const level=i=>{const t=96-FILL[i];$("#beerFill").style.transform=`translateY(${t}px)`;$("#beerFoam").style.transform=`translateY(${t}px)`};
 const pick=i=>{sel=i;tiers.forEach((b,k)=>b.setAttribute("aria-checked",k===i));$("#beerAmt").textContent=inr(TIERS[i].amt);level(i);mug.classList.remove("pop");void mug.getBoundingClientRect();mug.classList.add("pop")};
 tiers.forEach((b,i)=>{b.onclick=()=>pick(i);b.onkeydown=e=>{if(e.key==="ArrowDown"||e.key==="ArrowRight"){e.preventDefault();const n=(i+1)%5;tiers[n].focus();pick(n)}if(e.key==="ArrowUp"||e.key==="ArrowLeft"){e.preventDefault();const n=(i+4)%5;tiers[n].focus();pick(n)}}});
 pay.onmouseenter=()=>{mug.classList.remove("clink");void mug.getBoundingClientRect();mug.classList.add("clink")};
 level(0);
 const say=(t,c)=>{msg.textContent=t;msg.className="beer-msg "+(c||"")};
 pay.onclick=async()=>{
  const u=name.value.replace(/\s+/g," ").trim();
  if(!/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$/.test(u)){say("Please enter a username: 2–24 letters or numbers (spaces . _ - allowed).","err");name.focus();return}
  try{localStorage.setItem("beer_name",u)}catch(e){}
  pay.disabled=true;pay.classList.add("busy");say("Opening secure checkout…");
  try{
   const r=await fetch("/api/beer/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tier:TIERS[sel].id,name:u})});
   if(r.status===404||r.status===501){say("Payments aren't switched on yet. Please check back soon!","err");return}
   const o=await r.json().catch(()=>({}));if(!r.ok||!o.order_id){say("We couldn't start the payment. Please try again in a moment.","err");return}
   await loadExt("https://checkout.razorpay.com/v1/checkout.js");
   const rz=new Razorpay({key:o.key_id,amount:o.amount,currency:"INR",order_id:o.order_id,name:S.site_name,description:TIERS[sel].name,notes:{username:u},theme:{color:"#D9A441"},
    handler:()=>{say(`Cheers, ${u}! 🍻 Your ${inr(TIERS[sel].amt)} is being confirmed. The leaderboard updates in a moment.`,"ok");confetti();let n=0;const t=setInterval(()=>{refreshBoard();if(++n>=10)clearInterval(t)},3000);setTimeout(()=>refreshBoard(),1200)},
    modal:{ondismiss:()=>{say("")}}});
   rz.on&&rz.on("payment.failed",()=>say("The payment didn't go through. You haven't been charged. Please try again.","err"));
   rz.open();
  }catch(e){say("Something went wrong. Please try again.","err")}
  finally{pay.disabled=false;pay.classList.remove("busy")}
 };
 refreshBoard(true);setInterval(()=>{if(!document.hidden)refreshBoard()},30000);
}

// ====== boot ======
function themes(){
 const add=h=>{const l=document.createElement("link");l.rel="stylesheet";l.href=h;document.head.appendChild(l)};
 if(document.getElementById("countPill")&&document.getElementById("grid"))add("ledger-theme.css");
 if(document.getElementById("feed")&&document.querySelector(".masthead"))add("news-theme.css");
}
async function boot(){
 try{await boot0()}finally{document.dispatchEvent(new Event("ul:ready"))}
}
async function boot0(){
 head();themes();
 const [S,nav,pages,team,hl]=await Promise.all([getSettings(),get("nav"),get("pages"),get("team"),get("highlights")]);
 const NAV=nav||DEF.nav,P=pages||DEF.pages;
 shell(S,NAV);
 const key=document.body.dataset.page;if(!key)return;
 document.body.classList.add("ul-page");
 const root=$("#ul-root");
 const T=key==="home"?S.site_name:(S[key+"_title"]||key)+" — "+S.site_name;document.title=T;
 if(key==="home"){root.innerHTML=await homePage(S,P,hl||DEF.highlights);fx();homeData()}
 else if(key==="team"){root.innerHTML=teamPage(S,team||DEF.team);fx()}
 else if(key==="support"){root.innerHTML=supportPage(S);wireSupport(S);fx()}
 else if(key==="contact"){root.innerHTML=contactPage(S);wireForm(S);fx()}
 else{root.innerHTML=textPage(key,S,P);fx()}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
