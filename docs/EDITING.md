# Changing the website

*Written for whoever ends up doing this. You do not need to know anything about
computers beyond filling in a form.*

## Getting in

Go to **brbcbaytown.org/admin** and sign in with the church Google account.
You will see a list down the left-hand side. That is the whole website.

## The five things in the list

**1. Church Info** — the address, the phone number, office hours, and the Sunday
and Wednesday schedules. Change a time here and it changes everywhere on the
website at once. This is the one you will use most.

**2. Pages** — the nine pages, one at a time. Every box is plain text. Type in
it like you would type in an email.

**3. Sermons** — fills itself in from YouTube every Monday. You do not have to
add anything. If a title came across wrong, fix it here and it will stay fixed.

**4. Events** — fills itself in from Planning Center every night, from two
places. A **Calendar** event needs the `Website` tag put on it, or it stays off
the site on purpose. A **Registrations** sign-up needs no tag, but it does need
a real date in the future. Closing or archiving a sign-up is *not* what takes
it off the website — the date passing is. So always give a sign-up a date.

**5. The Beacon** — the weekly newsletter. See below.

## Putting up the weekly Beacon

This takes about a minute and it is the only thing on the site with a weekly
rhythm.

1. Open **5. The Beacon** and press **Add File** (top right).
2. Pick **the Sunday** the issue is for. That is all the naming it needs — the
   web address, the order on the page and the heading all come from that date.
3. Under **The pictures**, add one row per page and upload the same picture you
   already make each week. Front page first.
4. Write a few words in **What is on this page?** for each one. Somebody using a
   screen reader hears only those words, so say what is actually on the page.
5. Press **Save**.

Two optional boxes are worth the extra minute on most weeks:

- **One line about this week** — shows under the date, and is what appears when
  somebody shares the link in a text message or on Facebook.
- **A few things worth typing out** — three or four items nobody should miss.
  A picture cannot be read aloud by a phone, cannot be searched, and is hard to
  read on a small screen. These lines can. Skip it on a busy week; the pictures
  still work on their own.

If you would rather do it from a terminal than from Tina, there is a one-liner
that converts, resizes, names and files the pictures for you:

```
node scripts/add-beacon.mjs 2026-09-06 ~/Desktop/page1.png ~/Desktop/page2.png
```

**Only the newest issue is on the website.** Adding this Sunday's is what takes
last Sunday's down. You do not have to delete anything, and there is no archive
to keep tidy. Nothing is lost either — an old issue keeps its file, it just
stops being the page. The address never changes, so
**brbcbaytown.org/news/** is always this week's Beacon and is the link to
share. The old address **brbcbaytown.org/newsletter/** still works and lands in
the same place, because that is the word people go looking for.

**Name the files after the Sunday**, lower case, hyphens only:

```
2026-09-13-page-1.jpg
2026-09-13-page-2.jpg
```

Year, month, day, then `-page-` and the number. Page 1 is the front. No spaces,
commas, apostrophes or capitals — a comma makes every browser take a redirect
before it gets the picture. Rename whatever your design tool produced before
uploading.

**Save your pictures as JPEG, not PNG.** A full page saved as a PNG can be ten
megabytes, which is slow to open on a phone. The same page as a JPEG is under
one.

### What Google sees

Google indexes this page, so the church's events can be found by someone
searching for them. The Beacon pictures are held back from Google Images,
because they carry the rota, volunteer names and the week's giving. The page's
own words carry none of that.

Nothing you do week to week changes this. It is a setting, not a choice you
make each time.

## Saving

Press **Save**. That is it. The website updates itself a few minutes later.
Allow ten before worrying.
There is no separate "publish" button.

## If you make a mistake

Nothing is ever really lost — every change is kept. Tell whoever looks after the
site and they can put back any earlier version.

## The rule worth keeping

**If a page will be wrong in six months unless somebody remembers to update it,
it should not be on the website.** Put it on Facebook or in the app, where being
of-the-moment is the point.

That rule is why this site has nine pages instead of twenty-six, and it is the
reason it will still be accurate in two years. The Beacon is the one exception,
and it works precisely because every issue is stamped with its own date — an old
one is obviously old, rather than quietly wrong.

## The dates in the calendar

- **Every Saturday or Sunday** — put up that week's Beacon. One minute.
- **Every September** — put this year's Pumpkin Patch dates on the Outreach page.
- **Every January** — read the whole site once. Check every time, name and role
  is still true.

That is the entire maintenance burden, by design.
