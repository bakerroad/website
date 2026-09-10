import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Intrinsic pixel size of an image in public/, read at build time.
 * Emitting width+height on every <img> reserves the right box before the file
 * arrives, so text does not jump as photographs load. No dependency needed —
 * the header of a JPEG or PNG carries the dimensions.
 */
const cache = new Map<string, { width: number; height: number } | null>();

function parse(buf: Buffer): { width: number; height: number } | null {
  // PNG: IHDR is always the first chunk
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk the segments to the first SOFn
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

export function imageSize(src?: string) {
  if (!src || !src.startsWith("/")) return null;
  if (cache.has(src)) return cache.get(src)!;
  const file = join("public", src.replace(/^\//, ""));
  let out: { width: number; height: number } | null = null;
  try { if (existsSync(file)) out = parse(readFileSync(file)); } catch { out = null; }
  cache.set(src, out);
  return out;
}

/**
 * Does a file referenced as "/images/foo.jpg" actually exist in public/?
 * Tina writes the path into the JSON the moment an editor picks a file, and a
 * page that references a picture nobody uploaded should quietly show its text
 * rather than a broken-image icon.
 */
export function publicFileExists(src?: string) {
  if (!src || !src.startsWith("/")) return false;
  try { return existsSync(join("public", src.replace(/^\//, ""))); } catch { return false; }
}
