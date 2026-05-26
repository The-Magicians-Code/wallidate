import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://themagicianscode.dev",
  base: "/wallidate",
  integrations: [preact()],
});
