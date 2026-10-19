/* =====================================================================
   KONFIGURÁCIA — napojenie na Google Apps Script
   ---------------------------------------------------------------------
   Web je statický; dáta ťahá z Apps Script Web App (doGet/doPost).
   1. V Apps Script nasaď Web App (Execute as: Me, Access: Anyone).
   2. URL vlož do API_BASE. Kým je prázdne, beží DEMO režim s mock dátami.
   Endpointy:
     GET  API_BASE?action=members   -> {count, history:[{m,c}...]}
     GET  API_BASE?action=news      -> [{cat,date,title,text,src,url,status}]
     GET  API_BASE?action=docs      -> [{cat,name,desc,type,url}]
     GET  API_BASE?action=board     -> [{name,role,phone,email}]
     GET  API_BASE?action=meetings  -> {next:{...}, past:[...]}
     POST API_BASE (JSON)           -> {action:'complaint', ...form}
===================================================================== */
const API_BASE = "https://script.google.com/macros/s/AKfycby3BGtH6l1hClf93U1OR7upCt_hKJpmm5YA0MXIeOmykf3tsvWqP5_15nzMXLYJj_MWxg/exec";

/* ---------- DEMO DÁTA (nahradia sa dátami z API) ---------- */
const DEMO = {
  members: { count: 86, history: [
    {m:"Júl",c:48},{m:"Aug",c:52},{m:"Sep",c:55},{m:"Okt",c:59},{m:"Nov",c:63},{m:"Dec",c:66},
    {m:"Jan",c:70},{m:"Feb",c:74},{m:"Mar",c:78},{m:"Apr",c:80},{m:"Máj",c:83},{m:"Jún",c:86}]},
  news: [
    {cat:"mzdy",date:"5. 6. 2026",title:"Minimálna mzda od 1. 1. 2027",text:"MPSVR zverejnilo mechanizmus výpočtu minimálnej mzdy na rok 2027. Týka sa všetkých zamestnancov v pracovnom pomere.",src:"MPSVR SR",url:"#",status:"navrh"},
    {cat:"legislativa",date:"28. 5. 2026",title:"Novela Zákonníka práce — pružné formy práce",text:"Účinnosť od 1. 9. 2026. Rozširuje právo zamestnanca požiadať o home office a kratší úväzok.",src:"Slov-Lex",url:"#",status:"platne"},
    {cat:"rodicia",date:"20. 5. 2026",title:"Zmeny v rodičovskom príspevku",text:"Sociálna poisťovňa informuje o nových sumách rodičovského príspevku. Platí pre rodičov detí do 3 rokov.",src:"Sociálna poisťovňa",url:"#",status:"platne"},
    {cat:"bozp",date:"12. 5. 2026",title:"Kontroly inšpekcie práce v potravinárstve",text:"Národný inšpektorát práce ohlásil zameranie kontrol na manipuláciu s bremenami a prácu v hluku.",src:"NIP",url:"#",status:"platne"},
    {cat:"odbory",date:"30. 4. 2026",title:"Dodatok č. 3 ku kolektívnej zmluve",text:"Dohoda o vymedzení vážnych prevádzkových dôvodov platí do 31. 12. 2025. Pripravuje sa predĺženie.",src:"ZO OZ KOVO Sedita",url:"#",status:"platne"},
    {cat:"mzdy",date:"18. 4. 2026",title:"Príplatky za víkend a noc — prehľad súm",text:"Aktuálne sumy mzdových zvýhodnení podľa § 122a–123 Zákonníka práce po poslednej valorizácii.",src:"MPSVR SR",url:"#",status:"platne"}
  ],
  docs: [
    {cat:"kz",name:"Kolektívna zmluva IDC 2025 – 2027",desc:"Úplné znenie platnej KZ",type:"PDF",url:"#"},
    {cat:"kz",name:"Dodatok č. 1 ku KZ 2025 – 2027",desc:"Účinnosť od 1. 2. 2025",type:"PDF",url:"#"},
    {cat:"kz",name:"Dodatok č. 3 — vážne prevádzkové dôvody",desc:"Platnosť do 31. 12. 2025",type:"PDF",url:"#"},
    {cat:"kz",name:"Pravidlá odmeňovania 2025 – 2027",desc:"Mzdové tabuľky a príplatky",type:"PDF",url:"#"},
    {cat:"prihlasky",name:"Prihláška za člena OZ KOVO",desc:"Vrátane GDPR súhlasu, trvalý príkaz",type:"PDF",url:"#"},
    {cat:"prihlasky",name:"Dohoda o zrážkach zo mzdy",desc:"§ 131 ods. 3 ZP — členské zo mzdy",type:"DOC",url:"#"},
    {cat:"tlaciva",name:"Odhláška z OZ KOVO",desc:"Ukončenie členstva",type:"DOC",url:"#"},
    {cat:"tlaciva",name:"Žiadosť o sociálnu výpomoc",desc:"Pre členov ZO",type:"DOC",url:"#"}
  ],
  meetings: {
    next: {
      date:"25. júna 2026",
      time:"15:00",
      place:"Zasadačka — budova výroby",
      agenda:"1. Správa predsedu o činnosti ZO\n2. Stav rokovaní o KZ 2025–2027\n3. Plán aktivít na 2. polrok 2026\n4. Rôzne — diskusia"
    },
    past: [
      {date:"22. 5. 2026", title:"Zápisnica — členská schôdza", minutesUrl:"#"},
      {date:"14. 3. 2026", title:"Zápisnica — výbor ZO", minutesUrl:"#"},
      {date:"20. 1. 2026", title:"Zápisnica — mimoriadna schôdza", minutesUrl:"#"}
    ]
  },
  board: [
    {name:"Rastislav Mišovič",role:"Predseda ZO",phone:"+421 911 322 559",email:"kovosedita@outlook.sk"}
  ]
};

