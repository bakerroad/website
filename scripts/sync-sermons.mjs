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

mkdirSync(OUT, { recursive: true });

const known = existsSync(SERIES_FILE) ? (JSON.parse(readFileSync(SERIES_FILE, "utf8")).series || []) : [];

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: API_KEY }).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`YouTube ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
};

/**
 * The channel's public RSS feed. Needs no API key, but only ever returns the
 * most recent 15 uploads. Used so the Watch page has real sermons on it before
 * anyone has set up a Google Cloud project; the API path below replaces this
 * and reaches the whole archive.
 */
async function fetchFromRss() {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  if (!r.ok) throw new Error(`YouTube RSS ${r.status}`);
  const xml = await r.text();
  const unesc = (t) => t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
                        .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const e = m[1];
    const pick = (re) => (e.match(re) || [, ""])[1];
    const id = pick(/<yt:videoId>(.*?)<\/yt:videoId>/);
    return {
      contentDetails: { videoId: id },
      snippet: {
        title: unesc(pick(/<title>([\s\S]*?)<\/title>/).trim()),
        publishedAt: pick(/<published>(.*?)<\/published>/),
        description: unesc(pick(/<media:description>([\s\S]*?)<\/media:description>/)),
        thumbnails: { high: { url: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "" } },
      },
    };
  }).filter((v) => v.contentDetails.videoId);
}

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
  const source = API_KEY ? "YouTube Data API" : "public RSS feed (latest 15 only — set YOUTUBE_API_KEY for the full archive)";
  console.log(`Source: ${source}`);
  const items = (API_KEY ? await fetchAll() : await fetchFromRss()).filter((it) => {
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

  // Remove sermons whose video was deleted or made private. Only safe with the
  // API, which returns the whole channel; RSS only shows the latest 15, so
  // pruning against it would delete the entire back catalogue.
  let removed = 0;
  if (API_KEY) {
    for (const f of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
      const full = join(OUT, f);
      if (!written.has(full)) { unlinkSync(full); removed++; }
    }
  }

  const noSeries = items.length - [...written].length;
  console.log(`new ${created} · updated ${updated} · left alone ${preserved} · removed ${removed}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
