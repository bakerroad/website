# Taking Baker Road live

Do these in order. Each step needs the one before it.

**Two accounts, two jobs.** `bakerroadbaptist@gmail.com` is the **build** account —
GitHub, Tina, Cloudflare, Google Cloud all go here. `bakerroadbc@gmail.com` is the
**church's** — it is the public contact address. Sarah Rose's editor login is `sarah@brbcbaytown.org`.

Turn on 2-factor on every account and write the recovery codes somewhere physical.
The realistic disaster is not a break-in, it is one person losing a phone.

---

## 1. GitHub  ·  free  ·  10 min

Sign up as `bakerroadbaptist@gmail.com`. Create a **private** repo `brbc-website`.
Then, from `Baker Road Baptist/brbc-website`:

```bash
git remote add origin https://github.com/<account>/brbc-website.git
git push -u origin main
```

There are 25 commits of history already. Add a second person as repo admin so the
church is never one account away from losing its website.

**Credentials live in the macOS Keychain (`brbc-website/*`), not in a folder.** Read them
with `Second Brain/00 SYSTEM/Credentials/get-secret` (`--list` shows every name, `--copy
<name>` puts one on the clipboard without printing it). See the vault notes `Baker Road
Baptist/Accounts & Access.md` and `00 SYSTEM/Credentials/🔐 Credentials Index.md`.

The old `STORED ACCOUNTS/` plain-text folder was retired on 2026-09-10. Nothing replaces it
inside the repository: **never commit a credential here**, and do not recreate a plain-text
folder of them.

---

## 2. Tina Cloud  ·  free, 2 editors  ·  15 min

**This must come before Cloudflare.** `npm run build` calls the Tina CLI, and the
Tina CLI refuses to run without credentials. Deploy first and the build fails.

1. Sign in at **app.tina.io** with the build account.
2. New project → point it at `bakerroad/website`, branch `main`.
3. Copy the **Client ID**.
4. **Tokens → New Token → Content (Read-only)**, and set **Branches to `*`**.
   A token scoped to a named branch that does not match exactly returns
   `403 not authorized to read branch`.
5. Invite the two editors — the free plan allows exactly two:
   - **Sarah Rose**, `sarah@brbcbaytown.org`
   - Matt

Locally, `cp .env.example .env` and fill in `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`
(`get-secret brbc-website/PUBLIC_TINA_CLIENT_ID`, `get-secret brbc-website/TINA_TOKEN`).

### 6. Generate and commit `tina/tina-lock.json` — do not skip this

TinaCloud **will not index a branch** without this file in the repo. Without it
every symptom looks like something else: *"No branches found"*, *"Branches will
not be indexed until your schema is configured"*, and `/admin` reporting
*"Branch 'main' not found"* behind an "Unexpected error validating your schema"
dialog. None of those messages mention the lock file.

It is produced by **`tinacms dev`**, not by `tinacms build`:

```bash
npm run dev          # wait ~10 seconds, then Ctrl+C
git add tina/tina-lock.json
git commit -m "Add tina-lock.json" && git push
```

Then app.tina.io → project → Configuration → **Refresh Branches**. `main` should
appear with a green check within a couple of minutes.

### Two traps

- **Never click "Change Repo" to refresh.** It replaces the project identity —
  new Client ID, all tokens invalidated, checklist reset. If the repo is not
  listed, it is a stale list: reload the page.
- **Leave `npm run build` pointed at `scripts/build.mjs`.** A dead `/admin` is a
  nuisance; a dead website is not, so the build ships the site with or without
  the editor and only goes red if `astro build` itself fails.

  `--skip-cloud-checks` alone was never enough for this. It skips the schema
  check against TinaCloud, but the Tina CLI still throws
  `Missing clientId, token` and fails the whole build when the credentials are
  absent — which on 9 Sep 2026 stopped the website from publishing because of
  one mistyped Cloudflare variable. `scripts/build.mjs` is what actually
  enforces the rule now.

---

## 3. Cloudflare Pages  ·  free  ·  10 min

Sign up with the build account. **Workers & Pages → Create → Pages → Connect to Git**
→ `brbc-website`.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `20` |
| Env var | `PUBLIC_TINA_CLIENT_ID` |
| Env var | `TINA_TOKEN` |

Every push rebuilds. Because Tina saves by committing to GitHub, an editor pressing
**Save** rebuilds the site on its own — nobody has to "publish".

