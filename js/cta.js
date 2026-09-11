/* MiloCTA — GO FURTHER beacon pill (Screen 1). Proposal 2, as decided 12:02.
 *
 * Owned by OPENCODE. Contract surface is exactly:
 *   window.MiloCTA = { mount(rootEl), show(), hide() }
 * Clicks dispatch a bubbling 'milo:go-further' CustomEvent for the shell's
 * state machine. Styles are injected by this file so nothing in css/ is
 * touched (strict file ownership). Colours ride CSS vars --cta-lime /
 * --cta-green so base.css can re-theme without editing this file.
 *
 * Calm-vs-obvious resolution: bottom-centre placement (zone 37.0, where eyes
 * look), calm from cream halo + contrast, obviousness from a beacon arrow
 * that detaches and travels on a 4s loop-agnostic keyframe. Label ALWAYS
 * visible — no hover-gated text, touch-safe. Magnetic lean is gated behind
 * (any-hover: hover) and (pointer: fine).
 */
(function () {
  'use strict';

  var STYLE_ID = 'milo-cta-styles';
  var MAGNET_RADIUS = 120; // px around the button centre
  var MAGNET_SHELL = 0.3;  // shell follows 30% of cursor offset
  var MAGNET_LABEL = 0.45; // label parallaxes harder than the shell

  var CSS =
    '.milo-cta{position:relative;display:inline-flex;align-items:center;gap:.6em;' +
    'padding:.9em 1.6em;border:0;border-radius:999px;cursor:pointer;' +
    'background:var(--cta-lime,#C8E346);color:var(--cta-green,#0A3D2C);' +
    'font:700 1rem/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
    'letter-spacing:.14em;text-transform:uppercase;' +
    'box-shadow:0 0 0 3px rgba(250,246,230,.85),0 10px 30px rgba(0,0,0,.35);' +
    'transition:opacity .2s linear,visibility .2s linear,translate .45s cubic-bezier(.2,.8,.2,1);' +
    'will-change:translate;}' +
    '.milo-cta.is-hidden{opacity:0;visibility:hidden;pointer-events:none;}' +
    '.milo-cta:focus-visible{outline:3px solid #FAF6E6;outline-offset:3px;}' +
    '.milo-cta__label{display:inline-block;transition:translate .45s cubic-bezier(.2,.8,.2,1);}' +
    '.milo-cta__arrow{display:inline-flex;width:1.1em;height:1.1em;flex:none;' +
    'animation:milo-beacon 4s linear infinite;}' +
    '.milo-cta__arrow svg{width:100%;height:100%;display:block;}' +
    '@keyframes milo-beacon{' +
    '0%{translate:0 0;opacity:1;}' +
    '55%{translate:0 0;opacity:1;}' +
    '80%{translate:24px 0;opacity:0;}' +
    '81%{translate:-10px 0;opacity:0;}' +
    '100%{translate:0 0;opacity:1;}}' +
    '@media (prefers-reduced-motion:reduce){' +
    '.milo-cta,.milo-cta__label{transition:none;}' +
    '.milo-cta__arrow{animation:none;}}';

  function finePointer() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(any-hover: hover) and (pointer: fine)').matches
    );
  }

  function injectStyles(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    var el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    doc.head.appendChild(el);
  }

  function svgArrow(doc) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var path = doc.createElementNS(NS, 'path');
    path.setAttribute('d', 'M3 12h16M13 5l7 7-7 7');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  var btn = null;
  var label = null;
  var magnetOn = false;

  function onMove(e) {
    if (!btn || btn.classList.contains('is-hidden')) return;
    var r = btn.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) > MAGNET_RADIUS + Math.max(r.width, r.height) / 2) {
      btn.style.translate = '0px 0px';
      if (label) label.style.translate = '0px 0px';
      return;
    }
    btn.style.translate = (dx * MAGNET_SHELL).toFixed(1) + 'px ' + (dy * MAGNET_SHELL).toFixed(1) + 'px';
    if (label) label.style.translate = (dx * MAGNET_LABEL).toFixed(1) + 'px ' + (dy * MAGNET_LABEL).toFixed(1) + 'px';
  }

  function onLeave() {
    if (!btn) return;
    btn.style.translate = '0px 0px';
    if (label) label.style.translate = '0px 0px';
  }

  var api = {
    mount: function (rootEl) {
      if (!rootEl) throw new Error('[MiloCTA] mount requires a container element');
      if (rootEl.__miloCTAMounted) return api;
      var doc = rootEl.ownerDocument || document;
      injectStyles(doc);

      btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'milo-cta is-hidden';
      btn.setAttribute('aria-label', 'Go further');

      label = doc.createElement('span');
      label.className = 'milo-cta__label';
      label.textContent = 'Go Further';

      var arrow = doc.createElement('span');
      arrow.className = 'milo-cta__arrow';
      arrow.appendChild(svgArrow(doc));

      btn.appendChild(label);
      btn.appendChild(arrow);
      btn.addEventListener('click', function () {
        var evt;
        try {
          evt = new CustomEvent('milo:go-further', { bubbles: true, cancelable: true });
        } catch (e) {
          evt = doc.createEvent('CustomEvent');
          evt.initCustomEvent('milo:go-further', true, true, null);
        }
        btn.dispatchEvent(evt);
      });

      rootEl.appendChild(btn);
      if (finePointer() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        magnetOn = true;
        btn.addEventListener('pointermove', onMove);
        btn.addEventListener('pointerleave', onLeave);
      }
      rootEl.__miloCTAMounted = true;
      return api;
    },

    show: function () {
      if (!btn) throw new Error('[MiloCTA] call mount(rootEl) before show()');
      btn.classList.remove('is-hidden');
      btn.setAttribute('aria-hidden', 'false');
    },

    hide: function () {
      if (!btn) throw new Error('[MiloCTA] call mount(rootEl) before hide()');
      btn.classList.add('is-hidden');
      btn.setAttribute('aria-hidden', 'true');
      onLeave();
    }
  };

  window.MiloCTA = api;
})();
