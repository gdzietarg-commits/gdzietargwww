# 🥕 GdzieTarg.pl

**Świeżo. Lokalnie. Wiesz gdzie i kiedy.** Agregator lokalnych targowisk — aktualne dni
i godziny handlu, zaczynając od zachodnich okolic Warszawy (Pruszków, Piastów, Stare Babice
i okolice).

Projekt zaprojektowany tak, aby **żył własnym życiem** i dał się w całości obsługiwać
**z telefonu** (aplikacja GitHub) — albo wcale, gdy właściciel jest offline.

| Co | Gdzie |
|---|---|
| 📊 Dzienny dashboard (ruch + stan bazy) | [`docs/DASHBOARD.md`](docs/DASHBOARD.md) |
| 🎯 Analiza grupy docelowej, UX, strategia | [`docs/ANALIZA.md`](docs/ANALIZA.md) |
| 🤖 Zadanie dzienne agenta | [`prompts/daily-update.md`](prompts/daily-update.md) |
| 🗃️ Baza targowisk (edytowalna z telefonu) | [`data/markets.json`](data/markets.json) |

## Jak to działa (architektura „zero opieki")

1. **Dane**: `data/markets.json` — jedno źródło prawdy.
2. **Strona**: `node build.mjs` generuje czysty statyczny HTML (SEO: osobna podstrona
   dla każdego miasta i targowiska, sitemap, JSON-LD). Zero frameworków, zero zależności npm.
3. **Hosting**: GitHub Pages — każdy push na `main` publikuje stronę automatycznie.
4. **Agent dzienny (04:15 UTC)**: Claude czyta `prompts/daily-update.md`, obsługuje
   zgłoszenia społeczności (Issues z etykietą `dane`), weryfikuje najstarsze wpisy w
   publicznych źródłach i commituje poprawki.
5. **Dashboard (04:45 UTC)**: automat pobiera statystyki z GoatCounter i zapisuje raport
   do `docs/DASHBOARD.md` — w tym CTR „Przycisku-Widmo" (walidacja Eko-Weryfikacji).
6. **Newsletter / zbieranie e-maili**: formularze na stronie POST-ują na endpoint
   z `data/config.json` (`newsletterAction`), a każde kliknięcie i zapis liczone są
   jako zdarzenie w GoatCounter — nawet zanim endpoint zostanie skonfigurowany.

## ✅ Checklista uruchomienia (raz, ~20 minut, da się z telefonu)

1. **Zmerguj tę gałąź do `main`** (zakładka Pull requests).
2. **Włącz GitHub Pages**: Settings → Pages → Source: **GitHub Actions**.
3. **Uruchom deploy**: Actions → „Build & Deploy" → Run workflow. Strona wstanie pod
   `https://gdzietarg-commits.github.io/gdzietargwww`.
4. **Analityka**: załóż darmowe konto na [goatcounter.com](https://www.goatcounter.com)
   z kodem `gdzietarg` (musi się zgadzać z `data/config.json` → `goatcounter`).
   Potem: GoatCounter → Settings → API → nowy token → dodaj w repo sekret
   `GOATCOUNTER_TOKEN` (Settings → Secrets and variables → Actions).
5. **Agent dzienny**: dodaj sekret `ANTHROPIC_API_KEY`
   ([console.anthropic.com](https://console.anthropic.com) → API keys). Bez klucza
   workflow po prostu się pomija — nic się nie psuje.
6. **Newsletter (opcjonalnie)**: załóż konto [Buttondown](https://buttondown.com)
   (darmowe do 100 subskrybentów, obsługa z telefonu) i wpisz w `data/config.json`:
   `"newsletterAction": "https://buttondown.com/api/emails/embed-subscribe/TWOJA-NAZWA"`.
   Alternatywa: [Formspree](https://formspree.io) (endpoint formularza).
7. **Domena `gdzietarg.pl` (później)**: kup domenę, w DNS ustaw CNAME na
   `gdzietarg-commits.github.io`, w Settings → Pages wpisz custom domain,
   zmień `siteUrl` w `data/config.json`.
8. **Nagrywanie sesji (opcjonalnie)**: Microsoft Clarity — darmowe; skrypt można dodać
   w `build.mjs` obok GoatCountera.

## 📱 Codzienna obsługa z telefonu (aplikacja GitHub)

- **Sprawdzić jak idzie** → otwórz `docs/DASHBOARD.md` (odświeżany codziennie rano).
- **Poprawić/dodać targ** → edytuj `data/markets.json` bezpośrednio w aplikacji,
  commit na `main` — strona przebuduje się sama.
- **Zgłoszenia od ludzi** → zakładka Issues (etykieta `dane`); agent obsługuje je sam,
  ale możesz dopisać komentarz.
- **Wymusić przebieg automatu** → Actions → wybierz workflow → Run workflow.
- **Brak internetu przez tydzień?** Nic nie trzeba robić — agent aktualizuje dane,
  dashboard się odświeża, strona działa.

## 🧪 Praca lokalna (gdy kiedyś wrócisz do laptopa)

```bash
node build.mjs          # buduje stronę do dist/
npx serve dist          # podgląd lokalny (albo dowolny serwer statyczny)
node scripts/update-dashboard.mjs   # regeneruje dashboard
```

## Model biznesowy (skrót — pełna wersja w docs/ANALIZA.md)

Faza 1 (teraz): walidacja popytu — SEO na frazy „targ [miasto] [dzień]" + pomiar CTR
przycisku „Raport Eko-Weryfikacji" i zapisów e-mail.
Faza 2 (po >100 e-mailach): audyty Eko-Weryfikacji + profile premium sprzedawców
(abonament, walidacja cenowa: Ogrosa 29–59 zł/mies.) + partnerstwa regionalne (np. Bronisze).
