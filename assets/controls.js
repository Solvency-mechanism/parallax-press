// Parallax Press / CKP client behaviors. Minimal by design.
(function () {
  var root = document.documentElement;

  // Theme toggle (persists pp-theme; read by the inline head script on load).
  var themeBtn = document.getElementById("theme-toggle");
  function paintTheme() {
    var dark = root.getAttribute("data-theme") === "dark";
    var sun = document.querySelector(".ic-sun"), moon = document.querySelector(".ic-moon");
    if (sun) sun.style.display = dark ? "none" : "";
    if (moon) moon.style.display = dark ? "" : "none";
  }
  paintTheme();
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("pp-theme", next); } catch (e) {}
    paintTheme();
  });

  // Mobile sidebar toggle.
  var navBtn = document.getElementById("nav-toggle");
  var body = document.querySelector(".site-body");
  if (navBtn && body) navBtn.addEventListener("click", function () {
    var open = body.getAttribute("data-nav") === "open";
    body.setAttribute("data-nav", open ? "closed" : "open");
    navBtn.setAttribute("aria-expanded", String(!open));
  });

  // Copy citation.
  var copyBtn = document.getElementById("copy-cite");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var el = document.getElementById("citation");
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.textContent.trim()).then(function () {
      var old = copyBtn.textContent; copyBtn.textContent = "Copied";
      setTimeout(function () { copyBtn.textContent = old; }, 1400);
    });
  });

  // TOC scroll-spy: highlight the current section link in the Contents box.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = byId[en.target.id];
        if (a && en.isIntersecting) {
          tocLinks.forEach(function (x) { x.classList.remove("active"); });
          a.classList.add("active");
        }
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    document.querySelectorAll("main [id]").forEach(function (s) { obs.observe(s); });
  }
})();
