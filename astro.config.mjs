import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tina from "@tinacms/astro/integration";
import { tinaAdminDevRedirect } from "@tinacms/astro/vite";

export default defineConfig({
  site: process.env.SITE_URL || "https://brbcbaytown.org",
  output: "static",
  trailingSlash: "always",
  // /sop is the internal manual; /upcoming carries volunteer rotas and the
  // week's giving figures. Both are reachable by anyone with the link, and
  // neither belongs in a search result. Both are also noindex in Base.astro.
  integrations: [sitemap({ filter: (page) => !page.includes("/sop") && !page.includes("/upcoming") }), tina()],
  build: { inlineStylesheets: "always" },
  vite: {
    plugins: [tinaAdminDevRedirect()],
    ssr: { noExternal: ["@tinacms/astro", "@tinacms/bridge"] }
  }
});
