# Connecting Planning Center

Five minutes of clicking, and then you send me two strings.

---

## What I need from you

### 1. Make a Personal Access Token

Sign in to **Baker Road's** Planning Center as an administrator, then go to:

**https://api.planningcenteronline.com/oauth/applications**

Scroll to **Personal Access Tokens** → **New Personal Access Token**.
Name it something obvious: `Website event sync`.

You get two strings back — an **Application ID** and a **Secret**. Send me both.
The secret is shown once, so copy it before you close the page.

### 2. Two things worth knowing before you click

**The token inherits the permissions of whoever creates it.** So create it as
someone with Calendar access — and ideally not as a person who might leave the
church, because the sync stops working the day their account is deactivated. If
Planning Center offers a generic admin/office user, use that.

**This token can read a lot.** A Personal Access Token is not scoped to Calendar
alone; it reaches whatever that user can reach, which in Planning Center means
People, Giving and the rest. My sync only ever calls the Calendar endpoint and
only ever writes public events — but the credential itself is broad, so it goes
straight into GitHub Secrets and nowhere else. Don't paste it into a document,
a chat thread, or an email you keep.

---

## What has to be true inside Planning Center

**Calendar has to be turned on**, and events have to actually be on it.

**Each event you want on the website must be ticked "Visible in Church Center."**
This is the on-switch, and it is deliberate. Your church calendar also holds
counselling appointments, funerals, staff meetings and benevolence visits.
Nothing without that tick will ever reach the public website.

So the workflow for the office becomes: *put it on the Planning Center calendar,
tick "Visible in Church Center," and it appears on the website overnight.*
Nothing else to do.

---

## What happens then

I run a check that reads your calendar and **writes nothing**:

```bash
PCO_APP_ID=xxx PCO_SECRET=yyy node scripts/sync-events.mjs --check
```

It prints every event it *would* publish and a count of how many it skipped for
not being public. We look at that list together and confirm nothing private is
in it. Only then do we let it write for real, and put the credentials into
GitHub Secrets so it runs nightly at 5am.

If the list comes back empty, that is almost always the "Visible in Church
Center" tick, not a broken connection.

---

## The forms

Separate job from the events sync, and it needs a decision from you.

Planning Center Forms are hosted **by Planning Center**, on a Church Center
address. They are not embedded in this site's code. So there are two ways to do it:

1. **Link out.** The site's Contact page links to a Church Center form. Simplest,
   works immediately, and Planning Center handles delivery, storage and replies.
   The visitor sees a Church Center page, not ours.
2. **Embed.** Planning Center gives an embed snippet for some forms. Keeps people
   on our site, but it is an iframe, so it looks slightly foreign and adds a
   third-party frame to the page.

**I would link out.** A prayer request that lands reliably in a system the office
already checks beats a prettier form nobody monitors.

Two forms to build:
- **Prayer request** — and decide who receives it, because the old site's
  promise that requests were never read aloud has been removed from the copy
  until someone confirms what actually happens to one.
- **General contact** — visiting, membership, baptism, weddings.

Send me the two Church Center URLs once they exist and I will wire them in.
