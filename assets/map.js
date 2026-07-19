// GdzieTarg.pl — mapa targowisk (Leaflet + OpenStreetMap). Ładowane tylko na mapa.html.
(function () {
  "use strict";
  var markets = window.GT_MARKETS || [];
  if (!window.L || !document.getElementById("map")) return;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function haversine(la1, lo1, la2, lo2) {
    var R = 6371, r = Math.PI / 180;
    var dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
    var a = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
      Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  var DAY = { pn: "Pn", wt: "Wt", sr: "Śr", cz: "Czw", pt: "Pt", so: "Sob", nd: "Ndz" };
  var map = L.map("map", { scrollWheelZoom: false }).setView([52.17, 20.9], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  var pins = [];
  markets.forEach(function (m) {
    var days = (m.days || []).map(function (d) { return DAY[d] || d; }).join(", ");
    var html =
      "<strong>" + esc(m.name) + "</strong><br>📍 " + esc(m.city) +
      (days ? "<br>📅 " + days : "") +
      (m.hours ? "<br>🕕 " + esc(m.hours) : "") +
      (m.exact ? "" : "<br><em>lokalizacja przybliżona (centrum miejscowości)</em>") +
      '<br><a href="' + esc(m.slug) + '.html">Szczegóły →</a>';
    pins.push(L.marker([m.lat, m.lng]).addTo(map).bindPopup(html));
  });
  if (pins.length) map.fitBounds(L.featureGroup(pins).getBounds().pad(0.15));

  // Geolokalizacja: pokaż użytkownika + policz najbliższe targi
  var btn = document.getElementById("geo-btn");
  var note = document.getElementById("geo-note");
  if (btn && navigator.geolocation) {
    btn.addEventListener("click", function () {
      note.textContent = "Ustalam Twoją lokalizację…";
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var lat = pos.coords.latitude, lng = pos.coords.longitude;
          L.circleMarker([lat, lng], { radius: 9, color: "#0c9463", fillColor: "#0c9463", fillOpacity: 0.9 })
            .addTo(map).bindPopup("Jesteś tutaj").openPopup();
          map.setView([lat, lng], 12);
          var near = markets
            .map(function (m) { return { m: m, d: haversine(lat, lng, m.lat, m.lng) }; })
            .sort(function (a, b) { return a.d - b.d; })
            .slice(0, 3)
            .map(function (x) { return x.m.name + " (" + x.d.toFixed(1) + " km)"; });
          note.textContent = near.length ? "Najbliżej Ciebie: " + near.join(" · ") : "";
          if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "geo/najblizsze", event: true });
        },
        function () { note.textContent = "Nie udało się ustalić lokalizacji (odmowa dostępu lub brak GPS)."; }
      );
    });
  } else if (btn) {
    btn.style.display = "none";
  }
})();
