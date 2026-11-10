/* Service worker ZO OZ KOVO Sedita — offline režim a rýchle opakované načítanie.
   Pri zmene zoznamu PRECACHE alebo stratégie zvýš VERZIA, staré cache sa zmažú. */
const VERZIA = "kovo-v4";
const STATIC = VERZIA + "-static";
const DATA = VERZIA + "-data";

const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/app.js",
  "assets/fonts.css",
  "assets/rebak-sk.woff2",
  "assets/logo-hero.webp",
  "assets/logo-160.webp",
  "assets/favicon-48.png",
  "assets/icon-192.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERZIA)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Dáta z Google Apps Script: najprv sieť, offline posledná uložená verzia
const jeApi = url => url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com";

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;          // podnety (POST) idú vždy priamo na server
  const url = new URL(req.url);

  if (jeApi(url)) {
    e.respondWith(networkFirst(req, DATA));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Stránka: vždy najnovšia zo siete, offline z cache
  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, STATIC, "index.html"));
    return;
  }
  // Statické súbory: okamžite z cache, na pozadí aktualizovať
  e.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req, cacheName, fallbackUrl){
  const cache = await caches.open(cacheName);
  // Stránku ukladať pod adresou bez ?parametrov (jedna kópia, nie jedna na každý odkaz)
  let key = req;
  if (req.mode === "navigate") { const u = new URL(req.url); u.search = ""; u.hash = ""; key = u.href; }
  try{
    const res = await fetch(req);
    // Dáta z API ukladať len ako JSON; pri stránke len riadnu odpoveď z vlastnej domény
    const typ = res.headers.get("content-type") || "";
    const ok = cacheName === DATA ? typ.includes("json") : (res.type === "basic" && !res.redirected);
    if (res.ok && ok) cache.put(key, res.clone());
    return res;
  }catch(err){
    const hit = await cache.match(key) || (fallbackUrl && await caches.match(fallbackUrl));
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req){
  const cache = await caches.open(STATIC);
  // Kľúčom je adresa bez ?parametrov — inak by sa cache dala zaplniť náhodnými ?x=1, ?x=2…
  const key = new URL(req.url); key.search = "";
  const hit = await cache.match(key.href);
  const update = fetch(req).then(res => {
    // Ukladať len riadne odpovede z vlastnej domény (nie presmerovania ani chybové stránky)
    if (res.ok && res.type === "basic" && !res.redirected) cache.put(key.href, res.clone());
    return res;
  }).catch(() => hit);
  return hit || update;
}
