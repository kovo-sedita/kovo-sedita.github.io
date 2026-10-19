/* Service worker ZO OZ KOVO Sedita — offline režim a rýchle opakované načítanie.
   Pri zmene zoznamu PRECACHE alebo stratégie zvýš VERZIA, staré cache sa zmažú. */
const VERZIA = "kovo-v2";
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
  try{
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  }catch(err){
    const hit = await cache.match(req, {ignoreSearch: req.mode === "navigate"}) || (fallbackUrl && await caches.match(fallbackUrl));
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req){
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || update;
}
