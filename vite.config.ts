// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Force-enable Nitro and hard-pin the Vercel preset so deploys from this repo's
  // own CI (Vercel reading the GitHub repo) produce a proper SSR build under
  // `.vercel/output` (Build Output API). Without this, builds outside Lovable
  // skip Nitro and emit a Vite-only bundle with no SSR server / index.html, which
  // Vercel serves as a 404. Inside Lovable the preset is forced to Cloudflare, so
  // this override only affects external deploys.
  nitro: { preset: "vercel" },
});