/* ---------- Bezpečné vkladanie dát do HTML ---------- */
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Povoliť len http(s), mailto, tel a relatívne odkazy — blokuje javascript: URL
const safeUrl = u => { const s = String(u ?? "").trim(); return /^(https?:|mailto:|tel:|#|\/)/i.test(s) ? esc(s) : ""; };

/* ---------- Pomocné funkcie pre animácie ---------- */
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollAnim = window.CSS && CSS.supports("animation-timeline: view()");
// Spustí fn raz, keď je prvok aspoň čiastočne v zábere
function whenVisible(el, fn){
  if(!("IntersectionObserver" in window)) return fn();
  const ob = new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ ob.disconnect(); fn(); } },{threshold:.3});
  ob.observe(el);
}
// Plynulý prechod medzi stavmi (View Transitions), inak priama zmena
function transition(update){
  if(document.startViewTransition && !reducedMotion) document.startViewTransition(update);
  else update();
}

/* ---------- API vrstva (s fallbackom na DEMO) ---------- */
async function api(action){
  if(!API_BASE) return DEMO[action] ?? null;
  try{
    // credentials:'omit' zabraňuje posielaniu cookies → nutné pre CORS pri Apps Script redirecte
    const r = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`,{credentials:"omit",mode:"cors"});
    if(!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  }catch(e){ console.warn("[KOVO] API nedostupné ("+action+")", e.message||e); return DEMO[action] ?? null; }
}

/* ---------- Počet členov: count-up + SVG graf ---------- */
async function renderMembers(){
  const d = await api("members");
  const el = document.getElementById("memberCount");
  if(!d || typeof d.count !== "number" || !Array.isArray(d.history) || d.history.length < 2){
    el.textContent = d && d.count != null ? d.count : "—";
    return;
  }
  // Počítadlo sa spustí až keď je pás so štatistikou v zábere
  const target = d.count;
  whenVisible(el, ()=>{
    if(reducedMotion){ el.textContent = target; return; }
    const dur = 1600, t0 = performance.now();
    (function tick(t){
      const p = Math.min((t - t0)/dur, 1), e = 1 - Math.pow(1-p, 3);
      el.textContent = Math.round(target * e);
      if(p < 1) requestAnimationFrame(tick);
    })(t0);
  });
  // Čísla z API vynútiť ako čísla — do SVG sa nesmie dostať text
  const h = d.history.map(p=>({m:String(p.m), c:Number(p.c)||0})), first = h[0].c, last = h[h.length-1].c;
  document.getElementById("newMembers").textContent = "+" + (last - first);
  document.getElementById("growthPct").textContent = first > 0 ? Math.round((last-first)/first*100) + " %" : "—";

  const svg = document.getElementById("memberChart");
  const W = 600, H = 120, pad = 8;
  const min = Math.min(...h.map(p=>p.c)) - 4, max = Math.max(...h.map(p=>p.c)) + 4;
  const x = i => pad + i*(W-2*pad)/(h.length-1);
  const y = c => H - pad - (c-min)*(H-2*pad)/(max-min);
  let line = "", area = `M ${x(0)} ${H-pad} `;
  h.forEach((p,i)=>{ line += (i?"L":"M")+` ${x(i)} ${y(p.c)} `; area += `L ${x(i)} ${y(p.c)} `; });
  area += `L ${x(h.length-1)} ${H-pad} Z`;
  svg.innerHTML = `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4181A6" stop-opacity=".35"/>
      <stop offset="1" stop-color="#4181A6" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#g)"/>
    <path class="ln" d="${line}" fill="none" stroke="#4181A6" stroke-width="3" stroke-linecap="round">
      ${scrollAnim || reducedMotion ? "" : `<animate attributeName="stroke-dashoffset" from="1200" to="0" dur="1.8s" fill="freeze"/>`}
    </path>
    <circle cx="${x(h.length-1)}" cy="${y(last)}" r="5.5" fill="#1B395B"/>
    <circle cx="${x(h.length-1)}" cy="${y(last)}" r="10" fill="#4181A6" opacity=".25">
      ${reducedMotion ? "" : `<animate attributeName="r" values="8;14;8" dur="2.4s" repeatCount="3"/>`}
    </circle>
    <line class="hover-line" x1="0" x2="0" y1="${pad}" y2="${H-pad}" visibility="hidden"/>
    <circle class="hover-dot" r="6" visibility="hidden"/>`;
  if(!scrollAnim && !reducedMotion) svg.querySelector(".ln").setAttribute("stroke-dasharray","1200");
  svg.setAttribute("aria-label", "Vývoj počtu členov: " + h.map(p=>p.m+" "+p.c).join(", "));

  // Popis hodnoty pri prechode myšou / prstom
  const wrap = svg.parentElement;
  let tip = wrap.querySelector(".chart-tip");
  if(!tip){ tip = document.createElement("div"); tip.className = "chart-tip"; tip.hidden = true; wrap.appendChild(tip); }
  const hl = svg.querySelector(".hover-line"), hd = svg.querySelector(".hover-dot");
  function show(ev){
    const r = svg.getBoundingClientRect();
    const vx = (ev.clientX - r.left) / r.width * W;
    const i = Math.max(0, Math.min(h.length-1, Math.round((vx - pad) / ((W-2*pad)/(h.length-1)))));
    const px = x(i), py = y(h[i].c);
    hl.setAttribute("x1",px); hl.setAttribute("x2",px); hl.setAttribute("visibility","visible");
    hd.setAttribute("cx",px); hd.setAttribute("cy",py); hd.setAttribute("visibility","visible");
    tip.textContent = "";
    tip.append(h[i].m + ": ");
    const b = document.createElement("b"); b.textContent = h[i].c; tip.append(b, " členov");
    tip.style.left = (px / W * r.width) + "px";
    tip.style.top = (py / H * r.height) + "px";
    tip.hidden = false;
  }
  function hide(){ hl.setAttribute("visibility","hidden"); hd.setAttribute("visibility","hidden"); tip.hidden = true; }
  svg.onpointermove = show; svg.onpointerdown = show; svg.onpointerleave = hide;
}

/* ---------- Newsfilter ---------- */
let newsData = [];
function renderNews(cat="all"){
  const grid = document.getElementById("newsGrid");
  const items = newsData.filter(n => n && (cat==="all" || n.cat===cat));
  if(!items.length){
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px 0;opacity:.6;font-size:.9rem">Momentálne žiadne aktuality v tejto kategórii.</p>`;
    return;
  }
  grid.removeAttribute("aria-busy");
  // Najnovšia správa ako veľká karta; mená pre plynulý presun kariet pri filtrovaní
  grid.innerHTML = items.map((n,i) => `
    <article class="news-card${i===0 && items.length>2 ? " feature" : ""}" style="view-transition-name:nc-${newsData.indexOf(n)}">
      <div class="news-top">
        <span class="tag ${n.status==="platne"?"platne":"navrh"}">${n.status==="platne"?"Platí":"Navrhované"}</span>
        <span class="news-date">${esc(n.date)}</span>
      </div>
      <h3 class="news-title">${esc(n.title||"(bez názvu)")}</h3>
      <p class="news-body">${esc(n.text)}</p>
      ${n.src ? `<div class="news-src"><span class="dot"></span>${esc(n.src)}</div>` : ""}
      ${safeUrl(n.url) && n.url !== "#" ? `<a class="news-link" href="${safeUrl(n.url)}" target="_blank" rel="noopener">Viac info ↗</a>` : ""}
    </article>`).join("");
}

