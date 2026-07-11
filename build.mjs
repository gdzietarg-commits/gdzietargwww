#!/usr/bin/env node
// GdzieTarg.pl — generator strony statycznej.
// Zero zależności: node build.mjs → katalog dist/ gotowy na GitHub Pages.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

const config = JSON.parse(readFileSync(join(ROOT, "data/config.json"), "utf8"));
const db = JSON.parse(readFileSync(join(ROOT, "data/markets.json"), "utf8"));
const sezon = JSON.parse(readFileSync(join(ROOT, "data/sezon.json"), "utf8"));
const markets = db.markets;
const month = new Date().getMonth() + 1;
const sezonNow = sezon[String(month)];

const DAY_LABELS = { pn: "Pon", wt: "Wt", sr: "Śr", cz: "Czw", pt: "Pt", so: "Sob", nd: "Ndz" };
const DAY_FULL = { pn: "poniedziałek", wt: "wtorek", sr: "środa", cz: "czwartek", pt: "piątek", so: "sobota", nd: "niedziela" };
const DAY_ORDER = ["pn", "wt", "sr", "cz", "pt", "so", "nd"];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Utwardzenie JSON-LD: escapuje sekwencje mogące wyjść z <script> (obrona anty-injection).
const jsonldSafe = (s) => s.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

