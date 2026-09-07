#!/usr/bin/env node
/**
 * Pull sermons from the church's YouTube channel into content/sermons/*.json
 *   YOUTUBE_API_KEY=xxx node scripts/sync-sermons.mjs
 *
 * The titles on this channel are inconsistent, so the parser does its best and
 * then GETS OUT OF THE WAY: if someone fixes a title or series in Tina, the fix
 * survives every future sync. A sync that clobbers human corrections is a sync
 * that gets switched off within a month.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { extractDate, tidy, unshout, matchSeries, slugify } from "./lib/parse-title.mjs";

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCIMoHSQCKy3dtYCG1Wj607A";
const OUT = "content/sermons";
const SERIES_FILE = "content/sermon-series.json";

if (!API_KEY) { console.error("Missing YOUTUBE_API_KEY"); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const known = existsSync(SERIES_FILE) ? (JSON.parse(readFileSync(SERIES_FILE, "utf8")).series || []) : [];

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: API_KEY }).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`YouTube ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
};

async function fetchAll() {
  const ch = await api("channels", { part: "contentDetails", id: CHANNEL_ID });
  if (!ch.items?.length) throw new Error(`No channel ${CHANNEL_ID}`);
  const uploads = ch.items[0].contentDetails.relatedPlaylists.uploads;
  const out = [];
  let pageToken;
  do {
    const p = await api("playlistItems", { part: "snippet,contentDetails,status", playlistId: uploads, maxResults: 50, pageToken });
    out.push(...p.items);
    pageToken = p.nextPageToken;
  } while (pageToken);
  return out;
}

async function main() {
  const items = (await fetchAll()).filter((it) => {
    const ps = it.status?.privacyStatus;
    return !ps || ps === "public"; // never publish an unlisted or private video
  });
  console.log(`Fetched ${items.length} public videos.`);

  let created = 0, updated = 0, preserved = 0;
  const written = new Set();

  for (const it of items) {
    const raw = it.snippet.title;
    const [dateFromTitle, stripped] = extractDate(raw);
    const date = dateFromTitle || it.snippet.publishedAt.slice(0, 10);
    const clean = tidy(stripped);
    const m = matchSeries(clean, known);
    const title = unshout(tidy(m.title)) || "Sunday Service";
    const series = m.series || "";

    const file = join(OUT, `${date}-${slugify(title) || it.contentDetails.videoId}.json`);
    written.add(file);

    const next = {
      title, date, series,
      speaker: "Pastor Marvin Rose",
      youtubeId: it.contentDetails.videoId,
      thumbnail: it.snippet.thumbnails?.maxres?.url || it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.medium?.url || "",
      description: (it.snippet.description || "").split("\n").filter(Boolean).slice(0, 3).join(" ").trim().slice(0, 400),
      _sourceTitle: raw, // how we detect a human edit — do not remove
    };

    if (existsSync(file)) {
      const prev = JSON.parse(readFileSync(file, "utf8"));
      if (prev._sourceTitle === raw) {
        // YouTube hasn't changed, so trust whatever a person typed in Tina.
        const merged = {
          ...next,
          title: prev.title || next.title,
          series: prev.series ?? next.series,
          speaker: prev.speaker || next.speaker,
          description: prev.description ?? next.description,
        };
        if (JSON.stringify(merged) !== JSON.stringify(prev)) { writeFileSync(file, JSON.stringify(merged, null, 2) + "\n"); updated++; }
        else preserved++;
        continue;
      }
      writeFileSync(file, JSON.stringify(next, null, 2) + "\n"); updated++; continue;
    }
    writeFileSync(file, JSON.stringify(next, null, 2) + "\n"); created++;
  }

  // Remove sermons whose video was deleted or made private.
  let removed = 0;
  for (const f of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
    const full = join(OUT, f);
    if (!written.has(full)) { unlinkSync(full); removed++; }
  }

  const noSeries = items.length - [...written].length;
  console.log(`new ${created} · updated ${updated} · left alone ${preserved} · removed ${removed}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