document.querySelectorAll(".chip[data-cat]").forEach(chip=>{
  chip.addEventListener("click",()=>{
    document.querySelectorAll(".chip[data-cat]").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    transition(()=>renderNews(chip.dataset.cat));
  });
});

/* ---------- Moje práva: vyhľadávanie v otázkach ---------- */
(function(){
  const input = document.getElementById("faqSearch");
  const items = [...document.querySelectorAll(".faq-item")];
  const empty = document.getElementById("faqEmpty");
  if(!input || !items.length) return;
  // Hľadanie bez ohľadu na diakritiku a veľkosť písmen
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const texts = items.map(d => norm(d.textContent));
  input.addEventListener("input", ()=>{
    const q = norm(input.value.trim());
    let shown = 0;
    items.forEach((d,i)=>{
      const hit = !q || texts[i].includes(q);
      d.hidden = !hit;
      if(hit) shown++;
    });
    if(empty) empty.hidden = shown > 0;
  });
})();

/* ---------- Dokumenty ---------- */
let docsData = [];
let docTab = "all";   // aktívna karta — prežije aj neskoršie načítanie dát z API
function renderDocs(tab=docTab){
  docTab = tab;
  const list = document.getElementById("docGrid");
  const items = docsData.filter(d => d && (tab==="all" || d.cat===tab));
  if(!items.length){
    list.innerHTML = `<p style="padding:32px 0;text-align:center;opacity:.6;font-size:.9rem">Momentálne žiadne dokumenty v tejto kategórii.</p>`;
    return;
  }
  list.removeAttribute("aria-busy");
  list.innerHTML = items.map(d=>`
    <div class="doc-row reveal" style="view-transition-name:dr-${docsData.indexOf(d)}">
      <div class="doc-ico">${esc(d.type||"PDF")}</div>
      <div class="doc-info">
        <b>${esc(d.name||"Dokument")}</b>
        <span>${esc(d.desc)}</span>
      </div>
      ${safeUrl(d.url) ? `<a class="btn btn-sm" href="${safeUrl(d.url)}" target="_blank" rel="noopener" aria-label="Stiahnuť ${esc(d.name||'dokument')}">Stiahnuť</a>` : ""}
    </div>`).join("");
  document.querySelectorAll("#dokumenty .reveal").forEach(el=>io.observe(el));
}

