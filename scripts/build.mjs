#!/usr/bin/env node
/**
 * Build the website. Never let the editor take the website down with it.
 *
 *   npm run build        # this file
 *   npm run build:site   # astro only, no editor, always works
 *
 * GO-LIVE.md states the rule: "A dead /admin is a nuisance; a dead website is
 * not." `--skip-cloud-checks` was supposed to enforce it, but it only skips the
 * schema check against TinaCloud. If the credentials are absent or wrong, the
 * Tina CLI still throws "Missing clientId, token" and the whole build goes red
 * — which means a mistyped Cloudflare variable stops the church's website from
 * publishing sermons. That happened on 9 Sep 2026.
 *
 * So the rule lives here now instead of in a flag:
 *
 *   credentials present -> build the site AND /admin
 *   credentials missing -> build the site, skip /admin, say so loudly
 *   Tina build fails    -> build the site anyway, say so loudly
 *
 * The build only goes red if `astro build` itself fails, i.e. if the website is
 * genuinely broken. Editing breaking is a Monday-morning problem. The website
 * going stale is a Sunday-morning problem.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Cloudflare's variable boxes are easy to paste a stray space or newline into,
// and " abc" is not a valid client ID. Trim before anyone downstream sees it.
const clean = (name) => {
  const value = (process.env[name] ?? "").trim();
  process.env[name] = value;
  return value;
};

// Crop the blank canvas off any Beacon page before Astro measures it.
// The office's export tool pads every page onto a fixed sheet, and the editor
// in Tina has nowhere to crop. Doing it here means it stops mattering who
// uploaded the picture or how. It is idempotent — a page already trimmed is
// left untouched — so this is a no-op on every build after the first.
const BEACON = join("public", "images", "beacon");
if (existsSync(BEACON)) {
  const { trimIfPadded } = await import("./lib/trim-image.mjs");
  for (const f of readdirSync(BEACON).filter((f) => /\.jpe?g$/i.test(f))) {
    try {
      const what = await trimIfPadded(join(BEACON, f));
      if (what) console.log(`  trimmed ${f}: ${what}`);
    } catch (e) {
      // A picture we cannot read must never stop the website publishing.
      console.warn(`  could not trim ${f}: ${e.message}`);
    }
  }
}

const clientId = clean("PUBLIC_TINA_CLIENT_ID");
const token = clean("TINA_TOKEN");

const run = (command, args) =>
  spawnSync(command, args, { stdio: "inherit", shell: false }).status === 0;

const astroOnly = (reason) => {
  console.warn("");
  console.warn("  ────────────────────────────────────────────────────────────");
  console.warn(`  BUILDING WITHOUT THE EDITOR: ${reason}`);
  console.warn("");
  console.warn("  The website will publish normally. brbcbaytown.org/admin will");
  console.warn("  not work until this is fixed. See docs/SETUP.md section 2 and");
  console.warn("  the SOP page: Cloudflare -> website -> Settings -> Build ->");
  console.warn("  Build variables must have PUBLIC_TINA_CLIENT_ID and TINA_TOKEN.");
  console.warn("  ────────────────────────────────────────────────────────────");
  console.warn("");
  process.exit(run("npx", ["astro", "build"]) ? 0 : 1);
};

const missing = [
  !clientId && "PUBLIC_TINA_CLIENT_ID",
  !token && "TINA_TOKEN",
].filter(Boolean);

if (missing.length) astroOnly(`missing ${missing.join(" and ")}`);

// Credentials look present. Try the real build; `tinacms build` runs astro itself.
if (run("npx", ["tinacms", "build", "--skip-cloud-checks", "-c", "astro build"])) {
  process.exit(0);
}

astroOnly("the Tina build failed (see the error above)");
