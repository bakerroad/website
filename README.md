# Baker Road Baptist Church — brbcbaytown.org

Astro + TinaCMS, hosted free on Cloudflare Pages. Sermons sync from YouTube and
events from Planning Center via GitHub Actions, so the site keeps itself current
without anybody tending it.

- **Editing guide (for the church):** [docs/EDITING.md](docs/EDITING.md)
- **Setting up the accounts:** [docs/SETUP.md](docs/SETUP.md)
- **Things only the church can answer:** [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md)

## Local development

```bash
npm install
cp .env.example .env      # fill in the Tina values
npm run dev               # http://localhost:4321, admin at /admin
npm run build
```

## Content

All content is plain JSON under `content/`. There is no database.

| Path | What it is | Who writes it |
|---|---|---|
| `content/settings.json` | Address, phone, office hours, service times, external links | A person, in Tina |
| `content/pages/*.json` | The eight pages plus the privacy policy | A person, in Tina |
| `content/sermons/*.json` | One file per sermon | `scripts/sync-sermons.mjs`, weekly |
| `content/events/*.json` | One file per upcoming event | `scripts/sync-events.mjs`, nightly |
| `content/sermon-series.json` | Known series names + misspellings | A person, when a series starts |

### Design rule

Every field in `tina/config.ts` is a plain labelled text box, a number, or a
simple repeating list. No page builder, no drag-and-drop, no Markdown. The
people maintaining this are not web people; a form they can fill in is worth
more than flexibility they will never use. **Do not add a `blocks` field.**

A link written as `"@givingUrl"` in page JSON is resolved from
`content/settings.json` at build time, so external addresses live in exactly one
place.

## The two syncs

Both are **non-destructive to human edits**, which is the whole reason they
survive contact with reality:

- **Sermons** — YouTube titles on this channel are inconsistent (five date
  formats, series names spelled differently week to week). `scripts/lib/parse-title.mjs`
  pulls out the date, matches the series against `content/sermon-series.json`
  including known misspellings, and de-shouts ALL-CAPS titles. If someone then
  corrects a title in Tina, the sync detects that YouTube hasn't changed
  (`_sourceTitle`) and leaves the correction alone.
  Verify the parser against the live channel with `node scripts/test-parse.mjs`
  — it needs no API key.

- **Events** — only events marked **visible in Church Center** are ever
  published. Everything else is skipped and counted in the run log. A church
  calendar holds counselling appointments, funerals and staff meetings; none of
  that belongs on a public website.

## Redirects

`public/_redirects` maps all 42 old SnapPages URLs to their new homes with 301s
so the church keeps its Google rankings. Do not delete rows — some of those
addresses are on printed bulletins.
