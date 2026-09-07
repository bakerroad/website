# SEO audit — brbcbaytown.org

Audited **7 September 2026**, against the live site. The new site was already
live on the domain when this audit began.

The honest headline: **for a church, ranking in Baytown is 80% Google Business
Profile and 20% the website.** The website work below is done. The Business
Profile work needs a human with the church's Google login, and it is the part
that moves the needle.

---

## What was fixed on the site (deployed)

| Problem | Fix |
|---|---|
| **No favicon at all** — `/favicon.ico` was a 404. Bad for browser tabs, Google result icons, and the Business Profile link. | Full icon set generated from the logo: `favicon.ico`, 32px PNG, Apple touch icon, 192/512 PWA icons, `site.webmanifest`. |
| **No social share image** on any page — a Facebook or text-message share showed a blank card. | Branded 1200×630 card (logo, name, "Sundays 9:00 & 10:15", address). Sermon pages use their YouTube thumbnail instead. |
| **No robots.txt** of our own — Cloudflare was serving a default. | `robots.txt` with the sitemap URL, and `/admin/` + `/sop/` disallowed. |
| **Tina editor (`/admin`) and the internal `/sop` page were indexable** and in the sitemap. | Both removed from the sitemap, `/sop` carries `noindex`, both get an `X-Robots-Tag: noindex` header at the edge. |
| **Schema.org was minimal** — name, phone, address only. | Church schema now carries geo coordinates, office hours, map link, logo, image, founding year, area served (Baytown / Harris County), Yelp + Facebook + YouTube. **Event schema** for every upcoming event (Pumpkin Patch is live). **VideoObject schema** on every sermon page with series, upload date, thumbnail. |
| **Sermon meta descriptions were garbage** — YouTube's "description" field is usually just a date, so Google saw `02-15-26`. | Anything under 40 chars or all digits is discarded and a real sentence is written: title, series, preacher, church, city, date. The sync no longer stores the junk either. |
| **Page titles didn't say where the church is** except on the homepage. | `Baytown TX` appended to About, Visit, Ministries, Sermons, Give, Contact. |
| **Generic Google Maps search link.** | Now the church's real **Google Place ID** (`ChIJdZCijh5cP4YRD2idB3WaxMU`), plus a one-click review link stored in Church Info. |
| **No map on the Contact page.** | Embedded Google Map + "Open in Google Maps." |
| **No caching or security headers.** | `_headers`: one-year immutable cache on build assets, a week on images, HSTS, nosniff, frame and referrer policies. |
| Geo meta tags | `geo.region`, `geo.placename`, `geo.position`, `ICBM` on every page. |

---

## Needs a human — in priority order

