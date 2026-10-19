# Anonymný dotazník — zápis do tabuľky (Google Apps Script)

Web posiela príspevky z dotazníka na rovnakú adresu ako doteraz (`API_BASE`, akcia `complaint`),
takže **funguje aj bez zmeny Apps Scriptu**: typ príspevku je v stĺpci kategórie a naliehavosť
s kódom na konci textu. Aby každá informácia mala vlastný stĺpec (lepšie filtrovanie a štatistiky),
doplň do Apps Scriptu kód nižšie.

## Čo web posiela (JSON v tele POST požiadavky)

| pole | príklad | poznámka |
|---|---|---|
| `action` | `complaint` | ako doteraz |
| `source` | `dotaznik` | odlíši dotazník |
| `typ` | `Otázka` / `Podnet` / `Sťažnosť` / `Nedostatok BOZP` / `Návrh na zlepšenie` | |
| `tema` | `BOZP — bezpečnosť a ochrana zdravia` | jedna z 10 tém |
| `naliehavost` | `Bežné` / `Dôležité` / `Hrozí úraz / škoda` | |
| `kod` | `K7Q4M2` | anonymný kód, ktorý člen dostane po odoslaní |
| `text` | samotný popis | max. 5000 znakov |
| `category`, `message`, `name`, `email`, `anonymous`, `website` | | kvôli spätnej kompatibilite; `name` a `email` sú vždy prázdne, `website` je ochrana proti robotom |

## Kód pre Apps Script

Do existujúcej funkcie `doPost(e)` pridaj na začiatok vetvu pre dotazník:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");

  if (data.action === "complaint" && data.source === "dotaznik") {
    return ulozDotaznik_(data);
  }
  // … pôvodný kód pre ostatné akcie …
}

function ulozDotaznik_(d) {
  // Robot vyplnil skryté pole → tváriť sa ako úspech, nič neukladať
  if (d.website) return json_({ ok: true });

  const text = String(d.text || "").trim().slice(0, 5000);
  if (text.length < 10) return json_({ ok: false, message: "Príliš krátky text" });

  // Jednoduchá ochrana proti zahlteniu: max. 30 príspevkov za 10 minút
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get("dotaznik-pocet") || 0);
  if (n >= 30) return json_({ ok: false, message: "Skúste to prosím o chvíľu" });
  cache.put("dotaznik-pocet", String(n + 1), 600);

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Dotazník") || ss.insertSheet("Dotazník");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["Dátum", "Kód", "Typ", "Téma", "Naliehavosť", "Text", "Stav", "Poznámka výboru"]);
    sh.setFrozenRows(1);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sh.appendRow([
      new Date(),
      bezpecne_(d.kod).slice(0, 12),
      bezpecne_(d.typ).slice(0, 40),
      bezpecne_(d.tema).slice(0, 80),
      bezpecne_(d.naliehavost).slice(0, 40),
      bezpecne_(text),
      "Nové",
      ""
    ]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// Text začínajúci =, +, -, @ by tabuľka vykonala ako vzorec → pridať apostrof
function bezpecne_(v) {
  const s = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
```

Po úprave: **Nasadiť → Spravovať nasadenia → upraviť existujúce nasadenie → Nová verzia**.
URL sa nezmení, web netreba meniť.

## Anonymita — čo platí a čo nie

- Apps Script **nevidí IP adresu** odosielateľa ani údaje o zariadení; ukladajú sa len polia vyššie.
- Kód príspevku je náhodný a neodvoditeľný od človeka.
- Tabuľku zdieľaj **len s členmi výboru**. História úprav v Google Sheets ukazuje, kto z výboru
  čo menil — nie kto príspevok poslal.
- Do textu môže človek napísať niečo, čo ho prezradí — formulár na to upozorňuje.

## Excel

Tabuľku otvoríš v Exceli cez **Súbor → Stiahnuť → Microsoft Excel (.xlsx)**. Ak má výbor radšej
priebežne aktualizovaný Excel, dá sa namiesto Google Sheets použiť Microsoft Forms + Excel Online,
ale potom by formulár bol na stránke Microsoftu a nie priamo na webe.

## Stav riešenia

Stĺpce **Stav** (Nové / Rieši sa / Vyriešené) a **Poznámka výboru** vypĺňa výbor. Odpovede na časté
otázky odporúčame zverejniť v sekcii „Moje práva“ alebo v aktualitách (s uvedením kódu, nie mena).
