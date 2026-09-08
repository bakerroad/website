# Things only the church can answer

Everything on this site was read off the live `brbcbaytown.org`, its sitemap and
the public YouTube channel on **6 September 2026**. Nothing was invented. Where
the old site was empty, contradicted itself, or would have needed a guess, it is
listed here instead of filled in.

Each item says exactly where the answer goes.

---

## Answered — 6 September 2026

| # | Question | Answer | Where it went |
|---|---|---|---|
| 1 | Email address | `bakerroadbc@gmail.com` | Church Info. Shown as **"Email us"**, never as text |
| 2 | Online giving link | Subsplash | Church Info → Online giving link |
| 3 | Who owns the site | **Sarah Rose** (`bakerroadbc@gmail.com`) | Tina editor #1 |
| 4 | Domain account | Matt has access | Ready for the DNS cutover |
| 5 | Pumpkin Patch dates | **October 4–31** | Outreach |
| 6 | SONrise annual? | Yes | Kept on Outreach |
| 7 | Adult class names | Assume current names correct | No change |
| 8 | Children's ages | **Birth through 5th grade**; youth grades 6–12 | Plan a Visit, Ministries |
| 9 | Church app | `subsplash.com/bakerroadbaptistchurch` | Church Info → app link |
| 11 | Forms | Will be built in Planning Center | Pending PCO connection |
| 12 | ~70 committee names | Leave them off | Done |
| 13 | Photos | Sorted and catalogued | See `PHOTOS.md` |

### Two things I changed on my own judgment — check me

**The giving link had test parameters on it.** What you sent was
`.../give/payment?amount=1&fund_id=...&next_process_date=09%2F06%2F2026&frequency=once`
— that prefills a **$1** gift and hard-codes today's date, which would be stale
tomorrow. I stripped it to the plain giving page, `subsplash.com/u/-7ZWBBR/give`,
which resolves fine. If you specifically wanted a named fund preselected, send
the fund ID and I will add just that parameter.

**Two email addresses are now in play.** You first said the church account was
`bakerroadbaptist@gmail.com`; the contact address you have given is
`bakerroadbc@gmail.com`. The site uses **bakerroadbc**. `SETUP.md` still tells
you to create GitHub, Tina, Cloudflare and Google Cloud under
**bakerroadbaptist**. Tell me which is which and I will make them agree.

### Still open

- **#10 — the privacy policy. DRAFT WRITTEN, awaiting approval.** See
  `PRIVACY-POLICY-DRAFT.md`. It is built on an audit of the live site (Google Analytics 4 added 7 Sept —
  the only cookies the site sets; no forms hosted on the site; six named third
  parties). Two ⚠️ items need the church: the effective date, and whether
  prayer requests are ever read aloud or printed — that promise stays out until
  confirmed. The live page still carries the old, now-wrong SnapPages text until
  this is approved.
- **Pumpkin Patch hours.** The 2023 poster in the photo set says Mon–Fri
  12:30–8:30, Sat 10:00–8:30, Sun 12:00–8:30, plus live music, a "Bootiful Baby
  Contest" and *Oliver the Watusi*. Are those still right for this year?

---

## Blocking — the site should not launch with these unanswered

**1. At least one real email address.**
The old site published none at all, only forms. Plenty of people will not fill
in a form. One general address is the minimum; three is better — general,
prayer, and children's ministry.
→ *Church Info → General email address / Prayer email address*

**2. The online giving link.**
The Subsplash giving page URL. The Give page has a working layout but no
destination, so the "Give online" button is currently dead.
→ *Church Info → Online giving link*

**3. Who owns this site after launch.**
One named person with the login who can change a service time. This is the
question that actually matters. The old site had an empty events page and a blog
last touched in April 2024, which is what happens when nobody is named.
→ *Not a website field. Write it down on paper.*

**4. Domain account access.**
Nobody has yet got into the Network Solutions account. Until somebody does, the
new site cannot go live at `brbcbaytown.org`. See `SETUP.md` §6.

---

## Needed soon

**5. This year's Pumpkin Patch dates.**
It ran 15–31 October in 2023. The Outreach page currently reads
`NEEDS DATES — see Open Questions` where the dates belong. This is the church's
strongest front door to Baytown — somebody can bring their kids for a pumpkin
without attending anything, believing anything, or talking to anyone.
→ *Pages → Outreach → The Pumpkin Patch → the "Time / detail" box*

**6. Does the Easter SONrise service happen every year?**
Described from an April 2024 account: 6:00 AM on the patio, acoustic worship,
the Lord's Supper, readings by members, free breakfast, then the 10:15 service.
If it is annual it stays. If it was a one-off, delete that card.
→ *Pages → Outreach → The SONrise service*

**7. The correct adult class names.**
The old site said **Rooted and Grounded Class** and **Ladies Bible Fellowship**
in the footer, but **Adult Mixed Sunday School** and **Ladies Fellowship Sunday
School** on the Welcome page — for the same 9:00 hour. This site uses the footer
names throughout. Confirm which is right, then use that one name everywhere.
→ *Pages → Home and Pages → Ministries*

