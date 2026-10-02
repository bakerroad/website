/**
 * Take a printed Beacon apart into the pictures it was made from.
 *
 * Whatever the office lays The Beacon out in, the PDF it exports keeps every
 * panel as its own embedded picture: on 4 October 2026 that was 17 of them,
 * each at full resolution, with nothing but borders drawn around them. So the
 * website does not need to render the page, guess where the panels are, or
 * read a single word. It lifts each picture out exactly as it was placed, and
 * notes where on the page it sat, so the page can be laid out again in HTML.
 *
 * Deterministic and dependency-light: pdf-lib for the file structure, a very
 * small content-stream walker for positions, sharp for the pixels.
 *
 * What this cannot do is a PDF whose pages are flattened into one picture
 * each (a scan, or "print to image"). That still works, it just comes back as
 * one full-page picture per page, which the site shows as a page.
 */
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFNumber, decodePDFRawStream } from "pdf-lib";
import sharp from "sharp";

const MIN_AREA = 0.012;   // of the page: smaller than this is a logo or a flourish, not a panel

/** Multiply two PDF matrices [a b c d e f]. */
const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];

/** Split a content stream into operands and operators. Only q Q cm Do matter. */
function* tokens(bytes) {
  const s = bytes; let i = 0; const n = s.length;
  const isWs = (c) => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
  const isDelim = (c) => "()<>[]{}/%".includes(String.fromCharCode(c));
  while (i < n) {
    const c = s[i];
    if (isWs(c)) { i++; continue; }
    if (c === 0x25) { while (i < n && s[i] !== 0x0a && s[i] !== 0x0d) i++; continue; }          // % comment
    if (c === 0x28) {                                                                          // (string)
      let depth = 1; i++;
      while (i < n && depth) { if (s[i] === 0x5c) i += 2; else { if (s[i] === 0x28) depth++; else if (s[i] === 0x29) depth--; i++; } }
      yield { str: true }; continue;
    }
    if (c === 0x3c && s[i + 1] === 0x3c) { i += 2; yield { open: "<<" }; continue; }
    if (c === 0x3e && s[i + 1] === 0x3e) { i += 2; yield { close: ">>" }; continue; }
    if (c === 0x3c) { while (i < n && s[i] !== 0x3e) i++; i++; yield { str: true }; continue; } // <hex>
    if (c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d) { i++; yield { punct: true }; continue; }
    if (c === 0x2f) {                                                                          // /Name
      let j = i + 1; while (j < n && !isWs(s[j]) && !isDelim(s[j])) j++;
      yield { name: Buffer.from(s.subarray(i + 1, j)).toString("latin1") }; i = j; continue;
    }
    let j = i; while (j < n && !isWs(s[j]) && !isDelim(s[j])) j++;
    if (j === i) { i++; continue; }
    const word = Buffer.from(s.subarray(i, j)).toString("latin1"); i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) { yield { num: parseFloat(word) }; continue; }
    if (word === "BI") {                                                                       // inline image: skip its bytes
      const end = Buffer.from(s.subarray(i)).indexOf("EI");
      i = end < 0 ? n : i + end + 2; yield { op: "EI" }; continue;
    }
    yield { op: word };
  }
}

const lookup = (doc, v) => (v && v.constructor?.name === "PDFRef" ? doc.context.lookup(v) : v);
const get = (doc, dict, key) => (dict instanceof PDFDict ? lookup(doc, dict.get(PDFName.of(key))) : undefined);
const nameOf = (v) => (v instanceof PDFName ? v.decodeText() : v instanceof PDFArray ? nameOf(v.get(0)) : undefined);
const num = (v, d = 0) => (v instanceof PDFNumber ? v.asNumber() : d);

