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

**The connection is live and tested.** What follows is what we found when we
looked at the actual calendar, and why the design changed because of it.

### "Visible in Church Center" is not a usable filter here

I originally built the sync around that flag. On Baker Road's calendar it is set
on **123 of 136 events** — it is effectively always on. Among the events it
marks visible:

- **Jack Connor Memorial Service**
- **Kristen and Geramy Wedding**
- **Jessica Reyes and Mark Wright Jr. Wedding**
- **Personnel Committee Meeting**
- every Church Council, Deacons and Business Meeting

Publishing on that flag would have put a grieving family's funeral, two named
couples' weddings, and an HR meeting on the public internet. So the flag alone
is not the gate.

### The sync is now opt-in by tag, and fails closed

An event reaches the website **only if someone deliberately tags it**. No tag,
nothing published — the script says so and stops.

**To turn it on:** in Planning Center, **Calendar → Tags** → create a tag group
containing a tag named **`Website`**. Then open each event that belongs on the
site and apply that tag.

Tag genuine, public, occasional events: the Pumpkin Patch, the Thanksgiving
Banquet, a Community Worship Night, Hymn Sunday. **Do not tag the weekly
schedule** — Sunday and Wednesday times already appear on every page. **Never
tag a wedding, a memorial service, or a committee meeting.**

There is a second guard: if a tagged event turns out to recur more than twelve
times in the window, the sync caps it and warns you, so a mistagged weekly
regular cannot flood the page.

### What is on the calendar right now

Almost nothing but the weekly rhythm. In the next six months the calendar holds
about 900 instances, and **all of them are recurring regulars** — Sunday
Worship, the Bible studies, Worship Band Rehearsal, and two outside groups
(Active Stars Karate and Cheerleading) that appear to rent the building.

**This year's Pumpkin Patch is not on the Planning Center calendar at all.**
You told me it runs 4–31 October. It needs to be added and tagged, or the
website's events section will simply stay empty through the church's biggest
outreach of the year.

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
