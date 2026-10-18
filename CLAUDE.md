# ZO OZ KOVO Sedita — web

Statický web na GitHub Pages (`index.html`, `assets/app.js`, `sw.js`). Dáta (aktuality, dokumenty,
schôdze, výbor, počet členov) ťahá z Google Apps Script API (`API_BASE` v `assets/app.js`);
keď API nie je dostupné, zobrazia sa DEMO dáta.

## Právne a faktické informácie — len z oficiálnych zdrojov

Zákony, sumy, lehoty a iné právne údaje (sekcia „Moje práva“, aktuality, dokumenty) overuj
**výhradne z oficiálnych zdrojov**:

- Slov-Lex — <https://www.slov-lex.sk> (konsolidované znenia zákonov, Zbierka zákonov)
- ministerstvá a štátne inštitúcie, napr. MPSVR SR <https://www.employment.gov.sk>,
  Sociálna poisťovňa <https://www.socpoist.sk>, Národný inšpektorát práce <https://www.ip.gov.sk>,
  Finančná správa <https://www.financnasprava.sk>, Ústredie práce <https://www.upsvr.gov.sk>

Komerčné weby, blogy, kalkulačky ani poradne nie sú zdrojom. Ak oficiálny zdroj nie je
dostupný, údaj nepublikuj a povedz to. Pri každej odpovedi uveď paragraf / predpis.

## Značka

Vizuálna identita podľa skillu `kovo-sedita-brand` (manuál v4.0): vždy plný názov
„ZO OZ KOVO Sedita“, žiadny žltý prúžok, logo ako „O“ v hero texte, Poppins + Rebok.

## Technické pravidlá

- **CSP** je v `<meta http-equiv="Content-Security-Policy">`. Inline skript v `<head>` (téma) je
  povolený cez sha256 — po jeho zmene hash prepočítaj. Ďalšie skripty patria do `assets/app.js`.
  Žiadne externé zdroje (fonty sú lokálne v `assets/fonts/`).
- Dáta z API vkladaj do HTML len cez `esc()` a odkazy cez `safeUrl()`.
- **Service worker** (`sw.js`): po zmene zoznamu `PRECACHE` alebo stratégie zvýš `VERZIA`.
- FAQ v sekcii „Moje práva“ a JSON-LD `FAQPage` v `<head>` upravuj spolu.
- Pred pushom over v prehliadači (Playwright): žiadne JS chyby, mobil 390 px bez horizontálneho
  scrollu, svetlý aj tmavý režim.