function selectDocTab(tab){
  document.querySelectorAll(".chip[data-doc]").forEach(b=>{
    const on = b.dataset.doc === tab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    // Na mobile je riadok kariet posuvný — aktívnu kartu posunúť do viditeľnej časti
    if(on){ const row = b.parentElement; row.scrollLeft = b.offsetLeft - (row.clientWidth - b.offsetWidth)/2; }
  });
  renderDocs(tab);
}
document.querySelectorAll(".chip[data-doc]").forEach(btn=>{
  btn.addEventListener("click",()=>transition(()=>selectDocTab(btn.dataset.doc)));
});
// Odkazy s data-doc-tab (napr. „Stiahnuť prihlášku“) prepnú kartu a nechajú prehliadač posunúť na #dokumenty
let dataReady = false, scrollDocsWhenReady = false;
document.querySelectorAll("[data-doc-tab]").forEach(a=>{
  a.addEventListener("click",()=>{
    selectDocTab(a.dataset.docTab);
    // Kým sa dáta nenačítajú, obsah nad dokumentmi ešte narastie — po načítaní posunúť znova
    if(!dataReady) scrollDocsWhenReady = true;
  });
});

/* ---------- Schôdze: odpočet a pozvánka do kalendára (.ics) ---------- */
let nextNextMeeting = null, nextMeetingDate = null;
function countdown(d){
  const today = new Date(); today.setHours(0,0,0,0);
  const day = new Date(d); day.setHours(0,0,0,0);
  const n = Math.round((day - today) / 864e5);
  if(n <= 0) return "Dnes";
  if(n === 1) return "Zajtra";
  if(n < 5) return "O " + n + " dni";
  return "O " + n + " dní";
}
function icsText(v){ return String(v ?? "").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/([,;])/g,"\\$1"); }
function downloadIcs(m, date){
  const pad = n => String(n).padStart(2,"0");
  const [hh, mm] = /^(\d{1,2}):(\d{2})/.test(m.time||"") ? m.time.split(":").map(Number) : [null,null];
  const ymd = `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  let start, end;
  if(hh === null){ // celodenná udalosť
    const nx = new Date(date); nx.setDate(nx.getDate()+1);
    start = `DTSTART;VALUE=DATE:${ymd}`;
    end = `DTEND;VALUE=DATE:${nx.getFullYear()}${pad(nx.getMonth()+1)}${pad(nx.getDate())}`;
  } else {          // miestny čas, 2 hodiny
    start = `DTSTART;TZID=Europe/Bratislava:${ymd}T${pad(hh)}${pad(mm)}00`;
    end = `DTEND;TZID=Europe/Bratislava:${ymd}T${pad(Math.min(hh+2,23))}${pad(mm)}00`;
  }
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ZO OZ KOVO Sedita//Web//SK","CALSCALE:GREGORIAN","BEGIN:VEVENT",
    `UID:${ymd}-${Math.random().toString(36).slice(2)}@kovo-sedita.github.io`, `DTSTAMP:${stamp}`, start, end,
    `SUMMARY:${icsText(m.title || "Schôdza ZO OZ KOVO Sedita")}`,
    m.place ? `LOCATION:${icsText(m.place)}` : "",
    m.agenda && m.agenda.length ? `DESCRIPTION:${icsText("Program:\n" + m.agenda.map((a,i)=>(i+1)+". "+a).join("\n"))}` : "",
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Schôdza ZO OZ KOVO Sedita","TRIGGER:-P1D","END:VALARM",
    "END:VEVENT","END:VCALENDAR"].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], {type:"text/calendar;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "schodza-zo-oz-kovo-sedita.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
document.addEventListener("click", e=>{
  if(e.target.closest("#calBtn") && nextNextMeeting) downloadIcs(nextNextMeeting, nextMeetingDate);
});

/* ---------- Schôdze ---------- */
function renderMeetings(data){
  const nextEl = document.getElementById("meetNext");
  const pastEl = document.getElementById("meetPast");
  if(!nextEl || !pastEl) return;
  nextNextMeeting = null;

  // API/DEMO môže vrátiť pole schôdzí alebo objekt {next, past}
  let list = Array.isArray(data) ? data
    : (data && typeof data === "object") ? [data.next, ...(Array.isArray(data.past) ? data.past : [])]
    : [];
  // Agenda môže prísť ako pole alebo ako text s položkami na riadkoch
  list = list.filter(m => m && m.date).map(m => ({...m,
    agenda: Array.isArray(m.agenda) ? m.agenda
      : typeof m.agenda === "string" ? m.agenda.split("\n").map(s=>s.replace(/^\s*\d+[.)]\s*/,"").trim()).filter(Boolean)
      : []}));

  // Dátum: ISO (2026-06-25) alebo slovenský zápis (25. 6. 2026 / 25. júna 2026)
  const SK_MONTHS = ["januára","februára","marca","apríla","mája","júna","júla","augusta","septembra","októbra","novembra","decembra"];
  function parseDate(v){
    if(v instanceof Date) return v;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
    if(m) return new Date(+m[3], +m[2]-1, +m[1]);
    m = s.match(/^(\d{1,2})\.\s*(\S+)\s+(\d{4})$/);
    if(m && SK_MONTHS.includes(m[2].toLowerCase())) return new Date(+m[3], SK_MONTHS.indexOf(m[2].toLowerCase()), +m[1]);
    return new Date(s);
  }
  const ts = m => { const t = parseDate(m.date).getTime(); return isNaN(t) ? 0 : t; };

  // Schôdza je „nadchádzajúca“ celý deň, kedy sa koná
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = list.filter(m => ts(m) >= today.getTime()).sort((a,b)=>ts(a)-ts(b));
  const past = list.filter(m => ts(m) < today.getTime()).sort((a,b)=>ts(b)-ts(a));

  function fmtDate(v){
    if(!v) return "";
    const d = parseDate(v);
    return esc(isNaN(d) ? v : d.toLocaleDateString("sk-SK",{day:"numeric",month:"long",year:"numeric"}));
  }

  if(!upcoming.length){
    nextEl.innerHTML = `<p style="opacity:.6;font-size:.9rem">Momentálne nie sú naplánované žiadne schôdze.</p>`;
  } else {
    const m = upcoming[0];
    nextNextMeeting = m; nextMeetingDate = parseDate(m.date);
    nextEl.innerHTML = `
      <div class="meet-card next-meet reveal">
        <div class="meet-badge">Najbližšia schôdza</div>
        <h3 class="meet-title">${esc(m.title||"Schôdza ZO OZ KOVO")}</h3>
        <div class="meet-meta">
          <span>📅 ${fmtDate(m.date)}${m.time?" · 🕐 "+esc(m.time):""}</span>
          ${m.place?`<span>📍 ${esc(m.place)}</span>`:""}
        </div>
        ${m.agenda.length?`<ul class="meet-agenda">${m.agenda.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>`:""}
        ${m.note?`<p class="meet-note">${esc(m.note)}</p>`:""}
        <div class="meet-actions">
          <span class="meet-count">${esc(countdown(parseDate(m.date)))}</span>
          <button class="btn btn-sm btn-cal" type="button" id="calBtn">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>
            Pridať do kalendára
          </button>
        </div>
      </div>
      ${upcoming.slice(1).map(u=>`
      <div class="meet-card reveal">
        <h3 class="meet-title">${esc(u.title||"Schôdza ZO OZ KOVO")}</h3>
        <div class="meet-meta"><span>📅 ${fmtDate(u.date)}${u.time?" · 🕐 "+esc(u.time):""}</span>${u.place?`<span>📍 ${esc(u.place)}</span>`:""}</div>
      </div>`).join("")}`;
  }

  if(!past.length){
    pastEl.innerHTML = `<p style="opacity:.6;font-size:.9rem">Zatiaľ žiadne záznamy z minulých schôdzí.</p>`;
  } else {
    pastEl.innerHTML = `<div class="past-meets-list">${past.map(m=>`
      <div class="past-meet-row reveal">
        <span class="past-meet-date">${fmtDate(m.date)}</span>
        <span class="past-meet-title">${esc(m.title||"Schôdza ZO OZ KOVO")}</span>
        ${safeUrl(m.minutesUrl)?`<a class="btn btn-sm" href="${safeUrl(m.minutesUrl)}" target="_blank" rel="noopener">Zápisnica</a>`:""}
      </div>`).join("")}</div>`;
  }

  document.querySelectorAll("#schodze .reveal").forEach(el=>io.observe(el));
}

/* ---------- Výbor ---------- */
function renderBoard(data){
  const grid = document.getElementById("boardGrid");
  if(!grid) return;
  if(!data||!data.length){
    grid.innerHTML = `<p style="text-align:center;padding:40px 0;opacity:.6;font-size:.9rem">Informácie o výbore sa načítavajú…</p>`;
    return;
  }
  grid.removeAttribute("aria-busy");
  grid.innerHTML = data.map(m=>`
    <div class="board-card reveal" role="article">
      <div class="avatar" aria-hidden="true">${esc((m.name||"?")[0].toUpperCase())}</div>
      <div class="board-line" aria-hidden="true"></div>
      <div class="board-info">
        <strong>${esc(m.name)}</strong>
        <span class="board-role">${esc(m.role)}</span>
        ${m.phone?`<a class="board-tel" href="tel:${esc(String(m.phone).replace(/[^\d+]/g,""))}" aria-label="Zavolať ${esc(m.name)}">${esc(m.phone)}</a>`:""}
        ${m.email?`<a class="board-mail" href="mailto:${esc(m.email)}">${esc(m.email)}</a>`:""}
      </div>
    </div>`).join("");
  document.querySelectorAll("#vybor .reveal").forEach(el=>io.observe(el));
}

/* ---------- Podnet / sťažnosť ---------- */
(function(){
  const form = document.getElementById("complaintForm");
  if(!form) return;
  const anonToggle = document.getElementById("anonToggle");
  const nameField  = document.getElementById("nameField");
  const mailField  = document.getElementById("mailField");

  if(anonToggle && nameField){
    anonToggle.addEventListener("change",()=>{
      const hidden = anonToggle.checked;
      nameField.style.display = hidden ? "none" : "";
      if(mailField) mailField.style.display = hidden ? "none" : "";
    });
  }

  // Počítadlo znakov, chybové hlásenia pri poli a priebežné ukladanie rozpísaného textu
  const DRAFT_KEY = "kovo-podnet-koncept";
  const msg = document.getElementById("cmsg"), msgField = msg.closest(".field");
  const counter = document.getElementById("cmsgCount");
  const msgErr = document.getElementById("cmsgErr"), formErr = document.getElementById("formErr");
  const cat = document.getElementById("ccat");
  function showErr(el, text){ if(!el) return; el.textContent = text; el.hidden = !text; }
  function updateCount(){
    const n = msg.value.length;
    counter.textContent = n + " / 5000";
    counter.classList.toggle("warn", n > 4500);
  }
  try{
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if(d && d.message && !msg.value){ msg.value = d.message; if(d.category) cat.value = d.category; }
  }catch(_){}
  updateCount();
  let saveT;
  function saveDraft(){
    clearTimeout(saveT);
    saveT = setTimeout(()=>{
      try{
        if(msg.value.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify({message:msg.value, category:cat.value}));
        else localStorage.removeItem(DRAFT_KEY);
      }catch(_){}
    }, 400);
  }
  msg.addEventListener("input", ()=>{
    updateCount(); saveDraft();
    if(msg.value.trim().length >= 10){ showErr(msgErr,""); msgField.classList.remove("invalid"); }
  });
  cat.addEventListener("change", saveDraft);
  // Vlastné hlásenie namiesto bublinky prehliadača
  msg.addEventListener("invalid", e=>{ e.preventDefault(); showErr(msgErr,"Prosím, opíšte podnet aspoň 10 znakmi."); msgField.classList.add("invalid"); });

  form.addEventListener("submit", async e=>{
    e.preventDefault();
    const honey = form.querySelector("#chpot");
    if(honey && honey.value){ return; }

    const btn = form.querySelector("button[type=submit]");
    const orig = btn ? btn.textContent : "";
    if(btn){ btn.disabled = true; btn.textContent = "Odosielam…"; }

    const anon = !!(anonToggle && anonToggle.checked);
    const payload = {
      action   : "complaint",
      name     : anon ? "" : (document.getElementById("cname")?.value?.trim() || ""),
      email    : anon ? "" : (document.getElementById("cmail")?.value?.trim() || ""),
      category : document.getElementById("ccat")?.value || "",
      message  : document.getElementById("cmsg")?.value?.trim() || "",
      anonymous: anon,
      website  : form.querySelector("#chpot")?.value || ""
    };

    payload.message = payload.message.slice(0,5000);
    showErr(formErr, "");
    if(!payload.message || payload.message.length < 10){
      showErr(msgErr, "Prosím, opíšte podnet aspoň 10 znakmi.");
      msgField.classList.add("invalid"); msg.focus();
      if(btn){ btn.disabled=false; btn.textContent=orig; } return;
    }
    try{
      const r = await fetch(API_BASE + "?action=complaint", {
        method : "POST",
        credentials: "omit",
        mode   : "cors",
        // text/plain = "simple request" bez CORS preflightu; Apps Script na OPTIONS neodpovedá
        // a s application/json by prehliadač požiadavku zablokoval. doPost číta e.postData.contents.
        headers: {"Content-Type":"text/plain;charset=utf-8"},
        body   : JSON.stringify(payload)
      });
      const res = await r.json();
      if(res.ok || res.status==="ok"){
        try{ localStorage.removeItem(DRAFT_KEY); }catch(_){}
        form.innerHTML = `<div class="form-done" role="status" tabindex="-1">
          <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/><path d="M26 41l10 10 18-20"/></svg>
          <h4>Podnet bol odoslaný</h4><p>Ďakujeme. Výbor ZO OZ KOVO Sedita sa mu bude venovať.</p></div>`;
        form.querySelector(".form-done").focus();
      } else {
        throw new Error(res.message||"Chyba servera");
      }
    }catch(err){
      if(btn){ btn.disabled = false; btn.textContent = orig; }
      showErr(formErr, "Podnet sa nepodarilo odoslať. Text zostal uložený — skúste to prosím o chvíľu znova.");
    }
  });
})();

/* ---------- Tmavý režim: prepínač ---------- */
(function(){
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  const mq = matchMedia("(prefers-color-scheme: dark)");
  function apply(theme){
    root.setAttribute("data-theme", theme);
    if(meta) meta.setAttribute("content", theme === "dark" ? "#0D1B2C" : "#AFD5EA");
    if(btn){
      btn.setAttribute("aria-label", theme === "dark" ? "Prepnúť na svetlý režim" : "Prepnúť na tmavý režim");
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  }
  apply(root.getAttribute("data-theme") || "light");
  if(btn) btn.addEventListener("click", ()=>{
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try{ localStorage.setItem("theme", next); }catch(e){}
    if(!document.startViewTransition || reducedMotion){ apply(next); return; }
    const r = btn.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
    const rad = Math.hypot(Math.max(cx, innerWidth-cx), Math.max(cy, innerHeight-cy));
    root.classList.add("theme-vt");
    const vt = document.startViewTransition(()=>apply(next));
    vt.ready.then(()=>root.animate(
      {clipPath:[`circle(0px at ${cx}px ${cy}px)`, `circle(${rad}px at ${cx}px ${cy}px)`]},
      {duration:520, easing:"cubic-bezier(.4,0,.2,1)", pseudoElement:"::view-transition-new(root)"}));
    vt.finished.finally(()=>root.classList.remove("theme-vt"));
  });
  // Kým si používateľ nevyberie sám, sledujeme nastavenie systému
  mq.addEventListener("change", e=>{
    let saved; try{ saved = localStorage.getItem("theme"); }catch(_){}
    if(!saved) apply(e.matches ? "dark" : "light");
  });
})();

/* ---------- Mobilný burger ---------- */
(function(){
  const burger = document.getElementById("burger");
  const nav    = document.querySelector(".nav-links");
  if(!burger || !nav) return;
  burger.addEventListener("click",()=>{
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach(a=>{
    a.addEventListener("click",()=>{
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded","false");
    });
  });
})();

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

/* ===== 2026 — Scroll progress, nav shadow, back-to-top ===== */
(function(){
  const prog = document.getElementById("scrollProgress");
  const navEl = document.querySelector("nav");
  const btn   = document.getElementById("backToTop");
  function onScroll(){
    const max = document.body.scrollHeight - window.innerHeight;
    if(prog) prog.style.width = (max > 0 ? Math.min(window.scrollY / max * 100, 100) : 0) + "%";
    if(navEl) navEl.classList.toggle("scrolled", window.scrollY > 40);
    if(btn)   btn.classList.toggle("visible",    window.scrollY > 500);
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  if(btn) btn.addEventListener("click", ()=> window.scrollTo({top:0, behavior:"smooth"}));
  onScroll();
})();

/* ===== 3D Tilt na board kartách ===== */
(function(){
  function initTilt(){
    document.querySelectorAll(".board-card").forEach(card=>{
      if(card._t) return; card._t = true;
      card.addEventListener("mousemove", e=>{
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left  - r.width/2)  / r.width;
        const y = (e.clientY - r.top   - r.height/2) / r.height;
        card.style.transform = `perspective(700px) rotateY(${x*6}deg) rotateX(${-y*4}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", ()=>{ card.style.transform = ""; });
    });
  }
  const bg = document.getElementById("boardGrid");
  if(bg) new MutationObserver(initTilt).observe(bg, {childList:true});
})();

