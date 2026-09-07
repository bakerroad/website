/**
 * Pure helpers for turning a messy YouTube title into a clean sermon record.
 * Separated from the sync so they can be tested without touching the API.
 *
 * Baker Road writes the same series name several different ways —
 * "Deep Waters Series –", "SERMON SERIES Deep Waters", "Deep Waters Sermon
 * Series Part 2". So rather than guess from punctuation alone, we match against
 * a known list of series names (content/sermon-series.json) and fall back to a
 * frequency heuristic for anything new.
 */

/** Find and strip a date written into the title. Returns [isoDate|null, rest]. */
export function extractDate(title) {
  const pats = [
    /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/,    // 07/12/2026
    /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2})\b/,  // 08-30-26
  ];
  for (const re of pats) {
    const m = title.match(re);
    if (!m) continue;
    let [, mo, d, y] = m;
    y = y.length === 2 ? `20${y}` : y;
    const mo_ = +mo, d_ = +d;
    if (mo_ < 1 || mo_ > 12 || d_ < 1 || d_ > 31) continue;
    const iso = `${y}-${String(mo_).padStart(2, "0")}-${String(d_).padStart(2, "0")}`;
    const dt = new Date(iso + "T00:00:00Z");
    if (Number.isNaN(dt.getTime()) || dt.getUTCDate() !== d_) continue;
    return [iso, title.replace(m[0], " ")];
  }
  return [null, title];
}

const LEAD_NOISE = /^(sermon\s+series|sermon|series|message|full\s+service|worship\s+service)\s*[:\-–—]?\s*/i;

export function tidy(t) {
  let s = (t || "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^[\s\-–—:·|,]+|[\s\-–—:·|,]+$/g, "").replace(LEAD_NOISE, "");
  }
  return s.replace(/\s+/g, " ").trim();
}

const SMALL = new Set(["a","an","and","the","of","in","on","at","to","for","with","that","is","as","but","or","nor","from","be"]);

const titleCaseWord = (w, first) => {
  const lower = w.toLowerCase();
  if (!first && SMALL.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/**
 * De-shout a title. Works per word, so it fixes half-shouted titles like
 * "SERMON SERIES – BLESSED TO BE A BLESSING / A Faith That Gives Thanks"
 * that a whole-string ratio check would miss.
 */
export function unshout(t) {
  if (!t) return t;
  let wordIndex = 0;
  return t.split(/(\s+)/).map((tok) => {
    if (/^\s+$/.test(tok)) return tok;
    const i = wordIndex++;
    const letters = tok.replace(/[^A-Za-z]/g, "");
    if (letters.length >= 2 && letters === letters.toUpperCase()) return titleCaseWord(tok, i === 0);
    return tok;
  }).join("");
}

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Match a title against known series names.
 * Returns { series, title } with the series name and connective noise removed.
 */
/**
 * Match a title against known series names.
 * `knownSeries` entries may be a plain string, or { name, aliases: [...] } to
 * cope with the church spelling its own series differently week to week
 * ("From Shadow to Savior" vs "From Shadows to Savior").
 * Returns { series, title } with the series name and connective noise removed.
 */
export function matchSeries(cleanTitle, knownSeries = []) {
  const hay = norm(cleanTitle);
  const forms = [];
  for (const entry of knownSeries) {
    const name = typeof entry === "string" ? entry : entry?.name;
    if (!name) continue;
    const aliases = typeof entry === "string" ? [] : entry.aliases || [];
    const subtitle = typeof entry === "string" ? "" : entry.subtitle || "";
    for (const form of [name, ...aliases]) forms.push({ name, form, subtitle });
  }
  const hit = forms
    .filter(({ form }) => norm(form) && hay.includes(norm(form)))
    .sort((a, b) => norm(b.form).length - norm(a.form).length)[0];
  if (!hit) return { series: "", title: cleanTitle };

  const loose = (phrase) =>
    new RegExp(
      norm(phrase).split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^A-Za-z0-9]+"),
      "i"
    );

  let rest = cleanTitle.replace(loose(hit.form), " ");
  // Strip the series strap-line so the sermon's own title is what remains.
  if (hit.subtitle && loose(hit.subtitle).test(rest)) rest = rest.replace(loose(hit.subtitle), " ");
  rest = rest
    .replace(/\b(sermon\s+series|series|sermon)\b/gi, " ")
    .replace(/\b(part|week|wk|pt\.?)\s*\d+\b/gi, " ")
    .replace(/\s+/g, " ");
  rest = tidy(rest);

  // Nothing left but boilerplate? The strap-line is the most descriptive
  // thing the church gave us, so use that rather than "Sunday Service".
  if (!rest && hit.subtitle) rest = hit.subtitle;
  return { series: hit.name, title: rest };
}

/** Is this video a sermon at all? Returns the matched phrase if NOT. */
export function notSermon(rawTitle, patterns = []) {
  const hay = (rawTitle || "").toLowerCase();
  return patterns.find((p) => p && hay.includes(String(p).toLowerCase())) || null;
}

export const slugify = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
