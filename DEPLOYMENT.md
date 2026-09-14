# Deployment Guide

## Build & hosting setup

- **Framework**: Vite (React + TypeScript). `vite.config.ts` splits vendor
  code (`three`/`three-stdlib`, `@react-three/*`, `gsap`, `react`) into
  separate chunks so a future app-code release doesn't force everyone to
  re-download the heavy 3D libraries too.
- **Vercel**: `vercel.json` sets `framework: "vite"`, `outputDirectory: "dist"`,
  and `buildCommand: "npm run build"`. Vercel's Vite preset would infer most
  of this automatically, but they're pinned explicitly so the build doesn't
  silently change behavior if that auto-detection ever changes.
- **Assets**: `.glb`, `.mp3`, and (if self-hosted) Draco decoder files belong
  in `public/models/`, `public/audio/`, and `public/draco/` respectively —
  matching the hardcoded paths in `scene/models/ModelLoader.tsx`'s
  `ASSET_URLS` and `audio/HeartbeatAudio.tsx`'s default `audioUrl`.

## Asset caching — read this before enabling long-lived caching

`vercel.json` sets `Cache-Control: public, max-age=31536000, immutable` on
`/models/*`, `/audio/*`, and `/draco/*`. This is correct and desirable for
large binary assets — but there's a real gotcha specific to this project:

**GLTF/audio URLs are hardcoded strings, not Vite-hashed imports.** Vite only
fingerprints (adds a content hash to) assets it processes through its import
pipeline (`import x from './foo.png'`). Files sitting in `public/` and
referenced by a raw string path — which is exactly what `ASSET_URLS` in
`ModelLoader.tsx` does — are served under their literal filename forever,
with no automatic cache-busting.

Combined with `immutable` caching, that means: **if you update
`bedroom-environment.glb` in place and redeploy, returning visitors' browsers
(and Vercel's edge cache) will keep serving the OLD file for up to a year.**

Two ways to handle this:

1. **Version the filename** (recommended): `bedroom-environment.v2.glb`, and
   update `ASSET_URLS` in `ModelLoader.tsx` to match. Old cached copies under
   the old filename become irrelevant; new requests hit the new, distinct
   URL. This is what the `immutable` header is designed for.
2. **Shorten the cache lifetime** instead of versioning filenames — e.g.
   `public, max-age=86400, stale-while-revalidate=604800` — if you'd rather
   not manage filename versions and can tolerate assets taking up to a day
   to update for returning visitors.

`/assets/*` (Vite's own hashed JS/CSS output) doesn't have this problem —
those filenames already change automatically whenever their content does, so
`immutable` is always safe there.

## Draco decoder

`ModelLoader.tsx` defaults `DRACO_DECODER_PATH` to Google's hosted CDN
(`gstatic.com/draco/...`) for zero-setup. For production, consider
self-hosting instead (copy `node_modules/three/examples/jsm/libs/draco/` into
`public/draco/`, point `DRACO_DECODER_PATH` at `/draco/`):

- Removes a third-party runtime dependency / potential outage.
- One fewer DNS lookup + TLS handshake on first load.
- Lets `/draco/*`'s long-lived cache header (already in `vercel.json`) apply.

## Environment / build settings on Vercel

- **Framework Preset**: Vite (should auto-detect from `vercel.json`).
- **Node version**: 18.x or later.
- **Build Command**: `npm run build` (override only if you've customized `package.json`).
- **Output Directory**: `dist`.
- No environment variables are required by the app as shipped — everything
  (Draco path, asset URLs) is a compile-time constant in source, not read
  from `import.meta.env`. If you later add analytics or a real CDN base URL
  for assets, that's the point to introduce `VITE_`-prefixed env vars.

## Pre-launch testing checklist

**Performance**
- [ ] Throttle CPU 4-6x in DevTools and confirm the scene stays usable —
      Performance Mode (Director Workbench, or auto-enabled on touch-primary
      /small-viewport/low-core devices — see `App.tsx`'s `looksLikeALowPowerDevice`)
      should visibly reduce load: no DoF, no chromatic aberration, DPR
      flattened to 1, smaller shadow maps.
- [ ] Confirm `dpr` is actually capped — check `window.devicePixelRatio` on a
      3x-DPR phone and verify the canvas isn't rendering at that full ratio
      (Performance tab / GPU frame time is the practical way to tell).
- [ ] Watch memory in DevTools across several chapter jumps/scrubs — should
      stay flat, not climb monotonically (would indicate a disposal leak).

**Mobile & touch**
- [ ] Test on an actual touch device, not just DevTools' device toolbar —
      touch-action and pointer-event edge cases don't always reproduce in
      emulation.
- [ ] Confirm dragging in Free/Director camera mode doesn't trigger page
      scroll (this is what `style={{ touchAction: 'none' }}` on the Canvas
      in `SceneCanvas.tsx` fixes — verify it's still there if you touch that file).
- [ ] Open the Director Workbench on a narrow (< 380px) viewport and confirm
      the panel doesn't overflow off-screen.
- [ ] Confirm the "Enter the Room" button reliably starts audio on iOS
      Safari specifically — it's the strictest about requiring the
      `AudioContext.resume()` call to be synchronous within the gesture.

**WebGL fallback & error handling**
- [ ] Disable WebGL (`chrome://flags` -> "Disable WebGL", or Firefox's
      `webgl.disabled` in `about:config`) and confirm `WebGLIssueScreen`
      appears instead of a crash or blank page.
- [ ] Simulate context loss in DevTools console:
      `const canvas = document.querySelector('canvas'); canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();`
      — confirm the "Rendering interrupted" overlay appears, and test
      whether your target browsers auto-restore (call `.restoreContext()` on
      the same extension object to simulate recovery).
- [ ] Force a render-time error (temporarily throw inside any component
      mounted in `SceneCanvas.tsx`) and confirm `SceneErrorBoundary` catches
      it with the "Something went wrong" screen, not a blank page.
- [ ] Rename/remove a `.glb` under `public/models/` temporarily and confirm
      the corresponding `ModelErrorBoundary` falls back to primitive
      geometry rather than taking down the whole scene.

**Assets**
- [ ] Verify actual file sizes of your final `.glb`/`.mp3` assets — Draco
      compression matters most for high-poly meshes; confirm it's actually
      reducing size meaningfully for what you exported.
- [ ] Check `Cache-Control` response headers in Network tab after deploying,
      for both `/models/*` and `/assets/*`, to confirm `vercel.json` is
      actually being applied (Vercel occasionally needs a fresh deploy, not
      just a preview, for header changes to take effect).

**Post-deploy**
- [ ] Full run-through, Chapter 1 -> 8, on both desktop and one mobile device.
- [ ] Lighthouse pass (mobile + desktop) — expect the 3D bundle to weigh down
      the performance score somewhat; treat it as a baseline to track, not a
      100 to chase.