/* ===== Hairline draw-in animácia pri scrolle ===== */
(function(){
  const ho = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add("drawn"); ho.unobserve(e.target); }
  }), {threshold:.4});
  document.querySelectorAll(".hairline").forEach(h=> ho.observe(h));
})();

/* ===== 2026 — Hero tagline stagger reveal ===== */
(function(){
  const tagline = document.querySelector(".hero-tagline");
  if(!tagline) return;
  // Animate SP/LU text spans + subtitle + org lines individually
  // Cookie (.ht-logo) uses pure CSS cookiePop animation
  const textParts = tagline.querySelectorAll(".ht-text,.ht-sub,.ht-wm");
  textParts.forEach((el,i)=>{
    el.style.opacity="0";
    el.style.transform="translateY(22px)";
    el.style.transition="opacity .65s "+(.05+i*.11)+"s cubic-bezier(.23,1,.32,1),transform .65s "+(.05+i*.11)+"s cubic-bezier(.23,1,.32,1)";
    setTimeout(()=>{ el.style.opacity="1"; el.style.transform="none"; }, 60 + i*110);
  });
  // Lead + eyebrow subtle fade
  const lead = document.querySelector(".hero p.lead");
  if(lead){ lead.style.opacity="0"; lead.style.transition="opacity .8s .6s ease"; setTimeout(()=>{ lead.style.opacity="1"; },700); }
})();

