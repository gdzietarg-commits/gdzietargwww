# GdzieTarg.pl — instrukcje dla agentów Claude

Agregator lokalnych targowisk (dni i godziny handlu), region: zachodnie okolice Warszawy.
Strona statyczna generowana z JSON, hostowana na GitHub Pages, zasilana codziennie przez agenta AI.

## Komendy
- `node build.mjs` — buduje stronę do `dist/` (zero zależności, nie ma `npm install`)
- `node scripts/update-dashboard.mjs` — regeneruje `docs/DASHBOARD.md`

## Struktura
- `data/markets.json` — **jedyne źródło prawdy o targowiskach**; edytują je agenci i właściciel
- `data/config.json` — konfiguracja (URL, GoatCounter, endpoint newslettera)
- `build.mjs` — generator stron (index + strona per miasto + per targ + sitemap)
- `assets/` — CSS i JS frontendu
- `prompts/` — zadania dla agentów (dzienny cykl)
- `docs/ANALIZA.md` — analiza grupy docelowej i strategii (uzasadnienia decyzji designu)
- `docs/DASHBOARD.md` — generowany automatycznie, NIE edytować ręcznie
- `.github/workflows/` — deploy (push na main), daily-agent (04:15 UTC), dashboard (04:45 UTC)

## Schemat rekordu targowiska (`data/markets.json`)
```json
{
  "id": "slug-bez-polskich-znakow",
  "name": "Pełna nazwa targowiska",
  "city": "Miasto",
  "address": "ulica i numer lub 'do ustalenia'",
  "website": "https://oficjalna-strona-targu-lub-zarzadcy.pl lub pusty string",
  "days": ["pn","wt","sr","cz","pt","so","nd"],
  "hours": "6:00–13:00 lub pusty string",
  "verified": true,
  "source": "skąd pochodzą dane",
  "note": "uwagi widoczne dla użytkownika",
  "updated": "YYYY-MM-DD",
  "lat": 52.170,
  "lng": 20.812
}
```
`lat`/`lng` są **opcjonalne** (dziesiętne, w granicach Polski) — dokładne współrzędne targu na mapie.
Bez nich mapa używa centrum miasta (`data/geo-cities.json`). Podawaj oba albo żadne.
Klucze dni: `pn wt sr cz pt so nd` (bez polskich znaków!).

## Zasady
- Treści strony po polsku; komunikacja z właścicielem po polsku.
- W codziennym cyklu agent zmienia wyłącznie `data/markets.json` (patrz `prompts/daily-update.md`).
- Nie wpisywać niepotwierdzonych danych — `verified: false` + notatka zamiast zgadywania.
- Nie usuwać targowisk; zamknięte oznaczać `days: []` + `note`.
- Po każdej zmianie danych: `node build.mjs` musi przejść bez błędu.
- Design i UX zmieniać tylko na wyraźne polecenie właściciela (uzasadnienia w `docs/ANALIZA.md`).