### 1. Cloudflare: two dashboard settings  ✅ DONE 7 Sep 2026
Both were completed on 7 September. **Always Use HTTPS** was switched on by Matt.
The **www → apex** Redirect Rule (`www to apex`, wildcard `https://www.*` →
`https://${1}`, 301, query string preserved) was created from Cloudflare's
"Redirect from WWW to root" template. Cloudflare warned that `www` might not be
proxied; it is (the Worker's custom domain), so the warning was ignored.
Verified live: `http://www.brbcbaytown.org/about` → `https://brbcbaytown.org/about`.

Left off on purpose: Cloudflare's own **HSTS** toggle. The site already sends
the HSTS header from `_headers`; turning on Cloudflare's version too is harmless
but adds nothing.

### 2. Google Business Profile  *(the single highest-value item on this list)*
The church has a Google Maps listing — the Place ID above proves it — but
nothing I could find suggests it is **claimed and verified**, and directory
searches turned up **no Google reviews**.

Go to `business.google.com`, search "Baker Road Baptist Church Baytown," and
claim it with the church Google account. Then, in this order:

- **Category:** Baptist church (primary), Church (secondary).
- **Hours:** enter the office hours **and** add "Sunday: 9:00 AM – 12:00 PM,
  Wednesday: 5:30 – 7:30 PM" as service times — Google shows these in the panel,
  and that panel is where more people get your service time than the website.
- **Website:** `https://brbcbaytown.org`  **Phone:** (281) 427-0506.
- **Photos:** upload the Pumpkin Patch, the worship photo, the Easter cross,
  the building exterior, the logo. Profiles with photos get dramatically more
  clicks. Add one new photo a month.
- **Description:** paste the homepage intro.
- **Reviews:** the one-click review link is in Church Info. Ask ten members
  who love the church to leave one this month. Ten honest reviews with a 4.8
  average will outrank every other Baptist church in Baytown that has none —
  and most of them have none.
- **Posts:** post the Pumpkin Patch as a Google event post in late September.

### 3. Fix the name and email in the directories  *(NAP consistency)*
Google cross-checks Name / Address / Phone across the web. Right now:

- **Yelp** lists the church as **"Baker Rd Baptist Church"** — wrong name.
  Claim the listing at `biz.yelp.com` and correct it.
- **Yellow Pages** also uses "Baker Rd". Same fix.
- Several directories still publish **`bakerroadbc@comcast.net`** — a dead
  email. Update wherever you find it to `bakerroadbc@gmail.com`.
- Claim **Bing Places** (`bingplaces.com` — can import from Google) and
  **Apple Business Connect** (`businessconnect.apple.com`) — Apple Maps is what
  every iPhone uses for directions.
- The **San Jacinto Baptist Association** directory lists you — confirm the
  website URL there is `brbcbaytown.org`.

### 4. Greater Houston Moms  *(a free local backlink, and it's wrong)*
`greaterhoustonmoms.com` has a Pumpkin Patch listing that still says **October
13–31**, and its "more information" button goes to Facebook, not the website.
Submit the 2026 dates (October 4–31) at
`greaterhoustonmoms.com/submit-events/` and ask them to link to
`brbcbaytown.org/ministries#the-pumpkin-patch`. This is the church's biggest
public event and that page is where Baytown parents find pumpkin patches.

### 5. The YouTube API key is blank
`YOUTUBE_API_KEY` exists in `.env` but has **no value**. The sermon sync has
fallen back to the channel RSS feed, which only ever returns the **15 most
recent videos**. The other 18+ sermons on the channel will never appear until a
key is present. Create one in Google Cloud Console (YouTube Data API v3), paste
it into `.env` and into GitHub Secrets.

### 6. Photos  *(covered in the previous session)*
Six photos, one per ministry, taken on a Sunday with a phone. Nothing else on
this list improves the site more.

---

## Suggestions, lower priority

- **Self-host the two Google Fonts.** Right now Newsreader and Source Sans load
  from Google's servers — a render-blocking request to a third party on every
  page. Self-hosting shaves a few hundred milliseconds off first paint and
  removes a privacy disclosure from the policy. Half an hour of work.
- **Sermon transcripts.** The single richest source of long-form, local,
  keyword-dense content a church has, and Google indexes it. A YouTube
  auto-caption pull could populate a transcript block on each sermon page.
- **A "Churches near me in Baytown" page is not worth writing.** That's the
  SEO-agency move. The Business Profile does that job better, and a thin
  location page reads as spam.
- **Watch Google Search Console.** Add the property at
  `search.google.com/search-console` (verify via the Cloudflare DNS TXT record),
  submit `https://brbcbaytown.org/sitemap-index.xml`, and check it monthly for
  coverage errors. This is how you find out what's actually working.

---

## Google Workspace for the church

Baker Road should be on **Google Workspace for Nonprofits**, which is free and
would give `@brbcbaytown.org` email addresses to staff, shared Drive, Calendar,
and Meet — replacing the `@gmail.com` and `@comcast.net` addresses floating
around the directories. The domain is already on Cloudflare, so the DNS changes
are five minutes.

**How to get it**

1. **Apply for Google for Nonprofits** at `google.com/nonprofits`. You need
   the church's **EIN** and to pass nonprofit validation, which Google runs
   through a partner (Percent, formerly TechSoup). Churches are 501(c)(3)
   organizations by statute and are eligible, but the validator will want to
   see the church in the IRS records or a determination letter. **If Baker Road
   has never requested an IRS determination letter, do that first** — it is
   also what makes donor giving statements clean. Validation typically takes
   a few days to a couple of weeks.
2. Once approved, **activate Google Workspace for Nonprofits** from the
   Google for Nonprofits dashboard. The nonprofit edition is free for eligible
   organizations; verify the current seat limits and storage on Google's page
   at the time you apply, because they change.
3. **Verify the domain.** Google gives you a TXT record; add it in Cloudflare
   DNS. Then add Google's **MX records** and remove whatever MX currently
   points at Network Solutions / Comcast. Email cuts over within an hour.
4. **Create the accounts**: `pastor@`, `office@` (Sarah), `prayer@`, and
   `media@`. Set `office@` as the address on Planning Center, the website's
   Church Info, Yelp, and the Business Profile — one address, everywhere.
5. **While the Google for Nonprofits account is open, also activate
   Google Ad Grants** — up to **$10,000/month in free Google Search ads** for
   nonprofits. For a church whose goal is "top tier in Baytown," this is
   bigger than any SEO trick: paid placement for "church in Baytown" and
   "pumpkin patch Baytown" every October, at no cost. It requires a compliant
   site (this one is) and a modest amount of monthly upkeep.

**If validation stalls** — some churches without a determination letter get
stuck — Google Workspace **Business Starter** is the paid fallback at roughly
$7 per user per month, and the domain setup is identical. Four accounts is
under $30/month. Apply for the nonprofit tier in parallel and switch when it
lands.

**Do not** put the church on the `bakerroadbaptist@gmail.com` build account.
That account is Matt's infrastructure login; the church's mail should live in
the church's own Workspace under its own domain.
