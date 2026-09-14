/**
 * vite.config.ts
 * ---------------------------------------------------------------------------
 * Production build configuration.
 *
 * NOTE on caching headers: Vite's `server.headers` below only applies to
 * `vite dev` / `vite preview` — it has NO effect on the actual production
 * deployment. Production caching for static assets (especially the large
 * .glb/.mp3 files under /public) is configured separately in vercel.json,
 * since Vercel's CDN serves those directly and never consults this file.
 * ---------------------------------------------------------------------------
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    target: "es2020",
    // 'hidden' generates sourcemaps for error-tracking tools (e.g. Sentry)
    // without shipping a `//# sourceMappingURL` comment that exposes them
    // to anyone opening devtools on the production site.
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Split rarely-changing, heavy vendor code into its own chunk(s) so
        // browsers can cache it across app-code deploys instead of
        // re-downloading three.js/postprocessing/gsap on every release.
        manualChunks: {
          "vendor-three": ["three", "three-stdlib"],
          "vendor-r3f": ["@react-three/fiber", "@react-three/drei", "@react-three/postprocessing", "postprocessing"],
          "vendor-gsap": ["gsap"],
          "vendor-react": ["react", "react-dom"],
        },
      },
    },
    // The r3f/three/postprocessing bundle is legitimately large for a 3D
    // app — raise the warning threshold rather than let it flag every build
    // for a size that's expected and already mitigated by manualChunks +
    // lazy-loading SceneCanvas (see App.tsx).
    chunkSizeWarningLimit: 900,
  },

  // Local dev/preview only — see the file header note above.
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },

  optimizeDeps: {
    // Pre-bundle these in dev so the first WASD keypress or camera move
    // doesn't stall on Vite discovering + esbuild-transforming them
    // mid-interaction.
    include: ["three", "three-stdlib", "@react-three/fiber", "@react-three/drei", "gsap"],
  },
});
