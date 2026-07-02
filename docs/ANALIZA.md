# GdzieTarg.pl — Analiza grupy docelowej, UX i strategii MVP

> Dokument roboczy. Aktualizacja: 2026-07-02.
> Uzupełnia dokumentację projektową (analiza konkurencji, ryzyka, monetyzacja) o **diagnozę grupy docelowej** i wynikające z niej decyzje projektowe dla strony.

---

## 1. Grupa docelowa — trzy persony

Ruch na GdzieTarg.pl będzie pochodził z dwóch źródeł: **Google (long-tail SEO)** i **lokalnych grup na Facebooku**. Oba źródła są w ~85% mobilne. To definiuje wszystko poniżej.

### Persona 1 — „Zosia Zaradna" (rdzeń ruchu, ~60%)
- **Kto:** kobieta 35–55, Pruszków / Piastów / okolice, robi zakupy dla rodziny 2–3 razy w tygodniu.
- **Skąd przychodzi:** grupy FB typu „Pruszków — ogłoszenia", Google „targ Pruszków godziny".
- **Potrzeba:** *„Czy jutro jest targ i do której?"* — odpowiedź w 5 sekund, bez klikania.
- **Sprzęt:** średniej klasy Android, często słaby zasięg na placu targowym.
- **Co ją zniechęci:** wolna strona, pop-upy, konieczność rejestracji, „apka do pobrania".

### Persona 2 — „Eko-Michał" (motor monetyzacji, ~25%)
- **Kto:** 28–40, miejski profesjonalista, świadomy żywieniowo, płaci premium za autentyczność.
- **Potrzeba:** pewność, że „jajka od pana Janka" naprawdę są od kur z wybiegu. **To on klika „Raport Eko-Weryfikacji" i zostawia e-mail.**
- **Co go przekona:** estetyka premium-craft, transparentność źródeł danych, storytelling o rolnikach.
- **Rola w modelu:** walidacja Przycisku-Widmo, pierwsi subskrybenci newslettera, przyszli klienci funkcji premium.

### Persona 3 — „Pan Stanisław" (ruch SEO, ~15%)
- **Kto:** 60+, tradycyjny klient targowisk, wpisuje w Google całe zdania.
- **Potrzeba:** godziny i adres, dużą czcionką, bez ozdobników.
- **Co go wyklucza:** niski kontrast, małe litery, animacje, treść ukryta za interakcjami.

### Kogo świadomie NIE obsługujemy w MVP
- Rolników/sprzedawców (panel wystawcy = faza 2, po walidacji popytu).
- Zamawiających online (to teren Ogrosy — nie konkurujemy tam).
- Całej Polski (start: powiat pruszkowski, grodziski, warszawski zachodni + Ursus/Bemowo).

---

## 2. Wnioski projektowe (design + UX)

| Wniosek z person | Decyzja projektowa |
|---|---|
| 85% ruchu mobile, słaby zasięg | Strona statyczna, zero frameworków JS, LCP < 1,5 s, działa z cache |
| „Odpowiedź w 5 sekund" | Dzień tygodnia to **główny element UI** — kafelki Pn–Nd nad listą, badge „Dziś otwarte" |
| Pan Stanisław | Kontrast WCAG AA+, bazowa czcionka 18 px, treść widoczna bez scrolla |
| Eko-Michał | Paleta leśna zieleń + biel + akcent rzemieślniczy (bursztyn), przycisk Eko-Weryfikacji wyróżniony szmaragdem |
| Zosia nie chce apki | Web bez logowania; „dodaj do ekranu głównego" zamiast aplikacji |
| Zaufanie = waluta | Każdy targ ma widoczny status: ✅ zweryfikowane + data / ⚠ do potwierdzenia |
| Crowdsourcing od dnia 1 | Link „Zgłoś poprawkę" przy każdym targu (→ GitHub Issue, obsługiwane przez agenta) |
| Brak banera cookies | GoatCounter (analityka bezciasteczkowa) zamiast Google Analytics |

