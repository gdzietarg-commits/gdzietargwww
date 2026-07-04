// GdzieTarg.pl — interakcje: filtry, "Dziś otwarte", sortowanie, modal Eko,
// zapisy e-mail, udostępnianie.
(function () {
  "use strict";
  var CFG = window.GT_CONFIG || {};
  var DAYS = ["nd", "pn", "wt", "sr", "cz", "pt", "so"]; // Date.getDay(): 0 = niedziela
  var DAY_NAMES = { pn: "poniedziałek", wt: "wtorek", sr: "środa", cz: "czwartek", pt: "piątek", so: "sobota", nd: "niedziela" };
  var now = new Date();
  var today = DAYS[now.getDay()];
  var tomorrow = DAYS[(now.getDay() + 1) % 7];

  function count(path) {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: path, event: true });
    }
  }

  function openDays(el) {
    return (el.dataset.days || "").split(",").filter(Boolean);
  }

  // Badge "Dziś otwarte"
  document.querySelectorAll(".card, .market-detail").forEach(function (el) {
    if (openDays(el).indexOf(today) !== -1) {
      var badge = el.querySelector(".today-badge");
      if (badge) badge.hidden = false;
    }
  });

  // Strona główna: pasek "dziś/jutro" + targi otwarte dziś na górze listy
  var grid = document.getElementById("grid");
  var todayLine = document.getElementById("today-line");
  if (grid && todayLine) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
    var openToday = cards.filter(function (c) { return openDays(c).indexOf(today) !== -1; });
    var openTomorrow = cards.filter(function (c) { return openDays(c).indexOf(tomorrow) !== -1; });
    todayLine.textContent = "Dziś (" + DAY_NAMES[today] + ") otwarte: " + openToday.length +
      " · jutro (" + DAY_NAMES[tomorrow] + "): " + openTomorrow.length;
    todayLine.hidden = false;
    // otwarte dziś na górę (stabilnie, bez zmiany kolejności wewnątrz grup)
    openToday.forEach(function (c, i) { grid.insertBefore(c, grid.children[i]); });
  }

  // Filtrowanie: tekst + dzień tygodnia
  var q = document.getElementById("q");
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
      var matchDay = !activeDay || openDays(card).indexOf(activeDay) !== -1;
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

  // Udostępnianie (Web Share API — głównie mobile)
  if (navigator.share) {
    document.querySelectorAll(".share-btn").forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        count("share/" + location.pathname.replace(/^\//, ""));
        navigator.share({ title: btn.dataset.title || document.title, url: location.href })
          .catch(function () {});
      });
    });
  }

  // Formularze e-mail (modal Eko + newsletter w stopce)
  document.querySelectorAll(".email-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = form.dataset.kind || "newsletter";
      var email = form.querySelector("input[name=email]").value;
      var produktEl = form.querySelector("select[name=produkt]");
      var produkt = produktEl && produktEl.value ? produktEl.value : "";
      var note = form.parentElement.querySelector(".form-note");
      var path = "zapis/" + kind;
      if (kind === "eko" && currentSlug) path += "/" + currentSlug;
      if (produkt) path += "/" + produkt;
      count(path);

      function done(ok) {
        if (note) {
          note.hidden = false;
          note.textContent = ok
            ? "✅ Dziękujemy! Odezwiemy się, gdy tylko raport będzie gotowy."
            : "✅ Zapisane! (Uwaga dla właściciela: skonfiguruj newsletterAction w data/config.json)";
        }
        form.querySelector("button[type=submit]").disabled = true;
      }

      if (CFG.newsletterAction) {
        var body = new FormData();
        body.append("email", email);
        body.append("tag", kind + (currentSlug ? ":" + currentSlug : "") + (produkt ? ":" + produkt : ""));
        fetch(CFG.newsletterAction, { method: "POST", body: body, mode: "no-cors" })
          .then(function () { done(true); })
          .catch(function () { done(true); });
      } else {
        done(false);
      }
    });
  });
})();