**If the build fails on Tina**, set the build command to `npm run build:site` to get
the site up immediately. That builds everything except `/admin`, so the site is live
and editing is broken rather than both being broken. Fix Tina, then switch back.

---

## 4. YouTube API key  ·  OPTIONAL

**You do not need this.** Without a key the weekly sync reads the channel's free
RSS feed — always the 15 newest public videos, which is everything a weekly job
ever needs. Get a key only if you want the *old* sermons beyond the newest 15
pulled onto the site once. If you do:

console.cloud.google.com → new project → **Enable YouTube Data API v3** → Credentials
→ API key → restrict it to that API.

GitHub → Settings → Secrets and variables → Actions:

- Secret `YOUTUBE_API_KEY`
- Variable `YOUTUBE_CHANNEL_ID` = `UCIMoHSQCKy3dtYCG1Wj607A`

Test before trusting it:

```bash
YOUTUBE_API_KEY=xxx npm run sync:sermons
```

Free quota is 10,000 units/day. This uses about 5, once a week.

---

## 5. Planning Center  ·  already done  ·  2 min

The token exists and is tested. It is in the Keychain as `brbc-website/PCO_APP_ID` + `brbc-website/PCO_SECRET` (copy with `get-secret --copy`).
Put both halves into GitHub Actions secrets:

- `PCO_APP_ID`
- `PCO_SECRET`

Then confirm it reads correctly, writing nothing:

```bash
PCO_APP_ID=xxx PCO_SECRET=yyy npm run sync:events -- --check
```

It should report **1 event tagged `Website`** and skip roughly 1,177 untagged
instances. If it reports 0, someone removed the `Website` tag.

⚠️ That token belongs to a **site administrator with Manager-level People
permissions** — it can read People and Giving, not just Calendar. It only ever
belongs in GitHub Secrets.

---

## 6. The domain  ·  do this last

`brbcbaytown.org` — Network Solutions, expires **5 Feb 2028**, nameservers currently
`ns85` / `ns86.worldnic.com`.

1. Get the new site fully working on its `*.pages.dev` address first. Click every
   page. Submit both forms. Check it on a phone.
2. Cloudflare Pages → your project → **Custom domains** → add `brbcbaytown.org`
   and `www.brbcbaytown.org`.
3. Cloudflare gives you nameservers or CNAME targets. Set them at Network Solutions.
4. Wait for DNS. Confirm HTTPS.
5. **Then** spot-check the old addresses: `/welcome`, `/our-story`, `/giving`,
   `/outreach`, `/blog`. Every one should land somewhere sensible.

**Leave the old SnapPages site up until step 5 passes.** Leaving SnapPages does not
cancel anything else the church pays for — it is only the website.

Giving moved to Planning Center on 11 September 2026, so the Give page no longer
touches Subsplash. Cancelling Subsplash is a separate decision for the church,
and worth checking before it is made: **members with a recurring gift set up in
Subsplash will not be moved across automatically.** Confirm in Planning Center
Giving that recurring donors have re-enrolled, or tell them to, before the
Subsplash account is closed.

---

## After launch

**Two calendar reminders, and that is the whole maintenance burden:**

- **Every September** — put this year's Pumpkin Patch dates in Planning Center and
  tag it `Website`.
- **Every January** — read the whole site once. Check every time, name and role.

**The rule worth keeping:** if a page will be wrong in six months unless somebody
remembers to update it, it does not belong on the website. It goes on Facebook or in
the app, where being of-the-moment is the point.

---

## Still open before you call it done

- **Forms are built but untested.** Submit both yourself and confirm where they land
  and who reads them. A prayer request nobody monitors is worse than no form.
- **The privacy policy is the old SnapPages one, word for word.** Different host,
  different cookies, different forms. Someone at the church has to read and correct
  it. See `OPEN-QUESTIONS.md` #10.
- **Unverified claims still on the site** — no plate passed, Bibles in the pews, the
  10:15–11:40 running order, food trucks at the Pumpkin Patch. One conversation with
  Pastor Marvin clears the lot. See the *Claims to confirm* section of
  `OPEN-QUESTIONS.md`.
- **CONCORD or ONE?** Planning Center calls the student ministry CONCORD; the website
  says Student Ministry. Confirm which name is current.
- **No photos for six of the seven ministries.** See `PHOTOS.md` for the shot list.
