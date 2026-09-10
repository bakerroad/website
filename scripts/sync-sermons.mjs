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
import { extractDate, tidy, unshout, matchSeries, notSermon, slugify } from "./lib/parse-title.mjs";

const API_KEY = process.env.YOUTUBE_API_KEY || "";
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCIMoHSQCKy3dtYCG1Wj607A";
const OUT = "content/sermons";
const SERIES_FILE = "content/sermon-series.json";
const DRY = process.argv.includes("--check");

mkdirSync(OUT, { recursive: true });
const rules = existsSync(SERIES_FILE) ? JSON.parse(readFileSync(SERIES_FILE, "utf8")) : {};
const known = rules.series || [];
const notSermons = rules.notSermons || [];
const excludedVideoIds = new Set(rules.excludedVideoIds || []);
// The RSS feed uses the date a video was published, which can be years after
// the service when an old recording is made public or retitled. Reuse the date
// and file already attached to a known video ID. This also prevents a title
// correction from creating a second JSON record for the same recording.
const existingByVideoId = new Map();
for (const name of readdirSync(OUT).filter((name) => name.endsWith(".json"))) {
  const file = join(OUT, name);
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    if (data.youtubeId) existingByVideoId.set(data.youtubeId, { file, data });
  } catch (_) {
    // Let the normal build report malformed content with its file path.
  }
}

const unesc = (s) => (s || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const fetchWithRetry = async (url, attempts = 3) => {
  let response;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    response = await fetch(url);
    if (response.ok || (response.status < 500 && response.status !== 404 && response.status !== 429)) return response;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
  }
  return response;
};

/** RSS: the 15 newest public uploads. No key. */
async function fetchFromRss() {
  const r = await fetchWithRetry(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  if (!r.ok) throw new Error(`YouTube RSS ${r.status}`);
  const xml = await r.text();
  const rows = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const e = m[1], pick = (re) => (e.match(re) || [, ""])[1];
    return {
      videoId: pick(/<yt:videoId>([^<]+)</),
      title: unesc(pick(/<title>([\s\S]*?)<\/title>/)).trim(),
      publishedAt: pick(/<published>([^<]+)</),
      description: unesc(pick(/<media:description>([\s\S]*?)<\/media:description>/)),
      // YouTube rotates CDN hosts (i.ytimg / i1.ytimg ...) in RSS, which would make every
      // weekly run "update" all 15 files. Build a canonical URL instead; hqdefault always exists.
      thumb: `https://i.ytimg.com/vi/${pick(/<yt:videoId>([^<]+)</)}/hqdefault.jpg`,
    };
  }).filter((v) => v.videoId);

  // RSS does not expose whether a video permits third-party embeds. oEmbed
  // does: YouTube returns 200 for an embeddable recording and 401/404 when the
  // recording must be watched on YouTube. Store the result so the website can
  // show a useful link instead of a player that fails after somebody clicks it.
  await Promise.all(rows.map(async (v) => {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.videoId}`)}&format=json`;
      const r = await fetchWithRetry(url);
      if (r.ok) v.embeddable = true;
      else if (r.status === 401 || r.status === 404) v.embeddable = false;
    } catch (_) {
      // A transient oEmbed failure must not stop the weekly sermon sync.
    }
  }));
  return rows;
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

  // A livestream's real service date is when it actually went live, NOT when the
  // video row was published. Those differ whenever a stream is made public later,
  // which is most of this back catalogue. Ask for it in batches of 50.
  for (let i = 0; i < out.length; i += 50) {
    const chunk = out.slice(i, i + 50);
    const v = await api("videos", { part: "liveStreamingDetails,status", id: chunk.map((x) => x.videoId).join(",") });
    const byId = new Map((v.items || []).map((it) => [it.id, {
      actualStart: it.liveStreamingDetails?.actualStartTime,
      embeddable: it.status?.embeddable,
    }]));
    for (const row of chunk) {
      const details = byId.get(row.videoId);
      if (details?.actualStart) row.actualStart = details.actualStart;
      if (typeof details?.embeddable === "boolean") row.embeddable = details.embeddable;
    }
  }
  return out;
}

