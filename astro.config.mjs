import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tina from "@tinacms/astro/integration";
import { tinaAdminDevRedirect } from "@tinacms/astro/vite";

export default defineConfig({
  site: process.env.SITE_URL || "https://brbcbaytown.org",
  output: "static",
  integrations: [sitemap(), tina()],
  build: { inlineStylesheets: "always" },
  vite: {
    plugins: [tinaAdminDevRedirect()],
    ssr: { noExternal: ["@tinacms/astro", "@tinacms/bridge"] }
  }
});
