# MILO — Energy That Runs

A two-screen, video-driven brand demo. The film *is* the page: a looping hero plays
full-bleed behind live HTML, and the interface is layered over it.

**Live flow:** screen 1 loops → `GO FURTHER` plays the transition forward → screen 2 →
`BACK` plays the same transition in reverse → the loop resumes.

## Running it

No build step, no dependencies, no package manager.

```bash
python -m http.server 8017      # then open http://127.0.0.1:8017
```

Opening `index.html` directly works too, though a server is better for video range
requests.

## Deploying

`render.yaml` is a Render Blueprint: **New ▸ Blueprint ▸ point at this repo**. It
serves the directory as-is and sets long cache headers on `/assets/*`, which matters
because the payload is ~25 MB of video.

## How it's put together

```
index.html        shell, state machine, both screens
css/base.css      tokens, stage, chrome, accessibility
css/screen1.css   hero UI — captions, Nigeria mark, CTA, pause control
css/screen2.css   ingredient screen — hotspots, Back
js/loop.js        seamless crossfade loop
js/cta.js         the GO FURTHER pill
assets/           video, posters, logo
```

### Things worth knowing before editing

**Most of what you see is baked into the video, not the DOM.** The giant
"ENERGY THAT RUNS" headline, the tin, the cocoa debris and the swirl are all in
`hero-loop-web.mp4`. On screen 2 the mug, the "WHAT FUELS YOU?" headline, the subhead
and both ingredient columns are in `transition-forward.mp4`. Rebuild any of it in HTML
and it doubles on screen.

**Nothing binds to video events.** Entry animations key off an `.is-active` class
toggle, never `timeupdate` or `ended`. That's deliberate: the hero loops every 8
seconds, and anything keyed to playback would re-trigger forever. The single exception
is the crossfade inside `loop.js`, which genuinely needs playback position.

**The loop is crossfaded, not looped.** The clip's first and last frames differ by
8.7%, so a plain `loop` attribute visibly jumps every 8 seconds. Two stacked video
elements overlap by 0.4s instead.

**The reverse is a separate encode, not played backwards.** Browsers cannot play video
in reverse — negative `playbackRate` is unimplemented everywhere. `transition-reverse.mp4`
is a pre-rendered reversal at CRF 16, measured at 46.5 dB PSNR against the forward clip.

**UI placement was measured, not guessed.** A Laplacian detail map was averaged across
all 192 frames to find where the picture stays quiet enough to carry text. The corners
score 4–9; dead centre scores 164. Everything sits accordingly.

**Accessibility:** the baked headlines are invisible to screen readers and search, so
hidden `h1`/`h2` elements mirror them. The looping hero has a pause control, required
by WCAG 2.2.2 for motion that runs longer than five seconds.
