(function () {
  "use strict";
  var root = document.documentElement;

  // ---- Theme toggle (remembers choice; falls back to system preference) ----
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var saved = safeGet("theme");
  var prefersDark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    safeSet("theme", next);
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
      var s = document.querySelector(a.getAttribute("href"));
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
        c.setAttribute("aria-selected", String(on));
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

  // ---- Contact form: validation, then opens the visitor's email app ----
  // No backend here. To use a form service (Formspree, Netlify Forms, etc.),
  // set the form's action and remove the mailto step.
  var status = document.getElementById("form-status");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    ["name", "email", "message"].forEach(function (n) {
      var f = form.elements[n];
      var valid = f.value.trim() !== "" && (n !== "email" || /^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) {
      status.className = "form__status err";
      status.textContent = "Please fill in your name, a valid email and a few project details.";
      return;
    }
    var d = form.elements;
    var body = "Name: " + d.name.value + "\nEmail: " + d.email.value + "\nPackage: " + d.plan.value +
      "\nBudget: " + d.budget.value + "\n\n" + d.message.value;
    window.location.href = "mailto:hello@example.com?subject=" + encodeURIComponent("New project enquiry") +
      "&body=" + encodeURIComponent(body);
    status.className = "form__status ok";
    status.textContent = "Thanks! Your email app should open with the message ready to send.";
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
