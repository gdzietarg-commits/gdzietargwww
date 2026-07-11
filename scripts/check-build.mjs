#!/usr/bin/env node
// Bramka integralności buildu — sprawdza dist/ PRZED wysyłką na FTP.
// Zero zależności. Eksportuje czystą funkcję checkBuild() (testowalną) + CLI.
// Cel: nie wypuścić na produkcję pustej/uszkodzonej strony (obrona T6/T11).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIREMENTS = {
  minHtmlFiles: 8, // realnie mamy kilkadziesiąt; poniżej = coś się urwało
  minIndexBytes: 2000, // pusty/uszkodzony index byłby dużo mniejszy
  markers: ["GdzieTarg", 'class="card"'], // strona główna musi zawierać markę i przynajmniej jedną kartę
  requiredFiles: ["index.html", "sitemap.xml", "robots.txt", "build-id.txt", "404.html"],
};

/**
 * @param {string} distDir
 * @returns {{errors: string[], stats: object}}
 */
export function checkBuild(distDir) {
  const errors = [];
  if (!existsSync(distDir)) return { errors: [`Katalog buildu nie istnieje: ${distDir}`], stats: {} };

  const files = readdirSync(distDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));

  for (const req of REQUIREMENTS.requiredFiles) {
    if (!existsSync(join(distDir, req))) errors.push(`Brak wymaganego pliku: ${req}`);
  }

  if (htmlFiles.length < REQUIREMENTS.minHtmlFiles) {
    errors.push(`Za mało stron HTML: ${htmlFiles.length} (min ${REQUIREMENTS.minHtmlFiles}) — build prawdopodobnie niekompletny.`);
  }

  const indexPath = join(distDir, "index.html");
  if (existsSync(indexPath)) {
    const size = statSync(indexPath).size;
    if (size < REQUIREMENTS.minIndexBytes) errors.push(`index.html za mały (${size} B < ${REQUIREMENTS.minIndexBytes} B).`);
    const html = readFileSync(indexPath, "utf8");
    for (const m of REQUIREMENTS.markers) {
      if (!html.includes(m)) errors.push(`index.html nie zawiera markera: ${JSON.stringify(m)}.`);
    }
  }

  return { errors, stats: { htmlFiles: htmlFiles.length, totalFiles: files.length } };
}

// ---------- CLI ----------
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  const distDir = process.argv[2] || join(thisFile, "..", "..", "dist");
  const { errors, stats } = checkBuild(distDir);
  if (errors.length) {
    for (const e of errors) console.error(`❌ ${e}`);
    console.error(`\n✖ Build NIE przechodzi bramki integralności — deploy wstrzymany.`);
    process.exit(1);
  }
  console.log(`✅ Build OK: ${stats.htmlFiles} stron HTML, ${stats.totalFiles} plików w dist/.`);
}
