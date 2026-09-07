# Setting this up from nothing

## Two email addresses, two jobs

| Address | What it is for |
|---|---|
| **`bakerroadbaptist@gmail.com`** | The **build** account. GitHub, Tina Cloud, Cloudflare, Google Cloud. Matt created it. |
| **`bakerroadbc@gmail.com`** | The **church's** account. The public contact address on the site, and Sarah Rose's Tina login. |

Everything below is created under the **build** account. Nothing here touches
any other church's accounts.

Turn on 2-factor authentication on every one of them, and write the recovery
codes somewhere physical. The realistic disaster is not a break-in — it is one
person losing a phone.

Work in this order. Each step depends on the one before it.

---

## 1. GitHub  (free)

1. Sign up at github.com as `bakerroadbaptist@gmail.com`.
2. Create a **private** repository called `brbc-website`.
3. Push this folder to it:

```bash
git init && git add -A && git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<account>/brbc-website.git
git push -u origin main
```

Add a second person as a repo admin so the church is never one account away
from losing its website.

---

## 2. Tina Cloud  (free — 2 editors)

1. Sign in at **app.tina.io** with the church Google account.
2. Create a project, point it at the `brbc-website` repo, branch `main`.
3. Copy the **Client ID** and generate a **Read-Only Token**.
4. Invite the editors. **The free plan allows 2**, and both are spoken for:
   - **Sarah Rose** — `bakerroadbc@gmail.com`
   - **Matt** — whichever address you want to administer from
   A third person needs the $24/month plan, so route extra requests through
   Sarah instead.

Local `.env` (copy from `.env.example`):

```
PUBLIC_TINA_CLIENT_ID=...
TINA_TOKEN=...
```

---

## 3. Cloudflare Pages  (free, unlimited bandwidth)

1. Sign up at cloudflare.com with the church account.
2. **Workers & Pages → Create → Pages → Connect to Git** → pick `brbc-website`.
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node version: `20`
4. Environment variables: `PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN`.

Every push rebuilds the site. Because Tina saves by committing to GitHub, an
editor pressing **Save** rebuilds the site on its own. Nobody has to "publish".

---

## 4. YouTube Data API key  (free)

1. console.cloud.google.com → new project → **Enable YouTube Data API v3**.
2. Credentials → Create → API key. Restrict it to the YouTube Data API.
3. GitHub repo → Settings → Secrets and variables → Actions:
   - Secret `YOUTUBE_API_KEY`
   - Variable `YOUTUBE_CHANNEL_ID` = `UCIMoHSQCKy3dtYCG1Wj607A`

Test it before trusting it:

```bash
YOUTUBE_API_KEY=xxx npm run sync:sermons
```

The free quota is 10,000 units/day. This uses roughly 5 per run, once a week.

---

## 5. Planning Center  (uses Baker Road's own PCO account)

1. Sign in to **Baker Road's** Planning Center as an administrator.
2. api.planningcenteronline.com → **Personal Access Tokens** → create one.
3. GitHub secrets: `PCO_APP_ID` and `PCO_SECRET`.

```bash
PCO_APP_ID=xxx PCO_SECRET=yyy npm run sync:events
```

**Events only appear on the website if they are ticked "Visible in Church
Center" in Planning Center.** That tick is the on-switch, and it is deliberate:
a church calendar also holds counselling appointments, funerals and staff
meetings, and none of those belong on a public website. If the events page is
empty, that tick is almost always why.

---

## 6. The domain — do this last

`brbcbaytown.org` is registered at **Network Solutions** and expires
**5 Feb 2028**. The registrant is hidden behind Perfect Privacy LLC, so nobody
can tell from the outside who controls it. **Get into that account before you
point the domain anywhere.**

Once you have access:

1. Cloudflare Pages → your project → **Custom domains** → add `brbcbaytown.org`
   and `www.brbcbaytown.org`.
2. Cloudflare gives you either nameservers or CNAME targets. Set them at
   Network Solutions (currently `ns85`/`ns86.worldnic.com`).
3. Wait for DNS, confirm HTTPS, then spot-check the old addresses in
   `public/_redirects` — `/welcome`, `/our-story`, `/giving` — and make sure
   each one lands on the right new page.

Keep the old SnapPages site up until every redirect is confirmed working.
