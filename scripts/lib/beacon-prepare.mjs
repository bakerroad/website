/**
 * Get this week's Beacon ready for the News page, whatever was uploaded.
 *
 *   a PDF        -> every panel lifted out (see beacon-pdf.mjs) and laid out
 *                   again as the printed page had it, plus the PDF itself to
 *                   download
 *   any picture  -> made into something every browser shows (a phone's HEIC
 *                   or a WebP or a TIFF becomes a JPEG), cropped of blank
 *                   canvas and sized for a screen
 *
 * Runs at the start of every `astro dev` and `astro build`, from the
 * integration in astro.config.mjs. Writes only generated files, both ignored
 * by git: the pictures under public/_beacon/ and an index of them in
 * src/generated/beacon.json, which BeaconIssue.astro reads. Nothing it does
 * can stop the site building — a Beacon that cannot be read is shown as a
 * download link instead.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";
import { pdfPanels } from "./beacon-pdf.mjs";
import { trimIfPadded } from "./trim-image.mjs";

const ISSUES = join("content", "newsletters");
const OUT_DIR = join("public", "_beacon");
const OUT_URL = "/_beacon/";
const INDEX = join("src", "generated", "beacon.json");
const PANEL_MAX = 1400;   // px wide: a panel is never shown larger than this
const INSET = 3.5;        // pt trimmed off every side of a panel's box, so neighbours never touch

/**
 * Reading order for panels, by recursive XY-cut: split the page at its widest
 * clear gutter, read each part in turn. A two-column front page is read down
 * the left half and then the right, rows left to right — as a person would.
 */
function readingOrder(boxes) {
  if (boxes.length <= 1) return boxes;
  const groupsAlong = (axis) => {
    const [s, l] = axis === "y" ? ["y", "h"] : ["x", "w"];
    const sorted = [...boxes].sort((a, b) => a[s] - b[s]);
    const groups = []; let cur = [sorted[0]]; let end = sorted[0][s] + sorted[0][l]; let widest = -Infinity;
    for (const b of sorted.slice(1)) {
      const gap = b[s] - end;
      if (gap > -3) { groups.push(cur); widest = Math.max(widest, gap); cur = [b]; }
      else cur.push(b);
      end = Math.max(end, b[s] + b[l]);
    }
    groups.push(cur);
    return { groups, widest };
  };
  const y = groupsAlong("y"), x = groupsAlong("x");
  const pick = x.groups.length > 1 && (y.groups.length === 1 || x.widest > y.widest + 2) ? x : y;
  if (pick.groups.length === 1) return [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  return pick.groups.flatMap(readingOrder);
}

const latestIssue = () => {
  if (!existsSync(ISSUES)) return null;
  const all = readdirSync(ISSUES).filter((f) => f.endsWith(".json")).map((f) => {
    try { return JSON.parse(readFileSync(join(ISSUES, f), "utf8")); } catch { return null; }
  }).filter((n) => n?.date);
  all.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return all[0] ?? null;
};

const kb = (file) => Math.round(statSync(file).size / 1024);

async function writePicture(img, alpha, file) {
  let p = img.rotate().resize({ width: PANEL_MAX, withoutEnlargement: true });
  p = alpha ? p.png({ palette: true, quality: 88, compressionLevel: 9 })
            : p.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true, progressive: true });
  const info = await p.toFile(file);
  return { width: info.width, height: info.height };
}

export async function prepareBeacon(log = console) {
  const issue = latestIssue();
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(join("src", "generated"), { recursive: true });
  if (!issue) { writeFileSync(INDEX, "{}\n"); return; }

  const day = String(issue.date).slice(0, 10);
  const dir = join(OUT_DIR, day);
  mkdirSync(dir, { recursive: true });
  const blocks = [], pdfs = [];
  let n = 0;

  // the one PDF first, then any extra pictures (or PDFs) in the order listed
  const entries = [...(issue.pdf ? [{ image: issue.pdf }] : []), ...(issue.pages ?? [])];
  for (const page of entries) {
    const src = page?.image;
    if (typeof src !== "string" || !src.startsWith("/")) continue;
    const file = join("public", src.replace(/^\//, ""));
    if (!existsSync(file)) continue;
    const ext = extname(file).toLowerCase();

    if (ext === ".pdf") {
      const pdf = { src, kb: kb(file), pages: 0, download: `The-Beacon-${day}.pdf`, readable: false };
      pdfs.push(pdf);
      try {
        const pages = await pdfPanels(readFileSync(file));
        pdf.pages = pages.length;
        for (const pg of pages) {
          if (!pg.panels.length) continue;
          const panels = [];
          for (const p of readingOrder(pg.panels)) {
            const name = `p${pg.index + 1}-${String(++n).padStart(2, "0")}${p.alpha ? ".png" : ".jpg"}`;
            const size = await writePicture(p.img, p.alpha, join(dir, name));
            panels.push({ src: OUT_URL + day + "/" + name, ...size, x: p.x, y: p.y, w: p.w, h: p.h });
          }
          if (panels.length === 1) {
            // one picture on the page: it is the page
            const { src: s, width, height } = panels[0];
            blocks.push({ kind: "image", src: s, width, height, alt: page.alt || "" });
            continue;
          }
          // lay the panels out within their own bounding box, not the paper,
          // so a narrow column of flyers is not lost in a landscape sheet
          const bx = Math.min(...panels.map((p) => p.x)), by = Math.min(...panels.map((p) => p.y));
          const bw = Math.max(...panels.map((p) => p.x + p.w)) - bx, bh = Math.max(...panels.map((p) => p.y + p.h)) - by;
          const pct = (v, of) => +((v / of) * 100).toFixed(3);
          blocks.push({
            kind: "sheet", page: pg.index + 1, aspect: +(bw / bh).toFixed(4), alt: page.alt || "",
            panels: panels.map((p) => ({
              src: p.src, width: p.width, height: p.height,
              left: pct(p.x - bx + INSET, bw), top: pct(p.y - by + INSET, bh),
              w: pct(p.w - 2 * INSET, bw), h: pct(p.h - 2 * INSET, bh),
            })),
          });
        }
        pdf.readable = blocks.length > 0;
        log.info(`beacon ${day}: ${src} -> ${n} panel(s) on ${pdf.pages} page(s)`);
      } catch (e) {
        log.warn(`beacon ${day}: could not read ${src} (${e.message}); it will be offered as a download`);
      }
      continue;
    }

    // a picture of any kind
    try {
      const meta = await sharp(file).metadata();
      let out = src, width = meta.width, height = meta.height;
      if (![".jpg", ".jpeg", ".png"].includes(ext)) {
        const name = `image-${String(++n).padStart(2, "0")}${meta.hasAlpha ? ".png" : ".jpg"}`;
        const target = join(dir, name);
        ({ width, height } = await writePicture(sharp(file), meta.hasAlpha, target));
        try { await trimIfPadded(target); ({ width, height } = await sharp(target).metadata()); } catch {}
        out = OUT_URL + day + "/" + name;
      }
      blocks.push({ kind: "image", src: out, width, height, alt: page.alt || "" });
    } catch (e) {
      log.warn(`beacon ${day}: ${src} is not a picture this site can show (${e.message.split("\n")[0]}). Save it as a JPG or PNG.`);
    }
  }

  writeFileSync(INDEX, JSON.stringify({ [day]: { blocks, pdfs } }, null, 2) + "\n");
}
