/**
 * Crop the blank border off a bulletin scan, deterministically.
 *
 * Whatever the office exports The Beacon from pads every page onto a fixed
 * sheet, so the artwork floats in white. On 6 September 2026 the back page was
 * 766px of content inside a 2100px frame; left alone that reads on the website
 * as a broken image rather than a design.
 *
 * WHY NOT sharp's own .trim()
 * Because it is not idempotent. Run it on an already-trimmed page and it still
 * shaves a row: 766x1081 came back 766x1080. The build runs on every deploy,
 * so a one-pixel bite per build is an image that quietly erodes over a year.
 *
 * So the box is measured here and the file is rewritten ONLY when the border is
 * big enough to be real padding (MIN_BORDER). A second run measures a border of
 * zero and does nothing, which is what makes this safe to put in the build.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const NEAR_WHITE = 246;  // 0-255; anything lighter counts as blank canvas
const MIN_BORDER = 8;    // px; below this it is a scan edge, not padding
// mozjpeg at 80 rather than plain 86: on the 13 September back page that was
// 660KB instead of 902KB for text that reads the same. These are scans of a
// printed sheet being opened on a phone, so bytes matter more than the last
// few percent of encoder fidelity.
const QUALITY = 80;
const MAX_WIDTH = 2000;  // beyond this is detail no screen shows

/** Measure the bounding box of everything that is not blank canvas. */
async function contentBox(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (data[row + x] < NEAR_WHITE) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (right < 0) return null;                       // the page is entirely blank
  return { left, top, width: right - left + 1, height: bottom - top + 1, imageW: w, imageH: h };
}

/**
 * Trim `file` in place if it is padded. Returns a short line describing what
 * happened, suitable for printing, or null when the file was left alone.
 */
export async function trimIfPadded(file, { pad = 2, maxWidth = MAX_WIDTH } = {}) {
  const box = await contentBox(file);
  if (!box) return null;
  const { left, top, width, height, imageW, imageH } = box;
  const border = Math.max(left, top, imageW - (left + width), imageH - (top + height));

  // An untrimmed page can still be far too large to send to a phone. The office
  // uploaded a 4760px scan on 11 September 2026; nothing shows more than 2000.
  if (border < MIN_BORDER) {
    if (imageW <= maxWidth) return null;            // nothing to do at all
    const out = await sharp(file).resize({ width: maxWidth })
      .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true }).toBuffer();
    const wasKb = Math.round(readFileSync(file).length / 1024);
    writeFileSync(file, out);
    return `${imageW}x${imageH} -> ${maxWidth}px wide  ${wasKb}KB -> ${Math.round(out.length / 1024)}KB`;
  }

  const region = {
    left: Math.max(0, left - pad),
    top: Math.max(0, top - pad),
    width: Math.min(imageW, left + width + pad) - Math.max(0, left - pad),
    height: Math.min(imageH, top + height + pad) - Math.max(0, top - pad),
  };
  let pipe = sharp(file).extract(region);
  if (region.width > maxWidth) pipe = pipe.resize({ width: maxWidth });
  const out = await pipe.jpeg({ quality: QUALITY, progressive: true, mozjpeg: true }).toBuffer();
  const wasKb = Math.round(readFileSync(file).length / 1024);
  writeFileSync(file, out);
  const nowKb = Math.round(out.length / 1024);
  return `${imageW}x${imageH} -> ${region.width}x${region.height}  ${wasKb}KB -> ${nowKb}KB`;
}
