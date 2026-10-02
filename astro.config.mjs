import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tina from "@tinacms/astro/integration";
import { tinaAdminDevRedirect } from "@tinacms/astro/vite";

// The Beacon: take whatever was uploaded this week (a PDF, any picture) and
// get it ready for the News page before any page is built. See
// scripts/lib/beacon-prepare.mjs.
const beacon = {
  name: "beacon",
  hooks: {
    "astro:config:setup": async ({ logger }) => {
      const { prepareBeacon } = await import("./scripts/lib/beacon-prepare.mjs");
      try { await prepareBeacon(logger); }
      catch (e) { logger.warn(`The Beacon could not be prepared: ${e.message}`); }
    },
  },
};

export default defineConfig({
  site: process.env.SITE_URL || "https://brbcbaytown.org",
  output: "static",
  trailingSlash: "always",
  // Only /sop is held back now. /news was too until 10 Sept 2026, when the
  // church decided the events on it are worth being findable; its Beacon
  // images are kept out of Google Images with noimageindex instead.
  integrations: [beacon, sitemap({ filter: (page) => !page.includes("/sop") }), tina()],
  build: { inlineStylesheets: "always" },
  vite: {
    plugins: [tinaAdminDevRedirect()],
    ssr: { noExternal: ["@tinacms/astro", "@tinacms/bridge"] }
  }
});
