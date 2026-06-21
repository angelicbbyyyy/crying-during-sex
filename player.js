/* ============================================================
   player.js — background music + inline audio snippets
   MUSIC: each .chapter can declare data-track="audio/xxx.mp3".
          As you scroll into a chapter, its track crossfades in.
          Drop files into /audio later — missing files fail quietly.
   SNIPPETS: <span class="audio-cue" data-src="audio/whisper.mp3"
                   data-auto>text</span>
          plays on click; with data-auto it also plays once when
          scrolled into view.
   Playback position + muted state persist in localStorage.
   ============================================================ */
(function () {
  "use strict";

  const LS = "cds_audio_v1";
  const saved = JSON.parse(localStorage.getItem(LS) || "{}");

  const music = new Audio();
  music.loop = true;
  music.preload = "auto";
  let muted = saved.muted || false;
  let currentSrc = null;
  let available = false; // does the current track actually exist?

  music.volume = 0;

  /* ---- UI refs ---- */
  let elPlayer, elBtn, elTrack, elState, elWrap;

  function buildUI() {
    elPlayer = document.getElementById("player");
    elBtn = document.getElementById("pl-toggle");
    elTrack = document.getElementById("pl-track");
    elState = document.getElementById("pl-state");
    if (!elBtn) return;
    elBtn.addEventListener("click", toggleMute);
  }

  function setState(txt) { if (elState) elState.textContent = txt; }
  function setTrackName(src) {
    if (!elTrack) return;
    elTrack.textContent = src ? src.split("/").pop().replace(/\.[^.]+$/, "") : "silence";
  }

  function persist() {
    localStorage.setItem(
      LS,
      JSON.stringify({ muted, src: currentSrc, t: music.currentTime || 0 })
    );
  }
  setInterval(() => { if (!music.paused) persist(); }, 4000);

  /* ---- fade helpers ---- */
  function fadeTo(target, ms) {
    const start = music.volume;
    const t0 = performance.now();
    function step(now) {
      const k = Math.min(1, (now - t0) / ms);
      music.volume = start + (target - start) * k;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function loadTrack(src) {
    if (src === currentSrc) return;
    currentSrc = src;
    setTrackName(src);
    available = false;
    setState("cueing…");

    if (!src) { fadeTo(0, 600); setState("no track"); return; }

    // fade out the old, swap, fade in the new — if it exists
    fadeTo(0, 500);
    setTimeout(() => {
      music.src = src;
      // resume position if same file as last session
      if (saved.src === src && saved.t) {
        music.currentTime = saved.t;
      }
      const tryPlay = music.play();
      if (tryPlay && tryPlay.catch) {
        tryPlay.catch(() => { /* autoplay blocked — waits for tap */ });
      }
    }, 520);
  }

  music.addEventListener("canplay", () => {
    available = true;
    if (!muted) { fadeTo(0.55, 1600); setState("playing"); elPlayer && elPlayer.classList.remove("paused"); }
    else setState("muted");
  });
  music.addEventListener("error", () => {
    available = false;
    setState("file not added");
    elPlayer && elPlayer.classList.add("paused");
  });

  function toggleMute() {
    muted = !muted;
    if (muted) {
      fadeTo(0, 400);
      setState("muted");
      elBtn.textContent = "▶";
      elPlayer.classList.add("paused");
    } else {
      const p = music.play();
      if (p && p.catch) p.catch(() => {});
      if (available) { fadeTo(0.55, 1000); setState("playing"); }
      else setState("file not added");
      elBtn.textContent = "❚❚";
      elPlayer.classList.remove("paused");
    }
    persist();
  }

  /* ---- chapter → track via IntersectionObserver ---- */
  function watchChapters() {
    const chapters = document.querySelectorAll(".chapter[data-track]");
    if (!chapters.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) loadTrack(e.target.getAttribute("data-track"));
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0.01 }
    );
    chapters.forEach((c) => obs.observe(c));
  }

  /* ---- inline snippet cues ---- */
  const cuePool = {};
  function playCue(el) {
    const src = el.getAttribute("data-src");
    if (!src) return;
    let a = cuePool[src];
    if (!a) { a = cuePool[src] = new Audio(src); }
    a.currentTime = 0;
    el.classList.add("playing");
    a.play().catch(() => { el.classList.remove("playing"); });
    a.onended = () => el.classList.remove("playing");
    a.onerror = () => el.classList.remove("playing");
  }
  function watchCues() {
    const cues = document.querySelectorAll(".audio-cue");
    cues.forEach((el) => el.addEventListener("click", () => playCue(el)));
    const autoCues = document.querySelectorAll(".audio-cue[data-auto]");
    if (autoCues.length) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !e.target.dataset.fired) {
              e.target.dataset.fired = "1";
              playCue(e.target);
              obs.unobserve(e.target);
            }
          });
        },
        { rootMargin: "-35% 0px -35% 0px", threshold: 0.6 }
      );
      autoCues.forEach((el) => obs.observe(el));
    }
  }

  window.Conjuring = window.Conjuring || {};
  window.Conjuring.initAudio = function () {
    buildUI();
    elBtn && (elBtn.textContent = muted ? "▶" : "❚❚");
    if (muted) { elPlayer && elPlayer.classList.add("paused"); setState("muted"); }
    // kick the first chapter's track
    const first = document.querySelector(".chapter[data-track]");
    if (first) loadTrack(first.getAttribute("data-track"));
    watchChapters();
    watchCues();
  };

  /* ---- hard stop when the page goes away ----
     A normal navigation drops the page, but the browser's back/forward
     cache can keep it (and its audio) alive. Pause + save on pagehide so
     the music never outlives the page the reader left. */
  function stopForLeave() {
    try { persist(); } catch (e) {}
    music.pause();
    Object.keys(cuePool).forEach((k) => { try { cuePool[k].pause(); } catch (e) {} });
  }
  window.addEventListener("pagehide", stopForLeave);
  window.addEventListener("beforeunload", stopForLeave);
})();
