#!/usr/bin/env node
/**
 * Put a week's Beacon on the website from the command line.
 *
 *   node scripts/add-beacon.mjs 2026-09-06 ~/Desktop/page1.png ~/Desktop/page2.png
 *
 * The office does this in Tina instead (5. The Beacon -> Add File), and that
 * remains the normal route. This exists for whoever is already in a terminal,
 * and because it does three things a person forgets:
 *
 *   - Trims the blank canvas. Whatever the office exports these from pads every
 *     page out to a fixed 2100x1275 sheet, so the artwork sits in a sea of
 *     white. On 6 September 2026 the back page was 766px of content in a
 *     2100px frame — on the website that reads as a broken image, not a design.
 *   - JPEG, not PNG. A full page as a PNG is often ten megabytes, which is a
 *     long wait on a phone in a car park. The same page as a JPEG is under one.
 *   - No wider than 2000px. Beyond that is detail no screen shows.
 *
 * Existing summary and highlights on an issue are kept; only the pictures are
 * replaced. Pass --alt "..." once per page to set the screen-reader text, and
 * --no-trim to keep the blank border on a page that genuinely wants one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const MAX_WIDTH = 2000;
const argv = process.argv.slice(2);
const alts = [];
const rest = [];
let trim = true;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--alt") alts.push(argv[++i] ?? "");
  else if (argv[i] === "--no-trim") trim = false;
  else rest.push(argv[i]);
}

// Trimming lives in scripts/lib/trim-image.mjs so the build and this script
// cannot disagree about what a trimmed page looks like.
const { trimIfPadded } = await import("./lib/trim-image.mjs");
const trimBlank = async (file) => {
  try { return (await trimIfPadded(file)) ?? "nothing to trim"; }
  catch (e) { return `not trimmed (${e.message})`; }
};

const [date, ...files] = rest;

const die = (m) => { console.error(`\n  ${m}\n`); process.exit(1); };
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
  die("Usage: node scripts/add-beacon.mjs YYYY-MM-DD <page1> [page2 ...] [--alt \"...\"]");
if (!files.length) die("Give at least one picture, front page first.");
for (const f of files) if (!existsSync(f)) die(`No such file: ${f}`);
if (new Date(date + "T12:00:00").getUTCDay() !== 0)
  console.warn(`  Note: ${date} is not a Sunday. Carrying on, but check it.`);

const outDir = join("public", "images", "beacon");
mkdirSync(outDir, { recursive: true });

const pages = [];
for (const [i, src] of files.entries()) {
  const name = `${date}-page-${i + 1}.jpg`;
  const out = join(outDir, name);
  // Convert first, at full size. sips ships with macOS, so this needs nothing
  // installed. Note the order: trim, and only then cap the width. Capping first
  // would spend the 2000px budget on blank canvas and then throw the canvas
  // away, leaving the artwork smaller and softer than it needed to be.
  const r = spawnSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86",
                               resolve(src), "--out", out], { encoding: "utf8" });
  if (r.status !== 0 || !existsSync(out)) die(`Could not convert ${src}\n  ${r.stderr || ""}`);
  const trimmed = trim ? await trimBlank(out) : "kept the border (--no-trim)";
  const width = () => Number((spawnSync("sips", ["-g", "pixelWidth", out], { encoding: "utf8" })
    .stdout.match(/pixelWidth: (\d+)/) || [])[1] || 0);
  if (width() > MAX_WIDTH) spawnSync("sips", ["-Z", String(MAX_WIDTH), out], { encoding: "utf8" });
  const kb = Math.round(readFileSync(out).length / 1024);
  const dim = (spawnSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", out], { encoding: "utf8" })
    .stdout.match(/pixel(?:Width|Height): (\d+)/g) || []).map((s) => s.split(": ")[1]).join("x");
  console.log(`  page ${i + 1}: ${out}  ${dim}  ${kb} KB  (${trimmed})`);
  if (kb > 1500) console.warn(`           that is large for a phone; consider a smaller export`);
  pages.push({ image: `/${join("images", "beacon", name)}`, alt: alts[i] || `The Beacon, page ${i + 1}` });
}

const jsonPath = join("content", "newsletters", `${date}.json`);
const existing = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : { date };
// Keep whatever a person wrote; only the pictures are ours to replace. If an
// issue already had alt text and none was passed this time, keep the old text.
const previous = existing.pages || [];
existing.date = date;
existing.pages = pages.map((p, i) => ({ ...p, alt: alts[i] || previous[i]?.alt || p.alt }));
mkdirSync(join("content", "newsletters"), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(existing, null, 2) + "\n");
console.log(`\n  ${existsSync(jsonPath) ? "updated" : "wrote"} ${jsonPath}`);
console.log(`  preview: npm run dev  ->  http://localhost:4321/news/\n`);
