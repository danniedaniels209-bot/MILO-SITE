/* MiloLoop — seamless crossfade loop for hero-loop.mp4 (Screen 1).
 *
 * Owned by OPENCODE. Contract surface is exactly:
 *   window.MiloLoop = { mount(rootEl), start(), stop() }
 * Drift evidence is reported via console.info (no extra API surface).
 *
 * Method: two stacked <video> elements. The standby starts 0.4s before the
 * active ends and fades in over the seam (8.7% last-vs-first difference,
 * correlation 0.852 — a hard loop visibly jumps every 8s). Roles then swap.
 * The ONLY timeupdate/rvfc-style monitoring in the build lives here, per the
 * 12:02 binding rule. Nothing else in the DOM keys off video events.
 */
(function () {
  'use strict';

  var XFADE = 0.4; // seconds of overlap
  var SRC_DEFAULT = 'assets/hero-loop-web.mp4';  // faststart, 6.17MB — the 8.57MB original is not shipped
  var POSTER_DEFAULT = 'assets/poster-hero.jpg';
  var MAX_SAMPLES = 360; // 48 min of 8s loops of drift history

  function reducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function makeVideo(doc, src, poster) {
    var v = doc.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    if (poster) v.poster = poster;
    v.src = src;
    v.style.position = 'absolute';
    v.style.inset = '0';
    v.style.width = '100%';
    v.style.height = '100%';
    v.style.objectFit = 'cover';
    v.style.opacity = '0';
    v.style.transition = 'opacity ' + XFADE + 's linear';
    return v;
  }

  function safePlay(v) {
    try {
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {
      /* autoplay policy: shell retries on user gesture */
    }
  }

  var root = null;
  var vidA = null;
  var vidB = null;
  var active = null;
  var standby = null;
  var standbyStarted = false;
  var running = false;
  var rafId = 0;
  var swaps = 0;
  var samples = [];
  var singleShot = false; // reduced-motion mode: play once, hold last frame

  function logSwap(info) {
    samples.push(info);
    if (samples.length > MAX_SAMPLES) samples.shift();
    if (typeof console !== 'undefined' && console.info) {
      console.info(
        '[MiloLoop] swap #' + info.n + ' at ' + info.wallClock +
        ' activeT=' + info.activeT.toFixed(3) +
        ' standbyT=' + info.standbyT.toFixed(3)
      );
    }
  }

  function completeSwap() {
    var finished = active;
    finished.pause();
    finished.style.opacity = '0';
    try { finished.currentTime = 0; } catch (e) {}
    active = standby;
    standby = finished;
    standbyStarted = false;
    swaps += 1;
    logSwap({
      n: swaps,
      wallClock: new Date().toISOString(),
      activeT: active.currentTime,
      standbyT: standby.currentTime
    });
  }

  function tick() {
    rafId = 0;
    if (!running || !active) return;
    var d = active.duration;
    var t = active.currentTime;
    if (isFinite(d) && d > 0) {
      if (!standbyStarted && d - t <= XFADE) {
        standbyStarted = true;
        try { standby.currentTime = 0; } catch (e) {}
        standby.style.opacity = '1';
        safePlay(standby);
      }
      if (standbyStarted && (active.ended || t >= d - 0.05)) {
        completeSwap();
      }
    }
    if (running) {
      rafId = window.requestAnimationFrame
        ? window.requestAnimationFrame(tick)
        : window.setTimeout(tick, 50);
    }
  }

  function kickMonitor() {
    if (rafId) return;
    if (window.requestAnimationFrame) rafId = window.requestAnimationFrame(tick);
    else rafId = window.setTimeout(tick, 50);
  }

  function stopMonitor() {
    if (!rafId) return;
    if (window.cancelAnimationFrame) window.cancelAnimationFrame(rafId);
    else window.clearTimeout(rafId);
    rafId = 0;
  }

  var api = {
    mount: function (rootEl) {
      if (!rootEl) throw new Error('[MiloLoop] mount requires a container element');
      if (rootEl.__miloLoopMounted) return api;
      root = rootEl;
      var doc = rootEl.ownerDocument || document;
      var ds = rootEl.dataset || {};
      var src = ds.src || SRC_DEFAULT;
      var poster = ds.poster || POSTER_DEFAULT;
      var cs = null;
      try { cs = window.getComputedStyle(rootEl); } catch (e) {}
      if (cs && cs.position === 'static') rootEl.style.position = 'relative';
      rootEl.style.overflow = 'hidden';

      vidA = makeVideo(doc, src, poster);
      vidB = makeVideo(doc, src, poster);
      rootEl.appendChild(vidA);
      rootEl.appendChild(vidB);
      active = vidA;
      standby = vidB;
      singleShot = reducedMotion();
      rootEl.__miloLoopMounted = true;
      return api;
    },

    start: function () {
      if (!active) throw new Error('[MiloLoop] call mount(rootEl) before start()');
      running = true;
      if (singleShot) {
        // Reduced motion: play once, hold the last frame. No loop, no crossfade.
        active.style.transition = 'none';
        active.style.opacity = '1';
        try { active.currentTime = 0; } catch (e) {}
        safePlay(active);
        return;
      }
      if (active.style.opacity !== '1') active.style.opacity = '1';
      safePlay(active);
      kickMonitor();
    },

    stop: function () {
      running = false;
      stopMonitor();
      if (vidA) { try { vidA.pause(); } catch (e) {} }
      if (vidB) { try { vidB.pause(); } catch (e) {} }
    }
  };

  window.MiloLoop = api;
})();
