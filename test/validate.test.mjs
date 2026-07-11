// Testy walidatora danych — uruchom: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMarkets } from "../scripts/validate-markets.mjs";

// Poprawny rekord bazowy — kopiowany i psuty w kolejnych testach.
const ok = () => ({
  id: "targ-testowy",
  name: "Targ Testowy",
  city: "Testowo",
  address: "ul. Testowa 1",
  website: "https://przyklad.pl",
  days: ["so"],
  hours: "8:00–14:00",
  verified: true,
  source: "Źródło testowe",
  note: "notatka",
  updated: "2026-07-11",
});
const db = (...markets) => ({ updated: "2026-07-11", markets });

test("poprawne dane przechodzą bez błędów", () => {
  const { errors } = validateMarkets(db(ok()));
  assert.deepEqual(errors, []);
});

test("nieprawidłowy klucz dnia = błąd", () => {
  const m = ok(); m.days = ["monday"];
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("klucz dnia")));
});

test("website javascript: = błąd (anty-XSS)", () => {
  const m = ok(); m.website = "javascript:alert(1)";
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("website")));
});

test("website data: = błąd", () => {
  const m = ok(); m.website = "data:text/html,<script>alert(1)</script>";
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("website")));
});

test("nawiasy kątowe w name = błąd (anty-injection JSON-LD)", () => {
  const m = ok(); m.name = 'Targ </script><img src=x onerror=alert(1)>';
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("< lub >")));
});

test("zduplikowane id = błąd", () => {
  const a = ok(); const b = ok(); // to samo id
  const { errors } = validateMarkets(db(a, b));
  assert.ok(errors.some((e) => e.includes("zduplikowane")));
});

test("brak wymaganego pola (city) = błąd", () => {
  const m = ok(); delete m.city;
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("city")));
});

test("zła data updated = błąd", () => {
  const m = ok(); m.updated = "11-07-2026";
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("updated")));
});

test("verified nie-boolean = błąd", () => {
  const m = ok(); m.verified = "tak";
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("verified")));
});

test("id nie-slug = błąd", () => {
  const m = ok(); m.id = "Targ Ze Spacją";
  const { errors } = validateMarkets(db(m));
  assert.ok(errors.some((e) => e.includes("slug")));
});

test("pusta tablica markets = błąd", () => {
  const { errors } = validateMarkets(db());
  assert.ok(errors.some((e) => e.includes("pusta")));
});

test("guard usuwania: masowe usunięcie vs baseline = błąd", () => {
  const baseline = db(
    { ...ok(), id: "a" }, { ...ok(), id: "b" }, { ...ok(), id: "c" },
    { ...ok(), id: "d" }, { ...ok(), id: "e" }
  );
  const now = db({ ...ok(), id: "a" }); // usunięto 4 (> limit 2)
  const { errors } = validateMarkets(now, { baseline });
  assert.ok(errors.some((e) => e.includes("Usunięto")));
});

test("guard usuwania: usunięcie 1 rekordu = tylko ostrzeżenie", () => {
  const baseline = db({ ...ok(), id: "a" }, { ...ok(), id: "b" });
  const now = db({ ...ok(), id: "a" });
  const { errors, warnings } = validateMarkets(now, { baseline });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes("Usunięto")));
});

test("days: [] (targ zamknięty) jest dozwolone", () => {
  const m = ok(); m.days = [];
  const { errors } = validateMarkets(db(m));
  assert.deepEqual(errors, []);
});

test("website: pusty string jest dozwolony", () => {
  const m = ok(); m.website = "";
  const { errors } = validateMarkets(db(m));
  assert.deepEqual(errors, []);
});
