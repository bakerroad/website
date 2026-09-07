#!/usr/bin/env node
/**
 * Pull sermons from the church's YouTube channel into content/sermons/*.json
 *
 *   node scripts/sync-sermons.mjs            # write files
 *   node scripts/sync-sermons.mjs --check    # read only, print what would change
 *
 * TWO SOURCES, so the site never depends on a credential:
 *   - No YOUTUBE_API_KEY  -> the channel's public RSS feed. Free, no account,
 *     no quota. Always the 15 newest public videos, which is all a weekly job
 *     ever needs. This is the default.
 *   - YOUTUBE_API_KEY set -> the Data API, which walks the entire back
 *     catalogue. Only needed once, to pull the old sermons the RSS feed can't.
 *
 * The titles on this channel are inconsistent, so the parser does its best and
 * then GETS OUT OF THE WAY: if someone fixes a title or series in Tina, the fix
 * survives every future sync. A sync that clobbers human corrections is a sync
 * that gets switched off within a month.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { extractDate, tidy, unshout, matchSeries, slugify } from "./lib/parse-title.mjs";

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCIMoHSQCKy3dtYCG1Wj607A";
const OUT = "content/sermons";
const SERIES_FILE = "content/sermon-series.json";
const DRY = process.argv.includes("--check");

mkdirSync(OUT, { recursive: true });
const known = existsSync(SERIES_FILE) ? (JSON.parse(readFileSync(SERIES_FILE, "utf8")).series || []) : [];

const unesc = (s) => (s || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** RSS: the 15 newest public uploads. No key. */
async function fetchFromRss() {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  if (!r.ok) throw new Error(`YouTube RSS ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const e = m[1], pick = (re) => (e.match(re) || [, ""])[1];
    return {
      videoId: pick(/<yt:videoId>([^<]+)</),
      title: unesc(pick(/<title>([\s\S]*?)<\/title>/)).trim(),
      publishedAt: pick(/<published>([^<]+)</),
      description: unesc(pick(/<media:description>([\s\S]*?)<\/media:description>/)),
      thumb: pick(/<media:thumbnail[^>]*url="([^"]+)"/),
    };
  }).filter((v) => v.videoId);
}

/** Data API: the whole channel, public videos only. Needs a key. */
async function fetchFromApi() {
  const api = async (path, params) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    Object.entries({ ...params, key: API_KEY }).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    const r = await fetch(url);
    if (!r.ok) throw new Error(`YouTube ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return r.json();
  };
  const ch = await api("channels", { part: "contentDetails", id: CHANNEL_ID });
  if (!ch.items?.length) throw new Error(`No channel ${CHANNEL_ID}`);
  const uploads = ch.items[0].contentDetails.relatedPlaylists.uploads;
  const out = []; let pageToken;
  do {
    const p = await api("playlistItems", { part: "snippet,contentDetails,status", playlistId: uploads, maxResults: 50, pageToken });
    for (const it of p.items) {
      const ps = it.status?.privacyStatus;
      if (ps && ps !== "public") continue; // never publish unlisted or private
      out.push({
        videoId: it.contentDetails.videoId, title: it.snippet.title, publishedAt: it.snippet.publishedAt,
        description: it.snippet.description || "",
        thumb: it.snippet.thumbnails?.maxres?.url || it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.medium?.url || "",
      });
    }
    pageToken = p.nextPageToken;
  } while (pageToken);
  return out;
}

async function main() {
  const source = API_KEY ? "Data API (full catalogue)" : "RSS feed (15 newest, no key)";
  const videos = API_KEY ? await fetchFromApi() : await fetchFromRss();
  console.log(`${DRY ? "CHECK MODE — " : ""}${videos.length} public videos via ${source}.`);

  let created = 0, updated = 0, preserved = 0;
  const written = new Set();

  for (const v of videos) {
    const [dateFromTitle, stripped] = extractDate(v.title);
    const date = dateFromTitle || v.publishedAt.slice(0, 10);
    const m = matchSeries(tidy(stripped), known);
    const title = unshout(tidy(m.title)) || "Sunday Service";
    const file = join(OUT, `${date}-${slugify(title) || v.videoId}.json`);
    written.add(file);

    const next = {
      title, date, series: m.series || "", speaker: "Pastor Marvin Rose",
      youtubeId: v.videoId, thumbnail: v.thumb,
      description: v.description.split("\n").filter(Boolean).slice(0, 3).join(" ").trim().slice(0, 400),
      _sourceTitle: v.title, // how we detect a human edit — do not remove
    };

    if (existsSync(file)) {
      const prev = JSON.parse(readFileSync(file, "utf8"));
      const merged = prev._sourceTitle === v.title
        ? { ...next, title: prev.title || next.title, series: prev.series ?? next.series, speaker: prev.speaker || next.speaker, description: prev.description ?? next.description }
        : next;
      if (JSON.stringify(merged) !== JSON.stringify(prev)) { if (!DRY) writeFileSync(file, JSON.stringify(merged, null, 2) + "\n"); updated++; }
      else preserved++;
      continue;
    }
    if (DRY) console.log(`  would add: ${date}  ${m.series ? `[${m.series}] ` : ""}${title}`);
    else writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
    created++;
  }

  // Remove sermons whose video is gone — but ONLY when we saw the whole
  // catalogue. The RSS feed is a 15-item window, so anything older than it
  // is simply out of view, not deleted.
  let removed = 0;
  if (API_KEY) {
    for (const f of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
      const full = join(OUT, f);
      if (!written.has(full)) { if (!DRY) unlinkSync(full); removed++; }
    }
  }
  console.log(`${DRY ? "would: " : ""}new ${created} · updated ${updated} · left alone ${preserved} · removed ${removed}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
