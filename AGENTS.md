# GdzieTarg.pl — instrukcje dla agentów (OpenAI Codex i inne)

Ten plik czyta m.in. OpenAI Codex. Pełne zasady projektu: `CLAUDE.md` (obowiązują
wszystkich agentów niezależnie od dostawcy). Zadanie dzienne: `prompts/daily-update.md`.

Najważniejsze:
- Buduj/waliduj przez `node build.mjs` (bez npm install — zero zależności).
- Dane targowisk: tylko `data/markets.json`; schemat i zasady w `CLAUDE.md`.
- Nie zgaduj dni ani godzin handlu — brak źródła = `verified: false` + notatka.
- `docs/DASHBOARD.md` jest generowany automatycznie — nie edytuj.
- Treści po polsku. Commit: `data: aktualizacja targowisk YYYY-MM-DD`.