function contentBytes(doc, contents) {
  const parts = [];
  const add = (v) => {
    v = lookup(doc, v);
    if (v instanceof PDFArray) { for (let k = 0; k < v.size(); k++) add(v.get(k)); return; }
    if (v instanceof PDFRawStream) parts.push(decodePDFRawStream(v).decode());
    else if (v?.getContents) parts.push(v.getContents());
  };
  add(contents);
  const total = parts.reduce((t, p) => t + p.length + 1, 0);
  const out = new Uint8Array(total); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; out[o++] = 0x0a; }
  return out;
}

/** Walk one content stream, recording where every image XObject is drawn. */
function walk(doc, bytes, resources, ctm0, found, depth = 0) {
  if (depth > 6) return;
  const xobjects = get(doc, resources, "XObject");
  const stack = []; let ctm = ctm0; let operands = [];
  for (const t of tokens(bytes)) {
    if (t.op === undefined) { operands.push(t); continue; }
    const op = t.op;
    if (op === "q") stack.push(ctm);
    else if (op === "Q") ctm = stack.pop() || ctm0;
    else if (op === "cm") {
      const m = operands.slice(-6).map((x) => x.num);
      if (m.length === 6 && m.every((x) => typeof x === "number")) ctm = mul(m, ctm);
    } else if (op === "Do") {
      const nm = operands[operands.length - 1]?.name;
      const xo = nm && get(doc, xobjects, nm);
      if (xo instanceof PDFRawStream) {
        const sub = nameOf(xo.dict.get(PDFName.of("Subtype")));
        if (sub === "Image") found.push({ stream: xo, ctm });
        else if (sub === "Form") {
          const fm = lookup(doc, xo.dict.get(PDFName.of("Matrix")));
          const m = fm instanceof PDFArray ? [0, 1, 2, 3, 4, 5].map((k) => num(fm.get(k))) : [1, 0, 0, 1, 0, 0];
          const res = lookup(doc, xo.dict.get(PDFName.of("Resources"))) || resources;
          walk(doc, decodePDFRawStream(xo).decode(), res, mul(m, ctm), found, depth + 1);
        }
      }
    }
    operands = [];
  }
}

/** Pixels of one image XObject, as something sharp can open. Null if not supported. */
async function pixels(doc, stream) {
  const d = stream.dict;
  const filter = nameOf(d.get(PDFName.of("Filter")));
  const filters = (() => {
    const f = lookup(doc, d.get(PDFName.of("Filter")));
    if (f instanceof PDFArray) return Array.from({ length: f.size() }, (_, k) => nameOf(f.get(k)));
    return f ? [nameOf(f)] : [];
  })();
  const w = num(lookup(doc, d.get(PDFName.of("Width"))));
  const h = num(lookup(doc, d.get(PDFName.of("Height"))));
  let img;
  if (filters.length === 1 && (filter === "DCTDecode" || filter === "JPXDecode")) {
    img = sharp(Buffer.from(stream.getContents()));
  } else {
    if (filters.includes("DCTDecode") || filters.includes("JPXDecode") || filters.includes("JBIG2Decode") || filters.includes("CCITTFaxDecode")) return null;
    const bpc = num(lookup(doc, d.get(PDFName.of("BitsPerComponent"))), 8);
    if (bpc !== 8) return null;
    let cs = lookup(doc, d.get(PDFName.of("ColorSpace")));
    let comps = 3;
    const csName = nameOf(cs);
    if (csName === "DeviceGray" || csName === "CalGray") comps = 1;
    else if (csName === "DeviceCMYK") comps = 4;
    else if (csName === "ICCBased" && cs instanceof PDFArray) comps = num(lookup(doc, lookup(doc, cs.get(1))?.dict?.get(PDFName.of("N"))), 3);
    else if (csName !== "DeviceRGB" && csName !== "CalRGB") return null;   // Indexed, Separation …
    const raw = decodePDFRawStream(stream).decode();
    if (raw.length < w * h * comps) return null;                          // predictor or damage
    let buf = Buffer.from(raw.subarray(0, w * h * comps));
    if (comps === 4) {                                                     // CMYK -> RGB, plainly
      const rgb = Buffer.alloc(w * h * 3);
      for (let p = 0, q = 0; p < buf.length; p += 4, q += 3) {
        const k = 255 - buf[p + 3];
        rgb[q] = ((255 - buf[p]) * k) / 255; rgb[q + 1] = ((255 - buf[p + 1]) * k) / 255; rgb[q + 2] = ((255 - buf[p + 2]) * k) / 255;
      }
      buf = rgb; comps = 3;
    }
    img = sharp(buf, { raw: { width: w, height: h, channels: comps } });
  }
  // a soft mask is the picture's transparency
  const sm = lookup(doc, d.get(PDFName.of("SMask")));
  if (sm instanceof PDFRawStream) {
    try {
      const mw = num(lookup(doc, sm.dict.get(PDFName.of("Width")))), mh = num(lookup(doc, sm.dict.get(PDFName.of("Height"))));
      const mraw = nameOf(sm.dict.get(PDFName.of("Filter"))) === "DCTDecode"
        ? await sharp(Buffer.from(sm.getContents())).greyscale().raw().toBuffer()
        : Buffer.from(decodePDFRawStream(sm).decode().subarray(0, mw * mh));
      const { data, info } = await img.removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
      const mask = await sharp(mraw, { raw: { width: mw, height: mh, channels: 1 } }).resize(info.width, info.height, { fit: "fill" }).raw().toBuffer();
      return { img: sharp(data, { raw: info }).joinChannel(mask, { raw: { width: info.width, height: info.height, channels: 1 } }), alpha: true };
    } catch { /* show it without transparency */ }
  }
  return { img, alpha: false };
}

