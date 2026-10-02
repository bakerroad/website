#!/usr/bin/env node
/**
 * Pull events from Planning Center into content/events/*.json
 *   PCO_APP_ID=xxx PCO_SECRET=yyy node scripts/sync-events.mjs [--check]
 *
 * Two sources: Calendar (gated by the "Website" tag, see below) and
 * Registrations (gated by the date, see the second block below).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT GETS THROUGH, AND WHAT KEEPS PRIVATE EVENTS OFF
 *
 * Every event that is "Visible in Church Center", one-off rather than weekly,
 * and whose name passes content/event-rules.json. There is no tag to apply.
 * Matt's call, 2 October 2026: nobody at Baker Road was going to tag events,
 * and an events list that stays empty helps no one.
 *
 * That makes the name rules the real lock, so treat them seriously. When this
 * was built the "visible" flag was on 123 of 136 events, including two named
 * couples' weddings, a named memorial service and the Personnel Committee.
 * The rules refuse all of those by name. If a private event ever does get
 * through, add a word to excludePatterns rather than loosening anything here.
 *
 * Weekly regulars (Sunday worship, the Bible studies, rehearsals) are held
 * back because the schedule is already on every page of the site.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY REGISTRATIONS ARE GATED ON THE DATE, NOT ON "OPEN"
 *
 * A signup is already a public invitation — it is published on Church Center
 * for anyone to find — so it does not need the tag. But it does need a date
 * check, and not the one you would reach for first.
 *
 * On this church's account, `open` and `archived` are not maintained. In
 * September 2026 all nine signups were still open and unarchived, including a
 * Family Game Night from May 2022 and a Fish Fry from 2023. Publishing on
 * `open` would put a four-year-old game night on the front of the website.
 *
 * So the gate is: not archived, AND it has a signup time still in the future.
 * The name-based lock in refuse() applies to these as well.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "./lib/parse-title.mjs";

const { PCO_APP_ID, PCO_SECRET } = process.env;
const OUT = "content/events";
const IMG_DIR = "public/images/events";     // pictures copied from Planning Center
const IMG_URL = "/images/events/";
const MONTHS_AHEAD = Number(process.env.EVENT_MONTHS_AHEAD || 6);
const MAX_INSTANCES = Number(process.env.EVENT_MAX_INSTANCES || 12);
const DRY = process.argv.includes("--check");

if (!PCO_APP_ID || !PCO_SECRET) {
  console.error("Missing PCO_APP_ID / PCO_SECRET.");
  console.error("A Planning Center Personal Access Token is a PAIR: an Application ID");
  console.error("and a Secret, sent as HTTP Basic auth. A value beginning pco_pat_ is");
  console.error("only the secret half.");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const RULES = existsSync("content/event-rules.json")
  ? JSON.parse(readFileSync("content/event-rules.json", "utf8")) : {};
const EXCLUDE_NAMES = new Set((RULES.excludeNames || []).map((n) => n.trim().toLowerCase()));
// Exact names someone decided are public even though a pattern below would
// catch them. Exact, so "Church Council" lets nothing else with "council" in.
const ALLOW_NAMES = new Set((RULES.allowNames || []).map((n) => n.trim().toLowerCase()));
const EXCLUDE_RE = (RULES.excludePatterns || []).length
  ? new RegExp((RULES.excludePatterns || []).join("|"), "i") : null;

/** Refuse an event by name. This is the lock that keeps private events off. */
function refuse(name) {
  const n = (name || "").trim().toLowerCase();
  if (EXCLUDE_NAMES.has(n)) return "outside group, not a church event";
  if (ALLOW_NAMES.has(n)) return null;
  if (EXCLUDE_RE && EXCLUDE_RE.test(n)) return "private, pastoral or internal by name";
  return null;
}

/**
 * Copy an event's Planning Center picture onto the website.
 *
 * PCO hands out image links that are signed and expire, so pointing the site
 * at them would leave broken pictures a few days later. A copy is kept under
 * public/images/events/ instead. The link's query string is the signature and
 * changes on every request; the path before it only changes when somebody
 * uploads a different picture, so that path is what decides whether to fetch.
 *
 * Returns { image, key } or null. Never throws: a picture is not worth a
 * failed sync.
 */
let sharp = null;
try { sharp = (await import("sharp")).default; } catch { /* save the original bytes instead */ }

