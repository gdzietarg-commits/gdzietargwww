// GdzieTarg.pl — interakcje: filtry, badge "Dziś otwarte", modal Eko, zapisy e-mail.
(function () {
  "use strict";
  var CFG = window.GT_CONFIG || {};
  var DAYS = ["nd", "pn", "wt", "sr", "cz", "pt", "so"]; // Date.getDay(): 0 = niedziela
  var today = DAYS[new Date().getDay()];

  function count(path) {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: path, event: true });
    }
  }

  // Badge "Dziś otwarte"
  document.querySelectorAll(".card, .market-detail").forEach(function (el) {
    var days = (el.dataset.days || "").split(",");
    if (days.indexOf(today) !== -1) {
      var badge = el.querySelector(".today-badge");
      if (badge) badge.hidden = false;
    }
  });

  // Filtrowanie: tekst + dzień tygodnia
  var q = document.getElementById("q");
  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var activeDay = "";

  function applyFilters() {
    if (!grid) return;
    var term = (q && q.value || "").trim().toLowerCase();
    var visible = 0;
    grid.querySelectorAll(".card").forEach(function (card) {
      var matchText = !term ||
        card.dataset.name.indexOf(term) !== -1 ||
        card.dataset.city.indexOf(term) !== -1;
      var matchDay = !activeDay || card.dataset.days.split(",").indexOf(activeDay) !== -1;
      var show = matchText && matchDay;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (empty) empty.hidden = visible > 0;
  }

  if (q) q.addEventListener("input", applyFilters);

  document.querySelectorAll(".day-tile").forEach(function (tile) {
    tile.addEventListener("click", function () {
      activeDay = tile.dataset.day;
      document.querySelectorAll(".day-tile").forEach(function (t) {
        t.classList.toggle("active", t === tile);
      });
      count("filter/dzien-" + (activeDay || "wszystkie"));
      applyFilters();
    });
  });

  // Modal Eko-Weryfikacji (Przycisk-Widmo)
  var modal = document.getElementById("eko-modal");
  var currentSlug = "";

  document.querySelectorAll(".eko-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentSlug = btn.dataset.slug || "";
      count("eko/" + currentSlug);
      if (modal) {
        modal.querySelector(".modal-market").textContent = btn.dataset.market || "";
        modal.hidden = false;
        modal.querySelector("input[name=email]").focus();
      }
    });
  });

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.classList.contains("modal-close")) modal.hidden = true;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") modal.hidden = true;
    });
  }

  // Formularze e-mail (modal Eko + newsletter w stopce)
  document.querySelectorAll(".email-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = form.dataset.kind || "newsletter";
      var email = form.querySelector("input[name=email]").value;
      var note = form.parentElement.querySelector(".form-note");
      count("zapis/" + kind + (currentSlug && kind === "eko" ? "/" + currentSlug : ""));

      function done(ok) {
        if (note) {
          note.hidden = false;
          note.textContent = ok
            ? "✅ Dziękujemy! Odezwiemy się, gdy tylko raport będzie gotowy."
            : "✅ Zapisane! (Uwaga dla właściciela: skonfiguruj newsletterAction w data/config.json)";
        }
        form.querySelector("button").disabled = true;
      }

      if (CFG.newsletterAction) {
        var body = new FormData();
        body.append("email", email);
        body.append("tag", kind + (currentSlug ? ":" + currentSlug : ""));
        fetch(CFG.newsletterAction, { method: "POST", body: body, mode: "no-cors" })
          .then(function () { done(true); })
          .catch(function () { done(true); });
      } else {
        done(false);
      }
    });
  });
})();