/* ===== 2026 — Chip spring reset (re-trigger animation) ===== */
document.querySelectorAll(".chip[data-cat]").forEach(chip=>{
  chip.addEventListener("click",()=>{
    chip.style.animation = "none";
    chip.offsetHeight; // reflow
    chip.style.animation = "";
  });
});

/* ---------- Init ---------- */
async function init(){
  renderMembers();
  const [meetData, newsRaw, docsRaw, boardRaw] = await Promise.all([
    api("meetings"),
    api("news"),
    api("docs"),
    api("board")
  ]);
  // API môže pri chybe vrátiť objekt (napr. {error:"…"}) namiesto zoznamu
  const list = (v, fallback) => Array.isArray(v) ? v : fallback;
  newsData = list(newsRaw, DEMO.news);
  renderNews("all");
  docsData = list(docsRaw, DEMO.docs);
  renderDocs();
  renderMeetings(meetData && typeof meetData === "object" ? meetData : DEMO.meetings);
  renderBoard(list(boardRaw, DEMO.board));
  dataReady = true;
  if(scrollDocsWhenReady) document.getElementById("dokumenty").scrollIntoView({behavior:"smooth"});
}
init();

/* ---------- Inštalácia na plochu (PWA) ---------- */
(function(){
  // Service worker funguje len cez https alebo localhost
  if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register("sw.js").catch(e=>console.warn("[KOVO] Service worker sa nepodarilo zaregistrovať", e));
    });
  }
  const box = document.getElementById("installApp");
  const btn = document.getElementById("installBtn");
  const ios = document.getElementById("installIos");
  if(!box) return;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if(standalone) return;                       // už beží ako aplikácia

  // Android / Chrome / Edge: vlastné tlačidlo namiesto systémovej lišty
  let deferred = null;
  window.addEventListener("beforeinstallprompt", e=>{
    e.preventDefault();
    deferred = e;
    box.hidden = false; btn.hidden = false;
  });
  btn.addEventListener("click", async ()=>{
    if(!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    box.hidden = true;
  });
  window.addEventListener("appinstalled", ()=>{ box.hidden = true; });

  // iPhone/iPad: Safari nemá tlačidlo inštalácie, zobrazíme návod
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if(isIos){ box.hidden = false; ios.hidden = false; }
})();