**8. Childcare age cutoffs, and what happens at the door.**
The Plan a Visit page says bed babies through grade 5, and grades 6–12 for
youth, taken from the old Sunday School roster. Parents want the actual ages and
to know how check-in works.
→ *Pages → Plan a Visit → Where the kids go*

**9. The church app link.**
Six pages of the old site said "search for Baker Road Baptist Church" with no
link and no icon. Either get the real App Store / Play Store links, or drop the
app from the Watch page.
→ *Church Info → Church app link*

---

## Review before launch

**10. The privacy policy is ported verbatim and is now partly wrong.**
It was written for the SnapPages site. The hosting, the cookies and the form
handling all change with this rebuild. Somebody at the church needs to read it
and correct it. It is a legal document, so it was copied rather than rewritten.
→ *Pages → Privacy Policy*

**11. There are no working forms yet.**
The old site's prayer request and contact forms lived inside SnapPages and do
not come across. The Contact page currently gives the phone number, address and
office hours, which works, but a prayer request form has to be rebuilt or the
page has to tell people to call or email. **Decide before launch — a prayer
request that silently goes nowhere is worse than no form at all.**

**12. Roughly seventy volunteer names were deliberately left off.**
The old `/committee` page listed about seventy people across ten teams. It will
go stale, and it publishes a lot of members' names for no visitor benefit.
Better as a printed handout or a members-only page. The church's call, not ours.

**13. Photographs.**
64 photos were pulled from the church's own website and are in
`../research/images/`. **None are on the site yet.** Before any photo of a
person goes up — especially any photo of a child from the Pumpkin Patch — the
church needs to confirm it has permission to publish it. Photos that members or
visitors posted and tagged were **not** collected: they belong to whoever took
them, and consent to a Facebook tag is not consent to appear on a church's
website. If you want those, ask the people who posted them.

---

# Claims to confirm before launch

The site makes specific promises about what a visitor will experience. Specific
beats vague — it is why this copy works — but every one of these is a promise
the church has to actually keep. They came from the old website and from an
account of a service, not from anyone at Baker Road confirming them.

**Read this list to Pastor Marvin or the office and get a yes or no on each.**
Any "no" is a two-minute edit in Tina. A "no" discovered by a visitor is worse.

### Already removed, because they cannot ship unverified

These were in the draft and have been **taken out**. Put each one back only if
the church confirms it is true — the wording to restore is in brackets.

- **Childcare screening.** *["Our childcare workers are trained and screened",
  "trained, screened childcare"]* — a safety claim about children. If Baker Road
  does run background checks, say so plainly and prominently: parents look for
  exactly this. If it does not, the claim must stay off the site.
- **Giving receipts.** *["You will get an emailed receipt for your records every
  time"]* — depends on how Subsplash is configured, and people rely on it at tax
  time. Confirm in Subsplash, then restore.
- **Prayer request confidentiality.** *["They are never read aloud or posted
  anywhere without your permission"]* — many churches read requests aloud in a
  prayer meeting or print them in a bulletin. If Baker Road does that, this
  sentence was a broken promise about sensitive personal information. Confirm
  what actually happens to a request, then describe *that*.
- **Rides to church.** Softened to "we will do our best to arrange a ride."
  Confirm a transportation team actually exists and still drives.
- **"Someone will get back to you" / "we will answer".** Removed, because there
  is no monitored email address yet and no working form. Restore once there is.

### Still on the site, unverified — confirm or correct

**What a first-timer is told will happen**
- "We will not ask you to stand, introduce yourself, fill out a card, or give
  anything." Plenty of Baptist churches *do* ask visitors for a card.
- "Ask at the front doors and someone will walk you to the right room." Needs
  greeters at the doors at 9:00.
- The service runs "about 90 minutes", and the 10:15 → 11:40 minute-by-minute
  running order on Plan a Visit.
- "Call the church office during the week and a real person will answer."
- "Pastor Marvin is glad to meet with anyone who wants to talk before they ever
  set foot in a service."

**The building**
- Park anywhere in the lot; main doors under the portico; no reserved parking.
- "There are Bibles in the pews."
- "Offering boxes sit near the exits, envelopes are in the pews, and no plate is
  passed down your row." This one is stated three times across two pages, so if
  a plate *is* passed, it is wrong three times.

**Ministries**
- Adult Bible Study is "free to attend, no prior knowledge assumed, and nobody
  will ask you to read aloud."

**Events** — these describe a Pumpkin Patch and an Easter service from previous
years, and are written as though they happen the same way every time.
- Pumpkin Patch: food trucks, face painting, a bounce house.
- SONrise: 6:00 AM on the patio, acoustic worship, the Lord's Supper, readings
  by members, free breakfast in the Fellowship Hall afterward.
