#!/usr/bin/env node
/**
 * Pull upcoming events from Planning Center Calendar into content/events/*.json
 *   PCO_APP_ID=xxx PCO_SECRET=yyy node scripts/sync-events.mjs
 *
 * SAFETY RULE, and it is the important part of this file:
 * a church calendar holds counselling appointments, staff meetings, benevolence
 * visits and funerals. Only events the church has explicitly marked visible in
 * Church Center are ever written to the public website. Everything else is
 * skipped, and the run prints how many it skipped so the omission is visible.
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "./lib/parse-title.mjs";

const { PCO_APP_ID, PCO_SECRET } = process.env;
const OUT = "content/events";
const MONTHS_AHEAD = Number(process.env.EVENT_MONTHS_AHEAD || 6);

if (!PCO_APP_ID || !PCO_SECRET) { console.error("Missing PCO_APP_ID / PCO_SECRET"); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const AUTH = "Basic " + Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString("base64");

async function pco(path, params = {}) {
  const url = new URL(`https://api.planningcenteronline.com/calendar/v2/${path}`);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const r = await fetch(url, { headers: { Authorization: AUTH, Accept: "application/json" } });
  if (r.status === 401) throw new Error("Planning Center rejected the credentials (401). Check PCO_APP_ID / PCO_SECRET.");
  if (!r.ok) throw new Error(`PCO ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

async function fetchInstances() {
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() + MONTHS_AHEAD);
  const rows = [], included = new Map();
  let offset = 0;
  for (;;) {
    // `filter=future` is the documented, supported way to get upcoming
    // instances. Range operators on where[starts_at] are NOT reliably
    // supported, so the far end of the window is trimmed in code below.
    const p = await pco("event_instances", {
      filter: "future", include: "event", order: "starts_at", per_page: 100, offset,
    });
    (p.included || []).forEach((i) => included.set(`${i.type}:${i.id}`, i));
    const batch = p.data || [];
    rows.push(...batch);
    // Results are ordered by start, so once we pass the cutoff we can stop.
    const last = batch[batch.length - 1]?.attributes?.starts_at;
    if (last && new Date(last) > cutoff) break;
    const next = p.meta?.next?.offset;
    if (next == null || batch.length === 0) break;
    offset = next;
  }
  return {
    rows: rows.filter((r) => {
      const t = r.attributes?.starts_at;
      return t && new Date(t) <= cutoff;
    }),
    included,
  };
}

const DRY = process.argv.includes("--check");

async function main() {
  if (DRY) console.log("CHECK MODE — reading Planning Center, writing nothing.\n");
  const { rows, included } = await fetchInstances();
  console.log(`Planning Center returned ${rows.length} event instances in the next ${MONTHS_AHEAD} months.`);

  let skippedPrivate = 0, created = 0, updated = 0, preserved = 0;
  const written = new Set();

  for (const inst of rows) {
    const evId = inst.relationships?.event?.data?.id;
    const ev = evId ? included.get(`Event:${evId}`) : null;
    const a = ev?.attributes || {};

    // ── the safety gate ──────────────────────────────────────────────
    if (!a.visible_in_church_center) { skippedPrivate++; continue; }

    const title = (a.name || "").trim();
    if (!title) { skippedPrivate++; continue; }

    const start = inst.attributes?.starts_at;
    const end = inst.attributes?.ends_at;
    if (!start) continue;

    const day = start.slice(0, 10);
    const file = join(OUT, `${day}-${slugify(title) || inst.id}.json`);
    written.add(file);

    const next = {
      title,
      start, end: end || "",
      location: (inst.attributes?.location || a.location || "").trim(),
      description: (a.summary || a.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
      url: a.registration_url || inst.attributes?.church_center_url || "",
      featured: false,
      _pcoInstanceId: inst.id,
    };

    if (DRY) { console.log(`  would publish: ${day}  ${title}`); created++; continue; }
    if (existsSync(file)) {
      const prev = JSON.parse(readFileSync(file, "utf8"));
      // `featured` is a human decision — never let the sync reset it.
      const merged = { ...next, featured: prev.featured ?? false };
      if (JSON.stringify(merged) !== JSON.stringify(prev)) { writeFileSync(file, JSON.stringify(merged, null, 2) + "\n"); updated++; }
      else preserved++;
      continue;
    }
    writeFileSync(file, JSON.stringify(next, null, 2) + "\n"); created++;
  }

  // Drop events that were cancelled, moved out of range, or made private.
  let removed = 0;
  if (DRY) {
    console.log(`\nWould publish ${created} event(s).`);
    console.log(`Would skip ${skippedPrivate} not marked visible in Church Center.`);
    console.log("\nCredentials work. Re-run without --check to write the files.");
    return;
  }
  for (const f of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
    const full = join(OUT, f);
    if (!written.has(full)) { unlinkSync(full); removed++; }
  }

  console.log(`new ${created} · updated ${updated} · left alone ${preserved} · removed ${removed}`);
  console.log(`skipped ${skippedPrivate} events not marked visible in Church Center (private by design)`);
  if (created + updated + preserved === 0) {
    console.log("\nNothing was published. If that is a surprise, the events in Planning Center are");
    console.log("probably not ticked 'Visible in Church Center'. That tick is the on-switch.");
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