/* ---------- Aktuálna sekcia v menu a v spodnej lište ---------- */
(function(){
  const links = [...document.querySelectorAll("a[data-sec]")];
  const ids = [...new Set(links.map(a=>a.dataset.sec))];
  // Poradie podľa polohy na stránke, nie podľa poradia odkazov
  const secs = ids.map(id=>document.getElementById(id)).filter(Boolean)
    .sort((x,y)=>x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  if(!secs.length) return;
  function mark(id){
    links.forEach(a=>{
      const on = a.dataset.sec === id;
      a.classList.toggle("is-current", on);
      if(on) a.setAttribute("aria-current","location"); else a.removeAttribute("aria-current");
    });
  }
  // Aktuálna je posledná sekcia, ktorej začiatok prešiel pod navigáciu (+ rezerva),
  // takže po kliknutí na odkaz sa zvýrazní práve otvorená sekcia aj keď je krátka
  let ticking = false;
  function update(){
    ticking = false;
    const line = Math.min(innerHeight * .4, 160);
    let cur = null;
    secs.forEach(sec=>{ if(sec.getBoundingClientRect().top <= line) cur = sec.id; });
    // Pod poslednou sledovanou sekciou (pätička) nič nezvýrazňujeme
    const last = secs[secs.length-1];
    if(cur === last.id && last.getBoundingClientRect().bottom < line) cur = null;
    mark(cur);
  }
  addEventListener("scroll", ()=>{ if(!ticking){ ticking = true; requestAnimationFrame(update); } }, {passive:true});
  addEventListener("resize", update);
  update();
})();

/* ---------- Moje práva: odkaz na konkrétnu otázku ---------- */
(function(){
  function openFromHash(){
    const id = location.hash.slice(1);
    if(!/^pravo-\d+$/.test(id)) return;
    const d = document.getElementById(id);
    if(!d) return;
    d.open = true;
    d.classList.remove("flash"); void d.offsetWidth; d.classList.add("flash");
    d.scrollIntoView({block:"center", behavior: reducedMotion ? "auto" : "smooth"});
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
  document.addEventListener("click", async e=>{
    const b = e.target.closest(".faq-copy");
    if(!b) return;
    const id = b.closest(".faq-item").id;
    const url = location.origin + location.pathname + "#" + id;
    let ok = false;
    try{ await navigator.clipboard.writeText(url); ok = true; }catch(_){}
    if(!ok && navigator.share){ try{ await navigator.share({url}); ok = true; }catch(_){} }
    if(!ok) history.replaceState(null, "", "#" + id);
    b.textContent = ok ? "Skopírované ✓" : "Odkaz je v adrese";
    setTimeout(()=>{ b.textContent = "Kopírovať odkaz"; }, 2000);
  });
})();
