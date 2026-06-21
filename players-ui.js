/* ============================================================
   players-ui.js — standalone audio players + "listen to continue" gates
   ------------------------------------------------------------
   BLOCK SNIPPET (a found-recording card between paragraphs):
     <figure class="audio-block" id="rec-1"
             data-src="audio/voicemail.mp3"
             data-label="voicemail — 2:14 a.m."
             data-caption="I saved it. I could never delete it."></figure>

   BIG INTERLUDE PLAYER (the whole screen is the recording):
     <div class="audio-interlude" id="il-rec"
          data-src="audio/interlude.mp3"
          data-label="found audio — unmarked"></div>

   LISTEN-GATE (locked until a referenced player finishes):
     <a class="gate-continue listen-gate" data-requires="#il-rec"
        href="chapter-2.html">continue</a>
     <div class="afterword listen-gate" data-requires="#rec-2">…revealed text…</div>

   Missing files fail gracefully: the gate releases anyway so the
   prototype is never stuck while you're still adding audio.
   ============================================================ */
(function () {
  "use strict";

  const instances = [];

  function fmt(t) {
    if (!isFinite(t)) return "0:00";
    t = Math.max(0, t | 0);
    const m = (t / 60) | 0, s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function build(el, big) {
    const src = el.getAttribute("data-src");
    const label = el.getAttribute("data-label") || "recording";
    const caption = el.getAttribute("data-caption") || "";
    const audio = new Audio();
    audio.preload = "metadata";
    let missing = false;

    el.classList.add(big ? "ap-big" : "ap-block");
    el.innerHTML =
      '<button class="ap-play" type="button" aria-label="play">▶</button>' +
      '<div class="ap-body">' +
        '<div class="ap-label">' + label + "</div>" +
        '<div class="ap-bar"><span class="ap-fill"></span></div>' +
        '<div class="ap-time"><span class="ap-cur">0:00</span>' +
          '<span class="ap-state"></span>' +
          '<span class="ap-dur">--:--</span></div>' +
      "</div>";
    if (caption) {
      const c = document.createElement("figcaption");
      c.className = "ap-caption";
      c.textContent = caption;
      el.appendChild(c);
    }

    const btn = el.querySelector(".ap-play");
    const fill = el.querySelector(".ap-fill");
    const cur = el.querySelector(".ap-cur");
    const dur = el.querySelector(".ap-dur");
    const bar = el.querySelector(".ap-bar");
    const state = el.querySelector(".ap-state");

    function markMissing() {
      missing = true;
      state.textContent = "file not added";
      el.classList.add("missing");
      el.dispatchEvent(new CustomEvent("ap:done", { bubbles: true }));
    }

    audio.addEventListener("loadedmetadata", () => { dur.textContent = fmt(audio.duration); });
    audio.addEventListener("durationchange", () => { if (isFinite(audio.duration)) dur.textContent = fmt(audio.duration); });
    audio.addEventListener("timeupdate", () => {
      cur.textContent = fmt(audio.currentTime);
      if (audio.duration) fill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
    });
    audio.addEventListener("play", () => {
      instances.forEach((a) => { if (a !== audio) a.pause(); });
      btn.textContent = "❚❚";
      el.classList.add("playing");
      state.textContent = "";
    });
    audio.addEventListener("pause", () => {
      if (!audio.ended) { btn.textContent = "▶"; el.classList.remove("playing"); }
    });
    audio.addEventListener("ended", () => {
      btn.textContent = "↺";
      el.classList.remove("playing");
      el.classList.add("heard");
      el.dispatchEvent(new CustomEvent("ap:done", { bubbles: true }));
    });
    audio.addEventListener("error", markMissing);

    // set source LAST, after listeners are wired, so a fast/cached load
    // can't fire loadedmetadata/error before we're listening for it
    if (src) { audio.src = src; } else { markMissing(); }

    btn.addEventListener("click", () => {
      if (missing) { el.dispatchEvent(new CustomEvent("ap:done", { bubbles: true })); return; }
      if (audio.paused) { audio.play().catch(() => {}); }
      else audio.pause();
    });
    bar.addEventListener("click", (e) => {
      if (!audio.duration) return;
      const r = bar.getBoundingClientRect();
      audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
    });

    instances.push(audio);
  }

  /* ---- listen-gates ---- */
  function release(g) {
    g.classList.add("released");
    const hint = g.querySelector(".gate-hint");
    if (hint) hint.remove();
  }

  function setupGates() {
    document.querySelectorAll(".listen-gate[data-requires]").forEach((g) => {
      const target = document.querySelector(g.getAttribute("data-requires"));
      if (!target) { release(g); return; }
      // 'ap:done' fires on natural end OR on a missing file → humane release
      target.addEventListener("ap:done", () => release(g), { once: true });
    });
  }

  function init() {
    document.querySelectorAll(".audio-block").forEach((el) => build(el, false));
    document.querySelectorAll(".audio-interlude").forEach((el) => build(el, true));
    setupGates();
  }

  window.ConjuringPlayers = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
