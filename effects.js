/* ============================================================
   effects.js — text-effect engine + scroll choreography
   AUTHORING SYNTAX (wrap words/phrases in your prose):
     <span class="fx-scribble">word</span>   pen scribbles it out
     <span class="fx-redact">word</span>     black bar slides shut
     <span class="fx-erase">phrase</span>    letters wash away (gone once)
     <span class="fx-repress">phrase</span>  surfaces, then drowns — won't let you read
     <span class="fx-glitch">word</span>     RGB split / static
     <span class="fx-stutter">word</span>    word repeats/overwrites itself
   Add data-trauma to a <p> to make ITS reveal trigger a lake "flood".
   ============================================================ */
(function () {
  "use strict";

  /* ---- split text into per-letter spans (erase / repress) ---- */
  function letterize(el) {
    if (el.dataset.lettered) return;
    const text = el.textContent;
    el.textContent = "";
    for (const c of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      if (c === " ") s.innerHTML = "&nbsp;";
      el.appendChild(s);
    }
    el.dataset.lettered = "1";
  }

  /* ---- give glitch/stutter their data-text mirror ---- */
  function mirror(el) {
    if (!el.dataset.text) el.dataset.text = el.textContent;
  }

  function prep() {
    document.querySelectorAll(".fx-erase, .fx-repress").forEach(letterize);
    document.querySelectorAll(".fx-glitch, .fx-stutter").forEach(mirror);
  }

  /* ---- reveal lines as they're reached (paced reading) ---- */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("seen");
          revealObs.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -22% 0px", threshold: 0.1 }
  );

  /* ---- fire effects when the marked span enters the "reading zone" ---- */
  const fxObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-active");
          // one-shot effects don't need re-firing
          if (e.target.matches(".fx-erase, .fx-scribble, .fx-redact")) {
            fxObs.unobserve(e.target);
          }
        } else if (e.target.matches(".fx-glitch, .fx-stutter, .fx-repress")) {
          // let looping/dramatic effects rest when off-screen
          e.target.classList.remove("is-active");
        }
      });
    },
    { rootMargin: "-30% 0px -30% 0px", threshold: 0.5 }
  );

  /* ---- lake flood: paragraphs marked data-trauma raise the water ---- */
  const flood = document.getElementById("flood");
  let floodLevel = 0;
  const traumaObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          floodLevel = Math.min(floodLevel + 1, 5);
        } else {
          floodLevel = Math.max(floodLevel - 1, 0);
        }
      });
      if (flood) flood.style.height = floodLevel * 9 + "vh";
    },
    { rootMargin: "-25% 0px -25% 0px", threshold: 0.4 }
  );

  function observeAll() {
    document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
    document
      .querySelectorAll(".fx-scribble, .fx-redact, .fx-erase, .fx-repress, .fx-glitch, .fx-stutter")
      .forEach((el) => fxObs.observe(el));
    document.querySelectorAll("[data-trauma]").forEach((el) => traumaObs.observe(el));
  }

  /* auto-wrap each .prose paragraph as a reveal line (unless opted out) */
  function autoReveal() {
    document.querySelectorAll(".prose p, .prose .hand, .scene-break").forEach((el) => {
      if (!el.classList.contains("no-reveal")) el.classList.add("reveal");
    });
  }

  /* reading progress bar */
  function progress() {
    const bar = document.getElementById("progress");
    if (!bar) return;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? (window.scrollY / h) * 100 + "%" : "0";
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* expose a hook so the reader can (re)initialise after entry */
  window.Conjuring = window.Conjuring || {};
  window.Conjuring.initEffects = function () {
    autoReveal();
    prep();
    observeAll();
    progress();
  };

  document.addEventListener("DOMContentLoaded", function () {
    // prep happens lazily once the reader opens; nothing to do here yet.
  });
})();