async function main() {
  const source = API_KEY ? "Data API (full catalogue)" : "RSS feed (15 newest, no key)";
  const videos = API_KEY ? await fetchFromApi() : await fetchFromRss();
  console.log(`${DRY ? "CHECK MODE — " : ""}${videos.length} public videos via ${source}.`);

  let created = 0, updated = 0, preserved = 0, skipped = 0;
  const written = new Set();

  for (const v of videos) {
    if (excludedVideoIds.has(v.videoId)) {
      console.log(`  skipped excluded recording (${v.videoId}): ${v.title}`);
      skipped++;
      continue;
    }
    const blockedBy = notSermon(v.title, notSermons);
    if (blockedBy) {
      console.log(`  skipped non-sermon (${blockedBy}): ${v.title}`);
      skipped++;
      continue;
    }
    const [dateFromTitle, stripped] = extractDate(v.title);
    const [dateFromDescription] = extractDate(v.description || "");
    // Order matters: when the stream actually started beats a date typed in a
    // title, which beats the upload timestamp. TZ is fixed at Central so a
    // 10:15am service never lands on the day before.
    const localDay = (iso) =>
      new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    const previous = existingByVideoId.get(v.videoId);
    const sourceDate = (v.actualStart && localDay(v.actualStart)) || dateFromTitle || dateFromDescription ||
      previous?.data._sourceDate || previous?.data.date || localDay(v.publishedAt);
    // _sourceDate does for the date what _sourceTitle does for the title: an
    // editor's correction survives while the upstream evidence is unchanged,
    // but a genuinely changed source date is still allowed through.
    const date = previous?.data._sourceDate === sourceDate ? (previous.data.date || sourceDate) : sourceDate;
    const m = matchSeries(tidy(stripped), known);
    // A description that names the series outright beats guessing from the
    // title. Once a title is cleaned up it no longer repeats the strap-line,
    // so title matching alone loses the series it used to find.
    const declared = (v.description || "").match(/^\s*Series:\s*([^.\n|]{3,60})/mi);
    if (declared) {
      // Descriptions are typed by hand and shout. Map what was written onto the
      // canonical name in sermon-series.json so one series does not appear
      // three times under three spellings.
      const raw = declared[1].trim();
      const canon = matchSeries(raw, known).series;
      m.series = canon || unshout(tidy(raw));
    }
    // A title inside a series group should not repeat the series name, and the
    // strap-line stripping can leave a stranded colon behind.
    if (m.series) {
      const esc = m.series.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      m.title = m.title
        .replace(new RegExp("^\\s*" + esc + "\\s*[:\\-\u2013\u2014]+\\s*", "i"), "")
        .replace(/^[\s:\-\u2013\u2014]+/, "")
        .replace(/\s*:\s*:\s*/g, ": ")
        .trim() || m.title;
    }
    const title = unshout(tidy(m.title)) || "Sunday Service";
    const file = previous?.file || join(OUT, `${date}-${slugify(title) || v.videoId}.json`);
    written.add(file);

    const next = {
      title, date, series: m.series || "", speaker: "Pastor Marvin Rose",
      youtubeId: v.videoId, thumbnail: v.thumb,
      description: v.description.split("\n").filter(Boolean).slice(0, 3).join(" ").trim().slice(0, 400),
      ...(v.embeddable === false ? { embeddable: false } : {}),
      ...(date !== sourceDate ? { _sourceDate: sourceDate } : {}),
      _sourceTitle: v.title, // how we detect a human edit — do not remove
    };

    if (existsSync(file)) {
      const prev = previous?.data || JSON.parse(readFileSync(file, "utf8"));
      const merged = prev._sourceTitle === v.title
        // An empty series is the old default, not a human decision, so treat
        // blank as absent and let a newly declared series fill it in.
        ? {
            ...next,
            title: prev.title || next.title,
            series: prev.series || next.series,
            speaker: prev.speaker || next.speaker,
            description: prev.description ?? next.description,
            ...(v.embeddable === false || (typeof v.embeddable !== "boolean" && prev.embeddable === false)
              ? { embeddable: false }
              : {}),
          }
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
  console.log(`${DRY ? "would: " : ""}new ${created} · updated ${updated} · left alone ${preserved} · skipped ${skipped} non-sermons · removed ${removed}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
