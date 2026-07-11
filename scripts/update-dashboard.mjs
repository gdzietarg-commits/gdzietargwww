#!/usr/bin/env node
// Generuje docs/DASHBOARD.md: stan bazy targowisk + statystyki ruchu z GoatCounter.
// Działa też bez tokenu (wtedy sekcja ruchu pokazuje instrukcję konfiguracji).
// Env: GOATCOUNTER_TOKEN (opcjonalny). Kod witryny GoatCounter z data/config.json.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const config = JSON.parse(readFileSync(join(ROOT, "data/config.json"), "utf8"));
const db = JSON.parse(readFileSync(join(ROOT, "data/markets.json"), "utf8"));

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// --- Stan bazy danych ---
const markets = db.markets;
const verified = markets.filter((m) => m.verified);
const stale = markets.filter(
  (m) => (Date.now() - new Date(m.updated).getTime()) / 864e5 > 14
);
const cities = [...new Set(markets.map((m) => m.city))];

let dataSection = `## 📦 Stan bazy danych

| Metryka | Wartość |
|---|---|
| Targowiska w bazie | **${markets.length}** |
| Zweryfikowane | ${verified.length} (${Math.round((verified.length / markets.length) * 100)}%) |
| Do potwierdzenia | ${markets.length - verified.length} |
| Starsze niż 14 dni | ${stale.length} |
| Miasta/gminy | ${cities.length} |

`;

if (markets.length - verified.length > 0) {
  dataSection += `### ⚠️ Czekają na weryfikację przez agenta\n`;
  for (const m of markets.filter((x) => !x.verified)) {
    dataSection += `- ${m.name} (${m.city}) — ostatnia zmiana: ${m.updated}\n`;
  }
  dataSection += "\n";
}

// --- Ruch (GoatCounter API) ---
let trafficSection = `## 📈 Ruch na stronie\n\n`;
const token = process.env.GOATCOUNTER_TOKEN;

