(function () {
  "use strict";
  var root = document.documentElement;

  // ---- Theme toggle (initial theme is applied by theme.js in <head>) ----
  var themeBtn = document.getElementById("theme-toggle");
  function syncThemeLabel() {
    var dark = root.getAttribute("data-theme") === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  syncThemeLabel();
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeLabel();
  });

  // ---- Mobile menu ----
  var menuBtn = document.getElementById("menu-toggle");
  var links = document.getElementById("nav-links");
  function setMenu(open) {
    links.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", function () { setMenu(!links.classList.contains("is-open")); });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // ---- Nav border on scroll + active section highlight ----
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var navLinks = Array.prototype.slice.call(links.querySelectorAll("a"));
  if ("IntersectionObserver" in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("is-current", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) {
      var id = (a.getAttribute("href") || "").replace(/^#/, "");
      var s = /^[a-z][\w-]*$/i.test(id) ? document.getElementById(id) : null;
      if (s) sectionObs.observe(s);
    });
  }

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); revealObs.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min((i % 6) * 60, 300) + "ms";
      revealObs.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // ---- Rotating hero word ----
  var words = ["load fast", "rank well", "convert", "feel great"];
  var rot = document.getElementById("rotator");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (rot && !reduce) {
    var wi = 0;
    setInterval(function () {
      rot.classList.add("is-out");
      setTimeout(function () {
        wi = (wi + 1) % words.length;
        rot.textContent = words[wi];
        rot.classList.remove("is-out");
      }, 300);
    }, 2600);
  }

  // ---- Count-up stats ----
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = +el.getAttribute("data-count");
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target + suffix; return; }
    var start = null;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / 1200, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // ---- Project filters ----
  var chips = document.querySelectorAll(".chip");
  var projects = document.querySelectorAll(".project");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      projects.forEach(function (p) {
        var show = f === "all" || p.getAttribute("data-cat") === f;
        p.classList.toggle("is-hidden", !show);
        if (show) p.classList.add("is-in");
      });
    });
  });

  // ---- Pricing buttons preselect the plan in the form ----
  var form = document.getElementById("contact-form");
  document.querySelectorAll("[data-plan]").forEach(function (btn) {
    btn.addEventListener("click", function () { form.elements.plan.value = btn.getAttribute("data-plan"); });
  });

  // ---- Contact form ----
  // No server is involved: after validation the visitor's own email app opens
  // with the message filled in, so there is nothing on our side to attack or
  // spam. To switch to a form service later, see README.md (the CSP's
  // form-action / connect-src must then allow that service's origin).
  var CONTACT_EMAIL = "hello@example.com";
  var LIMITS = { name: 100, email: 254, message: 2000 };
  var status = document.getElementById("form-status");
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
  var ALLOWED = { plan: ["Not sure yet", "Starter", "Business", "Custom"], budget: ["Under £2k", "£2k – £5k", "£5k – £10k", "£10k+"] };

  // Strip control characters (incl. CR/LF) from single-line fields.
  function clean(v, max, multiline) {
    v = String(v || "").replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "").trim();
    return v.slice(0, max);
  }
  function pick(v, list) { return list.indexOf(v) !== -1 ? v : list[0]; }

  var lastSend = 0;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = form.elements;
    var data = {
      name: clean(d.name.value, LIMITS.name),
      email: clean(d.email.value, LIMITS.email),
      message: clean(d.message.value, LIMITS.message, true),
      plan: pick(d.plan.value, ALLOWED.plan),
      budget: pick(d.budget.value, ALLOWED.budget)
    };
    var checks = { name: data.name.length > 0, email: EMAIL_RE.test(data.email), message: data.message.length >= 10 };
    var firstBad = null;
    Object.keys(checks).forEach(function (n) {
      d[n].classList.toggle("is-invalid", !checks[n]);
      d[n].setAttribute("aria-invalid", String(!checks[n]));
      if (!checks[n] && !firstBad) firstBad = d[n];
    });
    if (firstBad) {
      status.className = "form__status err";
      status.textContent = "Please add your name, a valid email address and a few details about the project (at least 10 characters).";
      firstBad.focus();
      return;
    }
    if (Date.now() - lastSend < 5000) return; // ignore double clicks
    lastSend = Date.now();
    var body = "Name: " + data.name + "\nEmail: " + data.email + "\nPackage: " + data.plan +
      "\nBudget: " + data.budget + "\n\n" + data.message;
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("Project enquiry from " + data.name) +
      "&body=" + encodeURIComponent(body);
    status.className = "form__status ok";
    status.textContent = "Thanks. Your email app should now open with the message ready to send.";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
