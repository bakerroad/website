import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tina from "@tinacms/astro/integration";
import { tinaAdminDevRedirect } from "@tinacms/astro/vite";

export default defineConfig({
  site: process.env.SITE_URL || "https://brbcbaytown.org",
  output: "static",
  trailingSlash: "always",
  // Only /sop is held back now. /upcoming was too until 10 Sept 2026, when the
  // church decided the events on it are worth being findable; its Beacon
  // images are kept out of Google Images with noimageindex instead.
  integrations: [sitemap({ filter: (page) => !page.includes("/sop") }), tina()],
  build: { inlineStylesheets: "always" },
  vite: {
    plugins: [tinaAdminDevRedirect()],
    ssr: { noExternal: ["@tinacms/astro", "@tinacms/bridge"] }
  }
});