if (!token || !config.goatcounter) {
  trafficSection += `> Analityka nieskonfigurowana. Aby włączyć:
> 1. Załóż darmowe konto na [goatcounter.com](https://www.goatcounter.com) z kodem \`${config.goatcounter || "gdzietarg"}\`.
> 2. Wygeneruj token API (Settings → API) i dodaj sekret \`GOATCOUNTER_TOKEN\` w repo (Settings → Secrets → Actions).
> 3. Ten dashboard uzupełni się automatycznie następnego dnia.\n\n`;
} else {
  const base = `https://${config.goatcounter}.goatcounter.com/api/v0`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const EVENT_PREFIXES = ["eko/", "zapis/", "filter/", "share/"];
  const isEvent = (p) => EVENT_PREFIXES.some((pre) => (p || "").startsWith(pre));
  try {
    // Preflight: /api/v0/me potwierdza, czy token w ogóle działa (niezależnie od uprawnień do statystyk).
    const meRes = await fetch(`${base}/me`, { headers });
    if (!meRes.ok) {
      trafficSection +=
        `> ❌ Token GoatCounter nie działa: \`GET /api/v0/me\` → HTTP ${meRes.status}.\n` +
        `> Token jest nieprawidłowy lub dotyczy innej witryny. Wygeneruj nowy w ` +
        `[Settings → API](https://${config.goatcounter}.goatcounter.com/user/api) i zaktualizuj sekret \`GOATCOUNTER_TOKEN\`.\n\n`;
    }

    const hitsRes = meRes.ok
      ? await fetch(`${base}/stats/hits?start=${daysAgo(14)}&end=${today}&limit=50`, { headers })
      : { ok: false, status: 0 };
    const hits = hitsRes.ok ? await hitsRes.json() : null;

    // Diagnoza: token OK (/me 200), ale statystyki 404 = brak uprawnienia „Read statistics".
    if (meRes.ok && !hitsRes.ok) {
      const hint =
        hitsRes.status === 404
          ? "Token nie ma uprawnienia **„Read statistics”** (GoatCounter zwraca wtedy 404). " +
            "Wygeneruj nowy token z zaznaczonym „Read statistics”."
          : "Sprawdź zakres tokenu i kod witryny.";
      trafficSection +=
        `> ⚠️ Token działa (\`/me\` OK), ale \`GET /api/v0/stats/hits\` → HTTP ${hitsRes.status}. ${hint}\n\n`;
    }

    if (hits && Array.isArray(hits.hits)) {
      // Odsłony dzień po dniu (bez zdarzeń) — tabela z wykresem paskowym
      const perDay = {};
      for (let i = 14; i >= 0; i--) perDay[daysAgo(i)] = 0;
      for (const h of hits.hits) {
        if (isEvent(h.path)) continue;
        for (const s of h.stats || []) {
          if (s.day in perDay) perDay[s.day] += s.daily || 0;
        }
      }
      const days = Object.keys(perDay).sort();
      const totalViews = days.reduce((sum, d) => sum + perDay[d], 0);
      const max = Math.max(1, ...days.map((d) => perDay[d]));
      trafficSection += `**Odsłony w ostatnich 14 dniach: ${totalViews}**\n\n`;
      trafficSection += `| Data | Odsłony | Wykres |\n|---|---:|---|\n`;
      for (const d of days) {
        const bar = "█".repeat(Math.round((perDay[d] / max) * 18)) || "·";
        trafficSection += `| ${d} | ${perDay[d]} | ${bar} |\n`;
      }
      trafficSection += `\n### Najpopularniejsze strony i zdarzenia (14 dni)\n\n| Ścieżka | Odsłony |\n|---|---:|\n`;
      for (const h of hits.hits.slice(0, 15)) {
        trafficSection += `| \`${h.path}\` | ${h.count} |\n`;
      }
      const ekoTotal = hits.hits.filter((h) => (h.path || "").startsWith("eko/")).reduce((s, h) => s + (h.count || 0), 0);
      const signupTotal = hits.hits.filter((h) => (h.path || "").startsWith("zapis/")).reduce((s, h) => s + (h.count || 0), 0);
      trafficSection += `\n### 🌿 Walidacja Przycisku-Widmo (14 dni)\n`;
      trafficSection += `- Kliknięcia „Eko-Weryfikacja": **${ekoTotal}**\n`;
      trafficSection += `- Zapisy e-mail: **${signupTotal}**\n`;
      if (totalViews > 0) trafficSection += `- CTR przycisku: **${((ekoTotal / totalViews) * 100).toFixed(1)}%** (próg sukcesu: 8%)\n`;
      trafficSection += `\nPełne, interaktywne wykresy: [gdzietarg.goatcounter.com](https://${config.goatcounter}.goatcounter.com)\n\n`;
    } else if (meRes.ok && hitsRes.ok) {
      trafficSection += `> Odpowiedź GoatCounter miała nieoczekiwany kształt (brak pola \`hits\`). Endpoint: \`/api/v0/stats/hits\`.\n\n`;
    }
  } catch (err) {
    trafficSection += `> Błąd pobierania statystyk: ${err.message}\n\n`;
  }
}

// --- Newsletter (Buttondown API, opcjonalnie) ---
let newsletterSection = "";
const bdKey = process.env.BUTTONDOWN_API_KEY;
if (bdKey) {
  try {
    const res = await fetch("https://api.buttondown.email/v1/subscribers?type=regular", {
      headers: { Authorization: `Token ${bdKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      newsletterSection = `## 📬 Newsletter\n\n- Subskrybenci: **${data.count ?? (data.results ? data.results.length : "?")}**\n\n`;
    } else {
      newsletterSection = `## 📬 Newsletter\n\n> Błąd Buttondown API (HTTP ${res.status}) — sprawdź sekret BUTTONDOWN_API_KEY.\n\n`;
    }
  } catch (err) {
    newsletterSection = `## 📬 Newsletter\n\n> Błąd pobierania z Buttondown: ${err.message}\n\n`;
  }
}

// --- Złóż dokument ---
const md = `# 📊 GdzieTarg.pl — Dashboard

> Aktualizowany automatycznie codziennie ~04:45 UTC. Ostatnia aktualizacja: **${today}**.
> Czytaj z telefonu: aplikacja GitHub → repo → \`docs/DASHBOARD.md\`.

${trafficSection}${newsletterSection}${dataSection}## 🔗 Szybkie linki

- [Strona na żywo](${config.siteUrl})
- [Baza targowisk (edycja)](https://github.com/${config.githubRepo}/edit/main/data/markets.json)
- [Zgłoszenia od społeczności](https://github.com/${config.githubRepo}/issues?q=label%3Adane)
- [Przebiegi automatów](https://github.com/${config.githubRepo}/actions)
`;

writeFileSync(join(ROOT, "docs/DASHBOARD.md"), md);
console.log("✅ docs/DASHBOARD.md zaktualizowany");