const slugify = (s) =>
  s.toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => ({ ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" }[c]))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mapsLink = (m) => {
  const q = encodeURIComponent(`${m.name} ${m.address !== "do ustalenia" ? m.address : ""} ${m.city}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

const issueLink = (m) => {
  const title = encodeURIComponent(`Poprawka danych: ${m.name}`);
  const body = encodeURIComponent(
    `Targowisko: ${m.name} (${m.city})\nObecne dane: dni ${m.days.join(", ")}, godziny ${m.hours || "brak"}\n\nCo się zmieniło / co jest nie tak?\n\n`
  );
  return `https://github.com/${config.githubRepo}/issues/new?title=${title}&body=${body}&labels=dane`;
};

// ---------- wspólne fragmenty ----------

const analytics = config.goatcounter
  ? `<script data-goatcounter="https://${config.goatcounter}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>`
  : "";

function page({ title, description, path, content, jsonld }) {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${config.siteUrl}/${path}">
<link rel="stylesheet" href="assets/style.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥕</text></svg>">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${jsonld ? `<script type="application/ld+json">${jsonldSafe(jsonld)}</script>` : ""}
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a class="logo" href="index.html"><span class="logo-mark">🥕</span> <span class="logo-text"><strong>GdzieTarg</strong>.pl</span></a>
    <nav><a href="index.html">Targowiska</a> <a href="o-projekcie.html">O projekcie</a></nav>
  </div>
</header>
<main>
${content}
</main>
<footer class="site-footer">
  <div class="newsletter" id="newsletter">
    <h2>📬 Targowy newsletter</h2>
    <p>Raz w tygodniu: które targi są otwarte, sezonowe nowości i raporty Eko-Weryfikacji. Zero spamu.</p>
    <form class="email-form" data-kind="newsletter">
      <input type="email" name="email" placeholder="Twój e-mail" required aria-label="Adres e-mail">
      <button type="submit">Zapisz mnie</button>
    </form>
    <p class="form-note" hidden></p>
  </div>
  <p class="footer-meta">
    ${esc(config.siteName)} — ${esc(config.tagline)}<br>
    Region startowy: ${esc(config.region)}.<br>
    Dane aktualizowane automatycznie • ostatnia aktualizacja bazy: ${esc(db.updated)} •
    <a href="https://github.com/${config.githubRepo}/issues/new?labels=dane">zgłoś poprawkę</a>
  </p>
</footer>

<div class="modal-backdrop" id="eko-modal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="eko-title">
    <button class="modal-close" aria-label="Zamknij">✕</button>
    <h2 id="eko-title">🌿 Eko-Weryfikacja stoisk</h2>
    <p class="modal-market"></p>
    <p><strong>Co to jest?</strong> Jedziemy do gospodarstwa konkretnego sprzedawcy z tego targowiska
    i sprawdzamy na miejscu, jak naprawdę powstaje jego produkt — czy kury biegają po trawie,
    czy warzywa rosną w gruncie. Raport dotyczy zawsze <strong>konkretnego stoiska i produktu</strong>,
    nie całego targowiska.</p>
    <p>Pierwsze raporty przygotowujemy. Powiedz, co sprawdzić najpierw, a powiadomimy Cię,
    gdy raport z tego targu będzie gotowy — dorzucimy też kod rabatowy na pierwsze zakupy.</p>
    <form class="email-form eko-form" data-kind="eko">
      <select name="produkt" aria-label="Co mamy zweryfikować najpierw?">
        <option value="" disabled selected>Co sprawdzić najpierw?</option>
        <option value="jajka">🥚 Jajka</option>
        <option value="nabial">🧀 Nabiał i sery</option>
        <option value="warzywa-owoce">🥕 Warzywa i owoce</option>
        <option value="mieso-wedliny">🥩 Mięso i wędliny</option>
        <option value="miod">🍯 Miód</option>
        <option value="pieczywo">🍞 Pieczywo</option>
        <option value="inne">🧺 Coś innego</option>
      </select>
      <input type="email" name="email" placeholder="Twój e-mail" required aria-label="Adres e-mail">
      <button type="submit">Zapisz mnie</button>
    </form>
    <p class="form-note" hidden></p>
  </div>
</div>

<script>window.GT_CONFIG=${JSON.stringify({ newsletterAction: config.newsletterAction })};</script>
<script src="assets/app.js" defer></script>
${analytics}
</body>
</html>`;
}

function dayChips(days) {
  return DAY_ORDER.map((d) => {
    const on = days.includes(d);
    return `<span class="day-chip${on ? " on" : ""}" data-day="${d}">${DAY_LABELS[d]}</span>`;
  }).join("");
}

function marketCard(m) {
  const slug = m.id || slugify(m.name);
  return `<article class="card" data-city="${esc(m.city.toLowerCase())}" data-name="${esc(m.name.toLowerCase())}" data-days="${m.days.join(",")}">
  <div class="card-top">
    <h3><a href="${slug}.html">${esc(m.name)}</a></h3>
    <span class="today-badge" hidden>Dziś otwarte</span>
  </div>
  <p class="addr">📍 ${esc(m.address)}, ${esc(m.city)} · <a href="${mapsLink(m)}" rel="noopener" target="_blank">mapa</a>${m.website ? ` · <a href="${esc(m.website)}" rel="noopener" target="_blank">strona targu</a>` : ""}</p>
  <p class="days-row">${dayChips(m.days)}</p>
  ${m.hours ? `<p class="hours">🕕 ${esc(m.hours)}</p>` : ""}
  <p class="status ${m.verified ? "ok" : "warn"}">${m.verified ? `✅ Dane zweryfikowane · ${esc(m.updated)}` : "⚠️ Dane do potwierdzenia"}</p>
  <div class="card-actions">
    <button class="eko-btn" data-market="${esc(m.name)}" data-slug="${slug}">🌿 Eko-Weryfikacja stoisk i produktów</button>
  </div>
</article>`;
}

// ---------- strony ----------

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, "assets"), join(DIST, "assets"), { recursive: true });
writeFileSync(join(DIST, ".nojekyll"), "");

const cities = [...new Set(markets.map((m) => m.city))].sort((a, b) => a.localeCompare(b, "pl"));
const pages = [];

// Strona główna
const indexContent = `
<section class="hero">
  <span class="hero-eyebrow">🌿 Świeżo · lokalnie · bez pośredników</span>
  <h1>Gdzie i kiedy<br>jest targ?</h1>
  <p class="hero-sub">Aktualne dni i godziny targowisk oraz bazarków — ${esc(config.region)}.</p>
  <div class="search-box">
    <div class="search-field">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="search" id="q" placeholder="Wpisz miasto lub nazwę targu…" aria-label="Szukaj targowiska">
    </div>
    <div class="day-filter" id="day-filter" role="group" aria-label="Filtruj po dniu tygodnia">
      <button class="day-tile active" data-day="">Wszystkie</button>
      ${DAY_ORDER.map((d) => `<button class="day-tile" data-day="${d}">${DAY_LABELS[d]}</button>`).join("")}
    </div>
    <p class="today-line" id="today-line" hidden></p>
  </div>
</section>
<section class="grid" id="grid">
  ${markets.map(marketCard).join("\n")}
</section>
<p class="empty-msg" id="empty" hidden>Brak wyników — spróbuj innego dnia lub miasta. Znasz targ, którego tu nie ma? <a href="https://github.com/${config.githubRepo}/issues/new?labels=dane">Daj znać!</a></p>
<section class="season-box">
  <h2>🍓 Co teraz smakuje najlepiej? <span class="season-month">(${sezonNow.nazwa})</span></h2>
  <p class="season-lead">Sezonowe produkty, których warto teraz szukać na targu:</p>
  <p class="season-chips">${sezonNow.produkty.map((p) => `<span class="season-chip">${esc(p)}</span>`).join("")}</p>
</section>
<section class="cities-index">
  <h2>Miasta i gminy</h2>
  <p>${cities.map((c) => `<a class="city-link" href="${slugify(c)}.html">${esc(c)}</a>`).join(" ")}</p>
</section>`;

writeFileSync(
  join(DIST, "index.html"),
  page({
    title: `${config.siteName} — dni i godziny targowisk | Pruszków, Piastów, Stare Babice`,
    description: `Sprawdź, gdzie i kiedy jest targ. Aktualne dni i godziny otwarcia targowisk: ${cities.join(", ")}.`,
    path: "index.html",
    content: indexContent,
  })
);
pages.push("index.html");

// Podstrony miast
for (const city of cities) {
  const list = markets.filter((m) => m.city === city);
  const slug = slugify(city);
  const content = `
<nav class="crumbs"><a href="index.html">← Wszystkie targowiska</a></nav>
<section class="hero small">
  <h1>Targowiska: ${esc(city)}</h1>
  <p>${list.length === 1 ? "1 targowisko" : list.length + " targowiska/targowisk"} w bazie. Dane odświeżane automatycznie.</p>
</section>
<section class="grid">${list.map(marketCard).join("\n")}</section>`;
  writeFileSync(
    join(DIST, `${slug}.html`),
    page({
      title: `Targ ${city} — dni i godziny otwarcia | ${config.siteName}`,
      description: `Kiedy jest targ w: ${city}? Aktualne dni handlowe i godziny otwarcia targowisk i bazarków.`,
      path: `${slug}.html`,
      content,
    })
  );
  pages.push(`${slug}.html`);
}

// Podstrony targowisk
for (const m of markets) {
  const slug = m.id || slugify(m.name);
  const daysFull = m.days.map((d) => DAY_FULL[d]).join(", ");
  const faqAnswer = m.days.length
    ? `${m.name} działa w dni: ${daysFull}${m.hours ? `, w godzinach ${m.hours}` : ""}. Adres: ${m.address}, ${m.city}.`
    : `Dni handlowe targowiska ${m.name} są w trakcie weryfikacji.`;
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        name: m.name,
        ...(m.website && { url: m.website }),
        address: { "@type": "PostalAddress", streetAddress: m.address, addressLocality: m.city, addressCountry: "PL" },
        ...(m.hours && { description: `Dni handlowe: ${daysFull}. Godziny: ${m.hours}.` }),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Kiedy jest targ: ${m.name}?`,
            acceptedAnswer: { "@type": "Answer", text: faqAnswer },
          },
        ],
      },
    ],
  });
  const content = `
<nav class="crumbs"><a href="index.html">← Wszystkie</a> · <a href="${slugify(m.city)}.html">${esc(m.city)}</a></nav>
<article class="market-detail" data-days="${m.days.join(",")}">
  <h1>${esc(m.name)}</h1>
  <p class="status ${m.verified ? "ok" : "warn"}">${m.verified ? `✅ Dane zweryfikowane · źródło: ${esc(m.source)} · ${esc(m.updated)}` : `⚠️ Dane do potwierdzenia · ${esc(m.source)}`}</p>
  <p class="addr">📍 ${esc(m.address)}, ${esc(m.city)} — <a href="${mapsLink(m)}" rel="noopener" target="_blank">pokaż na mapie</a></p>
  ${m.website ? `<p class="addr">🔗 Oficjalna strona: <a href="${esc(m.website)}" rel="noopener" target="_blank">${esc(m.website.replace(/^https?:\/\//, ""))}</a></p>` : ""}
  <h2>Dni handlowe</h2>
  <p class="days-row big">${dayChips(m.days)}</p>
  <p><strong>${esc(daysFull) || "do ustalenia"}</strong>${m.hours ? `, w godzinach <strong>${esc(m.hours)}</strong>` : ""}</p>
  ${m.note ? `<p class="note">ℹ️ ${esc(m.note)}</p>` : ""}
  <div class="card-actions">
    <button class="eko-btn" data-market="${esc(m.name)}" data-slug="${slug}">🌿 Eko-Weryfikacja stoisk i produktów</button>
    <button class="share-btn" data-title="${esc(m.name)} — dni i godziny otwarcia" hidden>📤 Udostępnij (np. na grupie osiedlowej)</button>
    <a class="report-link" href="${issueLink(m)}" rel="noopener" target="_blank">✏️ Zgłoś poprawkę (byłeś tam? pomóż innym)</a>
  </div>
</article>`;
  writeFileSync(
    join(DIST, `${slug}.html`),
    page({
      title: `${m.name} — dni i godziny otwarcia | ${config.siteName}`,
      description: `${m.name}, ${m.city}. Dni handlowe: ${daysFull || "do ustalenia"}${m.hours ? `, godziny: ${m.hours}` : ""}.`,
      path: `${slug}.html`,
      content,
      jsonld,
    })
  );
  pages.push(`${slug}.html`);
}

// O projekcie
const aboutContent = `
<nav class="crumbs"><a href="index.html">← Targowiska</a></nav>
<article class="market-detail">
  <h1>O projekcie</h1>
  <p><strong>${esc(config.siteName)}</strong> to prosta odpowiedź na proste pytanie: <em>„czy jutro jest targ i do której?"</em></p>
  <p>Zbieramy w jednym miejscu dni i godziny handlu lokalnych targowisk i bazarków — zaczynając od zachodnich okolic Warszawy.
  Dane pochodzą ze stron gmin, BIP-ów i zgłoszeń społeczności, a codziennie odświeża je automat.</p>
  <h2>🌿 Eko-Weryfikacja — jak to działa?</h2>
  <p>Pracujemy nad czymś, czego nie ma nikt inny: <strong>fizyczną weryfikacją łańcucha dostaw</strong>.
  Ważne: raport dotyczy zawsze <strong>konkretnego stoiska i konkretnego produktu</strong> —
  nie całego targowiska. Przykład: „Jajka pana Janka, stoisko nr 14, Targowisko Miejskie
  w Pruszkowie" — jedziemy do jego gospodarstwa, sprawdzamy warunki hodowli i publikujemy
  raport ze zdjęciami. Bez deklaracji — dowody.</p>
  <p>Które stoiska sprawdzamy najpierw? Te, na które głosujecie w formularzach przy
  targowiskach. Chcesz wiedzieć, kiedy ruszamy? Zapisz się do newslettera poniżej.</p>
  <h2>🤝 Pomóż nam</h2>
  <p>Byłeś na targu i coś się nie zgadza? Kliknij „Zgłoś poprawkę" przy targowisku. Każde zgłoszenie trafia do weryfikacji w ciągu 24 godzin.</p>
</article>`;
writeFileSync(
  join(DIST, "o-projekcie.html"),
  page({
    title: `O projekcie | ${config.siteName}`,
    description: "GdzieTarg.pl — agregator lokalnych targowisk. Dni, godziny, Eko-Weryfikacja dostawców.",
    path: "o-projekcie.html",
    content: aboutContent,
  })
);
pages.push("o-projekcie.html");

// 404
writeFileSync(
  join(DIST, "404.html"),
  page({
    title: `Nie znaleziono | ${config.siteName}`,
    description: "Strona nie istnieje.",
    path: "404.html",
    content: `<section class="hero"><h1>Ups, tu nie ma targu 🥕</h1><p><a href="index.html">Wróć do listy targowisk</a></p></section>`,
  })
);

// sitemap + robots
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `<url><loc>${config.siteUrl}/${p}</loc><lastmod>${db.updated}</lastmod></url>`).join("\n")}
</urlset>`
);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`);

console.log(`✅ Zbudowano ${pages.length + 2} stron → dist/ (targowisk: ${markets.length}, miast: ${cities.length})`);
