/** Runs the title parser over the channel's real, live titles (RSS — no API key needed). */
import { readFileSync } from "node:fs";
import { extractDate, tidy, unshout, matchSeries } from "./lib/parse-title.mjs";

const known = JSON.parse(readFileSync("content/sermon-series.json", "utf8")).series;
const CH = process.env.YOUTUBE_CHANNEL_ID || "UCIMoHSQCKy3dtYCG1Wj607A";
const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CH}`)).text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => ({
  title: (m[1].match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1]
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim(),
  published: (m[1].match(/<published>(.*?)<\/published>/) || [, ""])[1],
}));

let dated = 0, sery = 0;
console.log(`${entries.length} live titles\n${"=".repeat(92)}`);
for (const e of entries) {
  const [d, stripped] = extractDate(e.title);
  if (d) dated++;
  const clean = tidy(stripped);
  const { series, title } = matchSeries(clean, known);
  if (series) sery++;
  const final = unshout(tidy(title)) || "Sunday Service";
  console.log(`RAW   ${e.title}`);
  console.log(`  →   ${(d || e.published.slice(0, 10))}  ${series ? `[${series}] ` : ""}${final}\n`);
}
console.log(`${"=".repeat(92)}\ndate from title: ${dated}/${entries.length}   ·   series matched: ${sery}/${entries.length}`);
