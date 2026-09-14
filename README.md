# The Tell-Tale Heart — Interactive Cinematic Experience

An interactive, 3D, spatial-audio telling of Edgar Allan Poe's *The
Tell-Tale Heart*, built with React, react-three-fiber, and the Web Audio
API. Eight chapters, a rising heartbeat that drives lighting/audio/post-
processing tension, a GSAP-driven cinematic camera with a free "Director"
mode, interactive floorboards, WebXR (VR) support, and a save/export system.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL. Click "Enter the Room" to begin — this is also
what unlocks audio (browsers require a real click before playing sound).

## Scripts

| Command             | What it does                                 |
| -------------------- | --------------------------------------------- |
| `npm run dev`         | Local dev server (Vite)                       |
| `npm run build`       | Type-checks (`tsc -b`) then production build  |
| `npm run preview`     | Serves the production build locally           |
| `npm run typecheck`   | Type-checks only, no build output             |

## Project structure

```
src/
  App.tsx             Root: WebGL detection, start gate, error boundary, layout
  main.tsx             React entry point
  data/                Chapter text, timestamps, camera keyframes
  store/                Zustand stores (playback, renderer prefs, progress, ...)
  scene/                Everything mounted inside <Canvas> — camera, lighting,
                         post-processing, XR, interaction, chapter orchestration
  scene/models/          GLTF loading + Room/Floorboards/Props (with primitive
                         fallbacks if assets are missing)
  audio/                Web Audio: heartbeat, ambient layers, master bus
  media/                MediaRecorder + high-res snapshot capture
  ui/                   DOM overlay: control bar, subtitles, Director Workbench,
                         loading/error/completion screens
  hooks/, utils/         Small shared utilities

nextjs-variant/page.tsx   Optional Next.js App Router equivalent of App.tsx.
                          NOT part of the Vite build (lives outside src/ on
                          purpose) — see the comment at the top of that file
                          for how to use it in an actual Next.js project.
```

## Assets

This repo ships **without** the actual `.glb` models or `.mp3` audio —
every asset-loading path has a graceful fallback (primitive geometry,
procedurally synthesized audio), so the app runs and looks intentional
without them. To use real assets:

- Place GLTF/Draco-compressed models at `public/models/bedroom-environment.glb`,
  `public/models/floorboards.glb`, `public/models/props.glb` (node-naming
  conventions are documented in `src/scene/models/Floorboards.tsx` and
  `Props.tsx`).
- Place audio at `public/audio/heartbeat-loop.mp3` (optional — falls back to
  a synthesized heartbeat if absent).
- See `DEPLOYMENT.md` for the caching-header implications of adding/updating
  these files in production.

## Deployment

See `DEPLOYMENT.md` for the full guide — Vercel config (`vercel.json`),
asset-caching discipline, environment setup, and a pre-launch testing
checklist (performance, mobile/touch, WebGL fallback, context-loss recovery).

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · three.js · @react-three/fiber
· @react-three/drei · @react-three/postprocessing · @react-three/xr · GSAP ·
Zustand · Web Audio API · MediaRecorder API
