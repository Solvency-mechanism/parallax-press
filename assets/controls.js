/* ============================================================================
   Parallax Press — v2 review controls  (dependency-free, no build step)
   ----------------------------------------------------------------------------
   Replaces the designer drop's React + Babel + host-harness tweak panel with a
   single vanilla module. Handles: theme toggle, mobile nav drawer, copy-
   citation, the home search jump, and a floating "Design controls" panel that
   lets you flip every still-open layout axis live and remembers your choices.

   THE CONTROLS PANEL IS A REVIEW TOOL, NOT PART OF THE PUBLISHED SITE.
   Delete the <script src=".../controls.js"> tag (and the pp-design head script)
   and hard-code the winning data-attributes on <html> to ship. Everything else
   here (theme, drawer, copy, search) is real site behavior worth keeping.
   ============================================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var page = root.getAttribute("data-page") || "home"; // home | domain | entry
  var STORE = "pp-design";

  /* ---- persisted design state -------------------------------------------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {}
  }
  var state = load();

  function applyAttr(attr, val) { if (val != null) root.setAttribute("data-" + attr, val); }

  /* The axes that exist on each page. label = panel heading; attr = the
     data-attribute press.css/home.css read; opts = [value,label] pairs. */
  var AXES = {
    home: [
      { attr: "density",  label: "Density",        opts: [["airy", "Airy"], ["packed", "Packed"]] },
      { attr: "domains",  label: "Worth reading",  opts: [["grid", "Grid"], ["list", "Index list"]] },
      { attr: "search",   label: "Search bar",     opts: [["on", "Show"], ["off", "Hide"]] },
      { attr: "stats",    label: "Stats counter",  opts: [["on", "Show"], ["off", "Hide"]] }
    ],
    entry: [
      { attr: "parallax",   label: "§IV treatment",   opts: [["slab", "Slab"], ["margin", "Margin"], ["ledger", "Ledger"]] },
      { attr: "relational", label: "Related concepts", opts: [["density", "Density"], ["quiet", "Quiet"]] }
    ],
    domain: [
      { attr: "domain-layout", label: "Domain layout", opts: [["contents", "Contents"], ["register", "Register"]] }
    ]
  };
  var axes = AXES[page] || [];

  /* apply any saved choices for this page's axes immediately (the inline head
     script already did this pre-paint; this is a belt-and-braces re-apply) */
  axes.forEach(function (ax) { if (state[ax.attr] != null) applyAttr(ax.attr, state[ax.attr]); });

  function currentValue(ax) {
    return root.getAttribute("data-" + ax.attr) || ax.opts[0][0];
  }

  /* ---- theme toggle (real site behavior) --------------------------------- */
  (function theme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var sun = btn.querySelector(".ic-sun"), moon = btn.querySelector(".ic-moon");
    function paint() {
      var dark = root.getAttribute("data-theme") === "dark";
      if (sun) sun.style.display = dark ? "none" : "block";
      if (moon) moon.style.display = dark ? "block" : "none";
    }
    paint();
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("pp-theme", next); } catch (e) {}
      paint();
      syncPanel();
    });
  })();

  /* ---- mobile nav drawer (real) ------------------------------------------ */
  (function drawer() {
    var btn = document.getElementById("mast-menu");
    var nav = document.querySelector(".mast-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  })();

  /* ---- copy citation (real) ---------------------------------------------- */
  (function copyCite() {
    var btn = document.getElementById("copy-cite");
    var src = document.getElementById("citation");
    if (!btn || !src) return;
    btn.addEventListener("click", function () {
      var txt = src.innerText;
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      btn.textContent = "Copied ✓"; btn.classList.add("copied");
      setTimeout(function () { btn.textContent = "Copy citation"; btn.classList.remove("copied"); }, 1800);
    });
  })();

  /* ---- home search jump (real, light-touch) ------------------------------ */
  (function search() {
    var form = document.getElementById("searchbar");
    var input = document.getElementById("q");
    function go() {
      var v = ((input && input.value) || "").trim().toLowerCase();
      if (v.indexOf("right") === 0 || v.indexOf("right to work") !== -1 || v.indexOf("right-to-work") !== -1) {
        window.location.href = "labor/right-to-work-laws/";
      } else if (input) { input.focus(); }
    }
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); go(); });
    var ms = document.getElementById("mast-search");
    if (ms) ms.addEventListener("click", function () { input ? input.focus() : (window.location.href = "/"); });
  })();

  /* ---- the floating Design-controls panel (review tool only) ------------- */
  if (!axes.length) return;

  var CSS =
  ".pp-controls-fab{position:fixed;right:18px;bottom:18px;z-index:9998;display:inline-flex;align-items:center;gap:8px;" +
    "font:600 12px/1 'Libre Franklin',system-ui,sans-serif;letter-spacing:.04em;color:var(--ink);" +
    "background:var(--paper-2);border:1px solid var(--rule-2);border-radius:999px;padding:10px 14px;cursor:pointer;" +
    "box-shadow:var(--shadow)}" +
  ".pp-controls-fab:hover{border-color:var(--accent);color:var(--accent)}" +
  ".pp-controls-fab svg{width:15px;height:15px}" +
  ".pp-controls{position:fixed;right:18px;bottom:18px;z-index:9999;width:248px;display:none;" +
    "background:var(--paper-2);color:var(--ink);border:1px solid var(--rule-2);border-radius:12px;" +
    "box-shadow:var(--shadow);overflow:hidden;font-family:'Libre Franklin',system-ui,sans-serif}" +
  ".pp-controls.open{display:block}" +
  ".pp-controls-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--rule)}" +
  ".pp-controls-hd b{font-size:12px;font-weight:600;letter-spacing:.03em}" +
  ".pp-controls-hd .sub{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:2px}" +
  ".pp-controls-x{appearance:none;border:0;background:transparent;color:var(--ink-3);width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:15px;line-height:1}" +
  ".pp-controls-x:hover{background:var(--paper-3);color:var(--ink)}" +
  ".pp-controls-body{padding:6px 14px 14px;display:flex;flex-direction:column;gap:12px}" +
  ".pp-row .pp-lbl{font-size:11px;font-weight:600;color:var(--ink-2);margin:8px 0 6px}" +
  ".pp-seg{display:flex;background:var(--paper-3);border-radius:8px;padding:2px;gap:2px}" +
  ".pp-seg button{flex:1;appearance:none;border:0;background:transparent;color:var(--ink-2);cursor:pointer;" +
    "font:600 11px/1 'Libre Franklin',system-ui,sans-serif;padding:7px 4px;border-radius:6px;letter-spacing:.02em}" +
  ".pp-seg button[aria-pressed='true']{background:var(--paper);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.12)}" +
  ".pp-controls-ft{padding:10px 14px;border-top:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center;gap:8px}" +
  ".pp-controls-ft .theme{font-size:11px;font-weight:600;color:var(--ink-2);background:transparent;border:1px solid var(--rule-2);border-radius:6px;padding:6px 10px;cursor:pointer}" +
  ".pp-controls-ft .theme:hover{border-color:var(--accent);color:var(--accent)}" +
  ".pp-controls-ft .reset{font-size:10.5px;color:var(--ink-3);background:transparent;border:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}" +
  ".pp-controls-ft .reset:hover{color:var(--accent)}" +
  /* desktop-only review tool — never obstruct the mobile UI */
  "@media (max-width:720px){.pp-controls-fab,.pp-controls{display:none !important}}";

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  var fab = document.createElement("button");
  fab.className = "pp-controls-fab";
  fab.type = "button";
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' +
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" stroke-linecap="round"/></svg>' +
    "<span>Design</span>";

  var panel = document.createElement("div");
  panel.className = "pp-controls";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Design controls");

  var rows = axes.map(function (ax) {
    var buttons = ax.opts.map(function (o) {
      return '<button type="button" data-attr="' + ax.attr + '" data-val="' + o[0] + '">' + o[1] + "</button>";
    }).join("");
    return '<div class="pp-row"><div class="pp-lbl">' + ax.label + '</div><div class="pp-seg" data-axis="' + ax.attr + '">' + buttons + "</div></div>";
  }).join("");

  panel.innerHTML =
    '<div class="pp-controls-hd"><div><b>Design controls</b><span class="sub">Review only · ' + page + " page</span></div>" +
    '<button class="pp-controls-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="pp-controls-body">' + rows + "</div>" +
    '<div class="pp-controls-ft"><button class="theme" type="button">Toggle theme</button>' +
    '<button class="reset" type="button">Reset</button></div>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  function syncPanel() {
    axes.forEach(function (ax) {
      var cur = currentValue(ax);
      panel.querySelectorAll('.pp-seg[data-axis="' + ax.attr + '"] button').forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-val") === cur ? "true" : "false");
      });
    });
  }

  function openPanel(open) {
    panel.classList.toggle("open", open);
    fab.style.display = open ? "none" : "inline-flex";
    try { localStorage.setItem("pp-controls-open", open ? "1" : "0"); } catch (e) {}
  }

  fab.addEventListener("click", function () { openPanel(true); });
  panel.querySelector(".pp-controls-x").addEventListener("click", function () { openPanel(false); });

  panel.querySelectorAll(".pp-seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      var attr = b.getAttribute("data-attr"), val = b.getAttribute("data-val");
      applyAttr(attr, val);
      state[attr] = val; save(state);
      syncPanel();
    });
  });

  panel.querySelector(".theme").addEventListener("click", function () {
    var t = document.getElementById("theme-toggle");
    if (t) t.click(); else {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("pp-theme", next); } catch (e) {}
    }
  });

  panel.querySelector(".reset").addEventListener("click", function () {
    axes.forEach(function (ax) {
      applyAttr(ax.attr, ax.opts[0][0]);
      delete state[ax.attr];
    });
    save(state); syncPanel();
  });

  // window-level so the theme toggle can refresh the panel's pressed states
  window.__ppSyncPanel = syncPanel;
  syncPanel();
  try { if (localStorage.getItem("pp-controls-open") === "1") openPanel(true); } catch (e) {}

  // re-expose syncPanel name used inside theme() above
  function syncPanelProxy() { if (window.__ppSyncPanel) window.__ppSyncPanel(); }
  window.addEventListener("pp:theme", syncPanelProxy);
})();
