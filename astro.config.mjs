import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://themagicianscode.dev",
  base: "/wallidate",
  integrations: [preact()],
  vite: {
    build: {
      // bwip-js is intentionally lazy-loaded only for non-QR barcode formats.
      // The chunk is large but never enters the critical path, so the default
      // 500 kB warning threshold is noise here.
      chunkSizeWarningLimit: 1000,
    },
  },
});