async function savePicture(url, base, prev) {
  if (!url || typeof url !== "string") return null;
  let key;
  try { const u = new URL(url); key = u.origin + u.pathname; } catch { return null; }
  const image = IMG_URL + base + ".jpg";
  const file = join(IMG_DIR, base + ".jpg");
  if (prev?._pcoImageKey === key && prev?.image === image && existsSync(file)) return { image, key };
  if (DRY) return { image, key };
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    let buf = Buffer.from(await r.arrayBuffer());
    // 1280 wide is more than any card shows; PCO originals run to megabytes
    if (sharp) buf = await sharp(buf).rotate().resize({ width: 1280, withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();
    mkdirSync(IMG_DIR, { recursive: true });
    writeFileSync(file, buf);
    return { image, key };
  } catch (e) {
    console.log(`  could not copy the picture for ${base}: ${e.message}`);
    return null;
  }
}

/** The picture a person chose in Tina always wins over Planning Center's. */
const isOurs = (image) => typeof image === "string" && image.startsWith(IMG_URL);

/** Work out the picture fields for an event about to be written. */
async function pictureFor(pcoUrl, base, prev) {
  if (prev?.image && !isOurs(prev.image)) return { image: prev.image };
  const got = await savePicture(pcoUrl, base, prev);
  return got ? { image: got.image, _pcoImageKey: got.key } : {};
}

const AUTH = "Basic " + Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString("base64");

async function pco(path, params = {}, base = "calendar/v2") {
  const url = new URL(`https://api.planningcenteronline.com/${base}/${path}`);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const r = await fetch(url, { headers: { Authorization: AUTH, Accept: "application/json" } });
  if (r.status === 401) throw new Error(
    "Planning Center rejected the credentials (401).\n" +
    "  - A Personal Access Token is an Application ID AND a Secret, both required.\n" +
    "  - Check the token still exists at api.planningcenteronline.com/oauth/applications.\n" +
    "  - Check the user who created it still has Calendar access."
  );
  if (!r.ok) throw new Error(`PCO ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

async function pageAll(path, params = {}, base = "calendar/v2") {
  const out = [], included = new Map();
  let offset = 0;
  for (;;) {
    const p = await pco(path, { ...params, per_page: 100, offset }, base);
    (p.included || []).forEach((i) => included.set(`${i.type}:${i.id}`, i));
    out.push(...(p.data || []));
    const next = p.meta?.next?.offset;
    if (next == null || !(p.data || []).length) break;
    offset = next;
    if (offset > 2000) break;
  }
  return { rows: out, included };
}


function reportFactory(refused, staples) {
  return () => {
    if (staples.size) {
      console.log(`\nheld back as weekly staples (already shown as the schedule): ${[...staples].join(", ")}`);
    }
    if (refused.length) {
      console.log("\nrefused by name (content/event-rules.json):");
      [...new Set(refused)].forEach((r) => console.log("  ✗ " + r));
    }
  };
}

async function main() {
  if (DRY) console.log("CHECK MODE — reading Planning Center, writing nothing.\n");

  // upcoming instances of every event; the checks below decide what shows
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() + MONTHS_AHEAD);
  const { rows: instances, included } = await pageAll("event_instances", {
    filter: "future", include: "event", order: "starts_at",
  });

  let created = 0, updated = 0, preserved = 0, skipped = 0;
  const written = new Set();
  const perEvent = new Map();
  const refused = [];
  const staples = new Set();
  const report = reportFactory(refused, staples);

  for (const inst of instances) {
    const evId = inst.relationships?.event?.data?.id;
    const ev = included.get(`Event:${evId}`);
    const a = ev?.attributes || {};
    // hidden in Church Center means hidden here too
    if (!a.visible_in_church_center) { skipped++; continue; }

    const start = inst.attributes?.starts_at;
    if (!start || new Date(start) > cutoff) continue;

    const title = (a.name || "").trim();
    if (!title) continue;
    const why = refuse(title);
    if (why) { refused.push(`${title} — ${why}`); continue; }

    // A recurring staple is the weekly rhythm, not an event. The Sunday and
    // Wednesday times already appear on every page of the site.
    const rec = (inst.attributes?.recurrence || "").trim();
    if (rec && rec.toLowerCase() !== "none") { staples.add(title); continue; }

    // something repeating without a recurrence rule would still flood the page
    const n = (perEvent.get(evId) || 0) + 1;
    perEvent.set(evId, n);
    if (n > MAX_INSTANCES) continue;

    const day = start.slice(0, 10);
    const base = `${day}-${slugify(title) || inst.id}`;
    const file = join(OUT, `${base}.json`);
    written.add(file);

    const next = {
      title, start, end: inst.attributes?.ends_at || "",
      location: (inst.attributes?.location || a.location || "").trim(),
      description: (a.summary || a.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
      url: a.registration_url || inst.attributes?.church_center_url || "",
      featured: false,
      kind: "calendar",
      _pcoInstanceId: inst.id,
    };

    if (DRY) { console.log(`  would publish: ${day}  ${title}${a.image_url ? "  (has a picture)" : ""}`); created++; continue; }

    const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
    // `featured` is a human decision, and so is a picture picked in Tina.
    // Otherwise the picture is Planning Center's, copied locally.
    Object.assign(next, await pictureFor(a.image_url, base, prev));

    if (prev) {
      const merged = { ...next, featured: prev.featured ?? false };
      if (JSON.stringify(merged) !== JSON.stringify(prev)) { writeFileSync(file, JSON.stringify(merged, null, 2) + "\n"); updated++; }
      else preserved++;
      continue;
    }
    writeFileSync(file, JSON.stringify(next, null, 2) + "\n"); created++;
  }

  // ── second source: Registrations ────────────────────────────────────────
  // Gated on the date, not on `open`. See the header for why that matters on
  // this account. A signup already public on Church Center is not a new
  // disclosure, so it needs no tag — but it still passes the refuse() lock.
  let regCreated = 0, regUpdated = 0, regSkipped = 0;
  const regStale = [];
  try {
    const { rows: signups, included: regInc } =
      await pageAll("signups", { include: "signup_times" }, "registrations/v2");
    for (const su of signups) {
      const a = su.attributes || {};
      const title = (a.name || "").trim();
      if (!title) continue;
      if (a.archived) { regSkipped++; continue; }

      // earliest signup time still ahead of us
      const times = (su.relationships?.signup_times?.data || [])
        .map((t) => regInc.get(`SignupTime:${t.id}`)?.attributes)
        .filter(Boolean)
        .map((t) => ({ start: t.starts_at, end: t.ends_at }))
        .filter((t) => t.start && new Date(t.start) > new Date())
        .sort((x, y) => String(x.start).localeCompare(String(y.start)));
      if (!times.length) { regSkipped++; regStale.push(title); continue; }

      const { start, end } = times[0];
      if (new Date(start) > cutoff) { regSkipped++; continue; }

      const why = refuse(title);
      if (why) { refused.push(`${title} — ${why} (registration)`); continue; }

      const day = String(start).slice(0, 10);
      const base = `${day}-${slugify(title) || su.id}`;
      const file = join(OUT, `${base}.json`);
      // the calendar pass already published this one; it wins, it has more detail
      if (written.has(file)) { regSkipped++; continue; }
      written.add(file);

      const next = {
        title, start, end: end || "",
        location: "",
        description: (a.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
        url: a.open ? (a.new_registration_url || "") : "",
        featured: false,
        kind: "registration",
        _pcoSignupId: su.id,
      };

      if (DRY) { console.log(`  would publish (registration): ${day}  ${title}${a.logo_url ? "  (has a picture)" : ""}`); regCreated++; continue; }

      const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
      Object.assign(next, await pictureFor(a.logo_url, base, prev));

      if (prev) {
        const merged = { ...next, featured: prev.featured ?? false };
        if (JSON.stringify(merged) !== JSON.stringify(prev)) { writeFileSync(file, JSON.stringify(merged, null, 2) + "\n"); regUpdated++; }
        continue;
      }
      writeFileSync(file, JSON.stringify(next, null, 2) + "\n"); regCreated++;
    }
    console.log(`Registrations: ${regCreated} new, ${regUpdated} updated, ${regSkipped} skipped.`);
    if (regStale.length) {
      console.log(`  (${regStale.length} signup(s) have no future date and were left off: ${regStale.slice(0, 4).join(", ")}${regStale.length > 4 ? "…" : ""})`);
    }
  } catch (e) {
    // Registrations is a separate product and the token may not reach it.
    // That must never take the calendar sync down with it.
    console.log(`Registrations skipped: ${e.message.split("\n")[0]}`);
  }

  for (const [evId, n] of perEvent) {
    if (n > MAX_INSTANCES) {
      const nm = included.get(`Event:${evId}`)?.attributes?.name || evId;
      console.log(`  ! "${nm}" recurs ${n}+ times — capped at ${MAX_INSTANCES}.`);
    }
  }

  if (DRY) {
    console.log(`\nWould publish ${created} calendar event(s) and ${regCreated} sign-up(s). Skipped ${skipped} hidden instance(s).`);
    report();
    console.log("Credentials work. Re-run without --check to write the files.");
    return;
  }

  let removed = 0, kept = 0;
  for (const f of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
    const full = join(OUT, f);
    if (written.has(full)) continue;
    // Events added by hand in Tina are not ours to delete.
    let manual = false;
    try { manual = JSON.parse(readFileSync(full, "utf8"))._manual === true; } catch {}
    if (manual) { kept++; continue; }
    unlinkSync(full); removed++;
  }
  // A copied picture whose event has gone goes with it. Only ever inside
  // public/images/events/, which nothing but this script writes to.
  if (existsSync(IMG_DIR)) {
    const used = new Set();
    for (const f of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
      try { const im = JSON.parse(readFileSync(join(OUT, f), "utf8")).image; if (isOurs(im)) used.add(im); } catch {}
    }
    for (const f of readdirSync(IMG_DIR)) {
      if (!used.has(IMG_URL + f)) { unlinkSync(join(IMG_DIR, f)); removed++; }
    }
  }
  console.log(`new ${created} · updated ${updated} · left alone ${preserved} · removed ${removed} · manual kept ${kept}`);
  console.log(`skipped ${skipped} instance(s) hidden in Church Center`);
  report();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