**Paleta:** tło złamana biel `#FAF8F4`, tekst `#1F2421`, zieleń leśna `#1B4332` / `#2D6A4F`, szmaragd akcji `#0E8A5F`, bursztyn rzemieślniczy `#B4762B`.

**Typografia:** systemowy stack (zero webfontów = zero opóźnień), 18 px baza, nagłówki ciężkie.

---

## 3. Pozycjonowanie i SEO

Nisza (potwierdzona analizą konkurencji): **miejsce i czas handlu**, nie miejsce produkcji.

Frazy docelowe (long-tail, niska konkurencja, wysoka intencja):
- „targ Pruszków sobota", „targowisko Piastów godziny otwarcia"
- „bazarek Stare Babice", „gdzie kupić warzywa Pruszków"

Realizacja: osobna statyczna podstrona dla **każdego miasta** i **każdego targowiska** z danymi strukturalnymi JSON-LD (schema.org), sitemap.xml, opisowe tytuły. Strony generuje automat — dodanie targu do bazy tworzy podstronę bez pracy ręcznej.

---

## 4. Walidacja popytu — co mierzymy

| Metryka | Narzędzie | Próg sukcesu (8 tyg.) |
|---|---|---|
| Odwiedziny organiczne | GoatCounter | trend wzrostowy tydz./tydz. |
| CTR „Raport Eko-Weryfikacji" | GoatCounter (event `eko/*`) | > 8% odwiedzających klika |
| Zapisy e-mail (Przycisk-Widmo + newsletter) | Buttondown / Formspree | > 100 adresów |
| Powroty (retencja) | GoatCounter | > 20% powracających |
| Zgłoszenia poprawek od społeczności | GitHub Issues | > 5/mies. = działa crowdsourcing |

Interpretacja: wysoki CTR Eko → inwestuj w audyty. Niski CTR, ale dobra retencja → produktem jest sama wyszukiwarka godzin; monetyzuj przez profile premium sprzedawców (walidacja cenowa: Ogrosa, 29–59 zł/mies.).

---

## 5. Ryzyka (skrót) i mitygacje wbudowane w MVP

1. **Dezaktualizacja danych** → codzienny agent AI weryfikuje najstarsze wpisy; statusy „do potwierdzenia" widoczne dla użytkownika; crowdsourcing przez „Zgłoś poprawkę".
2. **Kurczak i jajko** → start od 12+ targowisk zebranych z danych publicznych (BIP, strony gmin, OSM), zanim pojawi się pierwszy użytkownik.
3. **Pułapka AdSense** → brak reklam w MVP; walidacja Freemium przez Przycisk-Widmo.
4. **Koszt audytów** → audyt fizyczny dopiero po potwierdzeniu popytu (próg: 100 e-maili).
5. **Właściciel bez laptopa** → cała operacja przez GitHub (aplikacja mobilna) + automaty; patrz `README.md`.

---

## 6. Model operacyjny „projekt żyje sam"

```
        ┌─────────────────────────────────────────────┐
        │  GitHub Actions (harmonogram, codziennie)    │
        │                                              │
        │  04:15 UTC  Agent AI (Claude / Codex)        │
        │             → weryfikuje dane targowisk      │
        │             → obsługuje zgłoszenia (Issues)  │
        │             → commit do main                 │
        │                                              │
        │  04:45 UTC  Dashboard                        │
        │             → pobiera statystyki GoatCounter │
        │             → aktualizuje docs/DASHBOARD.md  │
        │                                              │
        │  push na main → build → GitHub Pages         │
        └─────────────────────────────────────────────┘
                            ▲
                            │ (opcjonalnie, z telefonu)
                  właściciel: merge / edycja JSON /
                  odczyt dashboardu w aplikacji GitHub
```

Rola właściciela ogranicza się do: przeglądania `docs/DASHBOARD.md`, okazjonalnej edycji `data/markets.json` i odpowiadania na Issues — wszystko możliwe z telefonu, a przy braku internetu projekt działa dalej bez nadzoru.
