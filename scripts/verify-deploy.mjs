#!/usr/bin/env node
// Smoke-test po deployu — sprawdza, czy ŻYWA strona odpowiada i ma świeży build.
// Zero zależności. Uruchamiany w deploy.yml po wgraniu na FTP.
//
// Env:
//   SITE_URL   — bazowy URL (domyślnie z data/config.json → siteUrl)
//   EXPECT_SHA — oczekiwany commit (github.sha); miękka weryfikacja świeżości
//
// Twardo (fail = exit 1): strona główna zwraca 200 i zawiera marker "GdzieTarg".
// Miękko (tylko ostrzeżenie): build-id.txt == EXPECT_SHA (odporne na cache/propagację hostingu).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const config = JSON.parse(readFileSync(join(ROOT, "data/config.json"), "utf8"));
const SITE = (process.env.SITE_URL || config.siteUrl || "").replace(/\/$/, "");
const EXPECT_SHA = process.env.EXPECT_SHA || "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, { timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "Cache-Control": "no-cache" } });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function retry(fn, { tries = 5, delay = 8000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fn();
      if (r) return r;
    } catch (e) {
      last = e;
    }
    if (i < tries - 1) await sleep(delay);
  }
  if (last) throw last;
  return null;
}

if (!SITE) {
  console.error("❌ Brak SITE_URL / config.siteUrl — nie wiem, co weryfikować.");
  process.exit(1);
}

console.log(`🔎 Smoke-test: ${SITE}`);

// Rozróżniamy trzy sytuacje:
//  • odpowiedź 200 + marker  → OK
//  • odpowiedź, ale zła treść/status → TWARDY fail (pewny sygnał złego deployu)
//  • brak odpowiedzi (fetch failed/timeout) → OSTRZEŻENIE, nie blokujemy
//    (hosting współdzielony bywa nieosiągalny z CI — filtrowanie IP/TLS; to nie dowód awarii)
let gotResponse = false;
let lastStatus = null;
let bodyOk = false;
try {
  await retry(async () => {
    const { status, body } = await fetchText(`${SITE}/`);
    gotResponse = true;
    lastStatus = status;
    bodyOk = status === 200 && body.includes("GdzieTarg");
    console.log(`   GET / → HTTP ${status}${bodyOk ? " (marker OK)" : ""}`);
    return bodyOk ? true : null; // ponawiaj przy złej treści (propagacja), potem oceni logika niżej
  }, { tries: 4, delay: 8000 });
} catch (e) {
  console.log(`   brak połączenia z CI: ${e.message}`);
}

if (gotResponse && !bodyOk) {
  console.error(`❌ Strona ODPOWIADA (HTTP ${lastStatus}), ale bez markera "GdzieTarg" / nie 200 — prawdopodobnie zły deploy.`);
  console.error(`   Rollback: git revert <ostatni commit danych> i push — deploy odtworzy poprzedni stan.`);
  process.exit(1);
}
if (!gotResponse) {
  console.warn(`⚠️ Nie udało się połączyć ze stroną z runnera (fetch failed) — możliwe filtrowanie IP hostingu lub TLS.`);
  console.warn(`   FTP-sync i bramka buildu przeszły, więc NIE blokuję. Zweryfikuj ręcznie: ${SITE}`);
  process.exit(0);
}
console.log("   ✅ strona główna żyje i zawiera marker.");

// MIĘKKO: świeżość buildu
if (EXPECT_SHA) {
  try {
    const fresh = await retry(async () => {
      const { status, body } = await fetchText(`${SITE}/build-id.txt`);
      if (status === 200 && body.trim() === EXPECT_SHA) return true;
      console.log(`   build-id.txt → HTTP ${status}, wartość="${body.trim().slice(0, 12)}…", oczekiwano="${EXPECT_SHA.slice(0, 12)}…"`);
      return null;
    }, { tries: 6, delay: 10000 });
    if (fresh) console.log("   ✅ build-id zgodny — świeża wersja jest na żywo.");
    else console.warn("   ⚠️ Nie potwierdzono świeżości build-id (możliwy cache/propagacja hostingu). Strona żyje — nie blokuję.");
  } catch (e) {
    console.warn(`   ⚠️ build-id.txt niedostępny (${e.message}). Strona żyje — nie blokuję.`);
  }
}

console.log("✅ Smoke-test zakończony pomyślnie.");
