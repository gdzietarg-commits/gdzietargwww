#!/usr/bin/env node
// IndexNow — po deployu powiadamia wyszukiwarki (Bing, Yandex, Seznam…) o adresach stron,
// żeby indeksowały je od razu, bez czekania na crawl. Best-effort: nigdy nie wywraca deployu.
// Klucz: config.indexnowKey (plik-klucz {key}.txt generuje build.mjs w katalogu głównym).

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const config = JSON.parse(readFileSync(join(ROOT, "data/config.json"), "utf8"));
const key = config.indexnowKey;
if (!key) { console.log("Brak indexnowKey w config — pomijam IndexNow."); process.exit(0); }

const site = (config.siteUrl || "").replace(/\/$/, "");
const host = site.replace(/^https?:\/\//, "");

let urls = [];
try {
  const sm = readFileSync(join(ROOT, "dist/sitemap.xml"), "utf8");
  urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
} catch { /* brak sitemap → tylko strona główna */ }
if (!urls.length) urls = [site + "/"];

const payload = { host, key, keyLocation: `${site}/${key}.txt`, urlList: urls.slice(0, 10000) };

try {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  console.log(`✅ IndexNow: HTTP ${res.status} dla ${urls.length} adresów (${host}).`);
} catch (e) {
  console.warn(`⚠️ IndexNow nieudane (best-effort, nie blokuje): ${e.message}`);
}
process.exit(0);