/**
 * Every page of `pdfBytes`, each with the panels placed on it.
 * Boxes are in PDF points with the origin top-left, like the screen.
 */
export async function pdfPanels(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = [];
  for (const [pi, page] of doc.getPages().entries()) {
    const box = page.getMediaBox();
    const W = box.width, H = box.height;
    const found = [];
    let res = page.node.Resources?.() ?? lookup(doc, page.node.get(PDFName.of("Resources")));
    for (let p = page.node; !res && p; p = lookup(doc, p.get(PDFName.of("Parent")))) res = lookup(doc, p.get(PDFName.of("Resources")));
    walk(doc, contentBytes(doc, page.node.get(PDFName.of("Contents"))), res, [1, 0, 0, 1, -box.x, -box.y], found);

    const placed = [];
    for (const { stream, ctm } of found) {
      // the image is the unit square, transformed by the CTM
      const xs = [ctm[4], ctm[4] + ctm[0], ctm[4] + ctm[2], ctm[4] + ctm[0] + ctm[2]];
      const ys = [ctm[5], ctm[5] + ctm[1], ctm[5] + ctm[3], ctm[5] + ctm[1] + ctm[3]];
      let x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(W, Math.max(...xs));
      let y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(H, Math.max(...ys));
      if (x1 <= x0 || y1 <= y0) continue;
      if (((x1 - x0) * (y1 - y0)) / (W * H) < MIN_AREA) continue;
      placed.push({ stream, x: x0, y: H - y1, w: x1 - x0, h: y1 - y0, flipX: ctm[0] < 0, flipY: ctm[3] < 0 });
    }
    // A page-sized picture behind real panels is a background; alone, it is the page.
    const big = placed.filter((p) => (p.w * p.h) / (W * H) > 0.85);
    const panels = placed.length > big.length ? placed.filter((p) => !big.includes(p)) : placed;

    const out = [];
    for (const p of panels) {
      try {
        const px = await pixels(doc, p.stream);
        if (!px) continue;
        let img = px.img;
        if (p.flipY) img = img.flip();   // PDF draws images bottom-up only when the matrix says so
        if (p.flipX) img = img.flop();
        out.push({ ...p, img, alpha: px.alpha, stream: undefined });
      } catch { /* one unreadable picture never sinks the issue */ }
    }
    pages.push({ index: pi, width: W, height: H, panels: out });
  }
  return pages;
}
