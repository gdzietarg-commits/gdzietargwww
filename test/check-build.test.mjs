// Testy bramki integralności buildu — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkBuild } from "../scripts/check-build.mjs";

function makeDist(files) {
  const dir = mkdtempSync(join(tmpdir(), "distcheck-"));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

// Poprawny build: index z markerami + wymagane pliki + dość stron HTML.
function goodDist() {
  const files = {
    "index.html": `<html><body>GdzieTarg <article class="card">x</article>${"padding ".repeat(400)}</body></html>`,
    "sitemap.xml": "<urlset/>",
    "robots.txt": "User-agent: *",
    "build-id.txt": "abc123",
    "404.html": "<html>404</html>",
  };
  for (let i = 0; i < 8; i++) files[`p${i}.html`] = "<html>strona</html>";
  return makeDist(files);
}

test("poprawny build przechodzi", () => {
  const dir = goodDist();
  const { errors } = checkBuild(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.deepEqual(errors, []);
});

test("brak index.html = błąd", () => {
  const dir = goodDist();
  rmSync(join(dir, "index.html"));
  const { errors } = checkBuild(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes("index.html")));
});

test("index bez markera 'class=\"card\"' = błąd (pusta lista targów)", () => {
  const dir = makeDist({
    "index.html": `<html><body>GdzieTarg ${"x ".repeat(2000)}</body></html>`,
    "sitemap.xml": "x", "robots.txt": "x", "build-id.txt": "x", "404.html": "x",
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`p${i}.html`, "<html/>"])),
  });
  const { errors } = checkBuild(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes("card")));
});

test("za mało stron HTML = błąd", () => {
  const dir = makeDist({
    "index.html": `<html>GdzieTarg <article class="card"/>${"x".repeat(3000)}</html>`,
    "sitemap.xml": "x", "robots.txt": "x", "build-id.txt": "x", "404.html": "x",
  });
  const { errors } = checkBuild(dir);
  rmSync(dir, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes("Za mało stron")));
});

test("brak katalogu = błąd", () => {
  const { errors } = checkBuild("/nie/ma/takiego/katalogu");
  assert.ok(errors.length > 0);
});
