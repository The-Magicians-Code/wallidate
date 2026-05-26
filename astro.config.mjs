import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://the-magicians-code.github.io",
  base: "/wallidate",
  integrations: [preact()],
});
