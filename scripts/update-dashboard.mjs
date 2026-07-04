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
  try {
    const totalRes = await fetch(`${base}/stats/total?start=${daysAgo(7)}&end=${today}`, { headers });
    const total = totalRes.ok ? await totalRes.json() : null;
    const hitsRes = await fetch(`${base}/stats/hits?start=${daysAgo(7)}&end=${today}&limit=15`, { headers });
    const hits = hitsRes.ok ? await hitsRes.json() : null;

    if (total) {
      trafficSection += `**Ostatnie 7 dni:** ${total.total ?? "?"} odsłon (unikalne: ${total.total_utc ?? total.total_unique ?? "?"})\n\n`;
    }
    if (hits && Array.isArray(hits.hits)) {
      const ekoClicks = hits.hits.filter((h) => (h.path || "").startsWith("eko/"));
      const signups = hits.hits.filter((h) => (h.path || "").startsWith("zapis/"));
      trafficSection += `### Najpopularniejsze strony i zdarzenia (7 dni)\n\n| Ścieżka | Odsłony |\n|---|---|\n`;
      for (const h of hits.hits.slice(0, 15)) {
        trafficSection += `| \`${h.path}\` | ${h.count} |\n`;
      }
      trafficSection += `\n### 🌿 Walidacja Przycisku-Widmo\n`;
      const ekoTotal = ekoClicks.reduce((s, h) => s + (h.count || 0), 0);
      const signupTotal = signups.reduce((s, h) => s + (h.count || 0), 0);
      trafficSection += `- Kliknięcia „Raport Eko-Weryfikacji": **${ekoTotal}**\n`;
      trafficSection += `- Zapisy e-mail: **${signupTotal}**\n\n`;
    }
    if (!total && !hits) {
      trafficSection += `> Nie udało się pobrać danych z GoatCounter (sprawdź token i kod witryny \`${config.goatcounter}\`).\n\n`;
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
