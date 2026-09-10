#!/usr/bin/env node
/**
 * Pull events from Planning Center into content/events/*.json
 *   PCO_APP_ID=xxx PCO_SECRET=yyy node scripts/sync-events.mjs [--check]
 *
 * Two sources: Calendar (gated by the "Website" tag, see below) and
 * Registrations (gated by the date, see the second block below).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS IS OPT-IN BY TAG, AND MUST STAY THAT WAY
 *
 * The obvious filter is `visible_in_church_center`. On this church's calendar
 * that flag is set on 123 of 136 events — it is effectively always on. Among
 * the events it marks "visible" are two named couples' weddings, a named
 * memorial service, and the Personnel Committee. Publishing on that flag would
 * put a grieving family's funeral and an HR meeting on the public internet.
 *
 * So an event reaches the website only if someone has deliberately tagged it.
 * If the tag does not exist, this script publishes NOTHING and says why.
 * Fail closed. Never widen this filter to "everything public" for convenience.
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
const TAG_NAME = process.env.PCO_WEBSITE_TAG || "Website";
const OUT = "content/events";
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
const EXCLUDE_RE = (RULES.excludePatterns || []).length
  ? new RegExp((RULES.excludePatterns || []).join("|"), "i") : null;

/** Refuse an event regardless of tagging. The tag is the gate; this is the lock. */
function refuse(name) {
  const n = (name || "").trim().toLowerCase();
  if (EXCLUDE_NAMES.has(n)) return "outside group, not a church event";
  if (EXCLUDE_RE && EXCLUDE_RE.test(n)) return "private, pastoral or internal by name";
  return null;
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

const HOWTO = `
Nothing was published, on purpose.

To choose what appears on the website, in Planning Center:
  Calendar -> Tags -> create a tag group with a tag named "${TAG_NAME}"
  then open each event that belongs on the website and apply that tag.

Tag only genuine, public, occasional events — the Pumpkin Patch, a
Thanksgiving Banquet, a Community Worship Night. Do NOT tag the weekly
schedule; Sunday and Wednesday times are already on every page of the site.
Never tag weddings, memorial services, or committee meetings.
`;

function reportFactory(refused, staples) {
  return () => {
    if (staples.size) {
      console.log(`\nheld back as weekly staples (already shown as the schedule): ${[...staples].join(", ")}`);
    }
    if (refused.length) {
      console.log("\nrefused by content/event-rules.json even though tagged:");
      refused.forEach((r) => console.log("  ✗ " + r));
    }
  };
}

async function main() {
  if (DRY) console.log("CHECK MODE — reading Planning Center, writing nothing.\n");

  // 1. find the opt-in tag
  const { rows: tags } = await pageAll("tags");
  const tag = tags.find((t) => (t.attributes?.name || "").trim().toLowerCase() === TAG_NAME.toLowerCase());
  if (!tag) {
    console.log(`No Calendar tag called "${TAG_NAME}" exists yet.`);
    console.log(HOWTO);
    return;
  }

  // 2. which events carry it
  const { rows: tagged } = await pageAll(`tags/${tag.id}/events`);
  const allowed = new Set(tagged.map((e) => e.id));
  console.log(`Tag "${TAG_NAME}" is on ${allowed.size} event(s).`);
  if (!allowed.size) { console.log(HOWTO); return; }

  // 3. upcoming instances of those events
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
    if (!allowed.has(evId)) { skipped++; continue; }

    const ev = included.get(`Event:${evId}`);
    const a = ev?.attributes || {};
    // belt and braces: the tag is the gate, but honour the flag too
    if (!a.visible_in_church_center) { skipped++; continue; }

    const start = inst.attributes?.starts_at;
    if (!start || new Date(start) > cutoff) continue;

    // a weekly regular that got tagged by mistake would flood the page
    const n = (perEvent.get(evId) || 0) + 1;
    perEvent.set(evId, n);
    if (n > MAX_INSTANCES) continue;

    const title = (a.name || "").trim();
    if (!title) continue;
    const why = refuse(title);
    if (why) { refused.push(`${title} — ${why}`); continue; }

    // A recurring staple is the weekly rhythm, not an event. The Sunday and
    // Wednesday times already appear on every page of the site.
    const rec = (inst.attributes?.recurrence || "").trim();
    if (rec && rec.toLowerCase() !== "none") { staples.add(title); continue; }
    const day = start.slice(0, 10);
    const file = join(OUT, `${day}-${slugify(title) || inst.id}.json`);
    written.add(file);

    const next = {
      title, start, end: inst.attributes?.ends_at || "",
      location: (inst.attributes?.location || a.location || "").trim(),
      description: (a.summary || a.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
      url: a.registration_url || inst.attributes?.church_center_url || "",
      featured: false,
      _pcoInstanceId: inst.id,
    };

    if (DRY) { console.log(`  would publish: ${day}  ${title}`); created++; continue; }

    if (existsSync(file)) {
      const prev = JSON.parse(readFileSync(file, "utf8"));
      // `featured` and `image` are human decisions. Planning Center's own
      // image_url is a signed link that expires, so a locally-hosted picture
      // always wins over re-syncing that URL.
      const merged = { ...next, featured: prev.featured ?? false, ...(prev.image ? { image: prev.image } : {}) };
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
      const file = join(OUT, `${day}-${slugify(title) || su.id}.json`);
      // the calendar pass already published this one; it wins, it has more detail
      if (written.has(file)) { regSkipped++; continue; }
      written.add(file);

      const next = {
        title, start, end: end || "",
        location: "",
        description: (a.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
        url: a.open ? (a.new_registration_url || "") : "",
        featured: false,
        _pcoSignupId: su.id,
      };

      if (DRY) { console.log(`  would publish (registration): ${day}  ${title}`); regCreated++; continue; }

      if (existsSync(file)) {
        const prev = JSON.parse(readFileSync(file, "utf8"));
        const merged = { ...next, featured: prev.featured ?? false, ...(prev.image ? { image: prev.image } : {}) };
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
      console.log(`  ! "${nm}" recurs ${n}+ times — capped at ${MAX_INSTANCES}. If it is a weekly regular, untag it.`);
    }
  }

  if (DRY) {
    console.log(`\nWould publish ${created}. Skipped ${skipped} untagged instance(s).`);
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
  console.log(`new ${created} · updated ${updated} · left alone ${preserved} · removed ${removed} · manual kept ${kept}`);
  console.log(`skipped ${skipped} instance(s) not tagged "${TAG_NAME}"`);
  report();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
