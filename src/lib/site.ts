import settings from "../../content/settings.json";

export const site = settings;

/** Planning Center stores an all-day event as an instant (midnight Central as
 *  UTC). Formatting that in the build machine's timezone slides the date by a
 *  day, so every date on this site is rendered in the church's own timezone. */
export const TZ = "America/Chicago";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/visit/", label: "Plan a Visit" },
  { href: "/about/", label: "About" },
  { href: "/ministries/", label: "Ministries", children: [
    { href: "/ministries/#children-s-ministry", label: "Children's Ministry" },
    { href: "/ministries/#student-ministry", label: "Student Ministry" },
    { href: "/ministries/#adult-bible-study", label: "Adult Bible Study" },
    { href: "/ministries/#men-s-ministry", label: "Men's Ministry" },
    { href: "/ministries/#women-s-ministry", label: "Women's Ministry" },
    { href: "/ministries/#care-ministry", label: "Care Ministry" },
    { href: "/ministries/#the-pumpkin-patch", label: "The Pumpkin Patch" },
  ]},
  { href: "/watch/", label: "Watch" },
  { href: "/news/", label: "News & Events" },
  // Give is the one thing on this bar that is an action rather than a place,
  // so it renders as a filled button and stops competing with the links.
  { href: "/give/", label: "Give", cta: true },
  // Contact is deliberately not here. Everything a visitor wants from it —
  // address, phone, service times — is already in the footer on every page,
  // and the page itself is linked from the footer list below the fold.
];

/** "(281) 427-0506" -> "+12814270506" so phones can dial it. */
export const telHref = (phone: string) => {
  const d = (phone || "").replace(/\D/g, "");
  return d ? `tel:+${d.length === 10 ? "1" : ""}${d}` : "";
};

/** The address is never printed as text anywhere — links read "Email us".
 *  That keeps it out of the page for a casual reader and off most scrapers'
 *  visible-text harvest. It is still in the mailto, so a determined scraper
 *  can find it; the real defence is Gmail's spam filtering. */
export const emailHref = () => (site.email ? `mailto:${site.email}` : "");

/** Load every sermon, newest first. */
export function allSermons() {
  const mods = import.meta.glob("../../content/sermons/*.json", { eager: true }) as Record<string, any>;
  return Object.values(mods)
    .map((m) => (m.default ?? m))
    .filter((s) => s && s.title && s.youtubeId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** A stable URL slug for a sermon: /watch/2026-08-30-for-such-a-time-as-this */
export const sermonSlug = (s: any) =>
  `${calendarDate(s.date)}-${String(s.title || "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;

/** Load upcoming events, soonest first. Anything already finished is dropped. */
export function upcomingEvents() {
  const mods = import.meta.glob("../../content/events/*.json", { eager: true }) as Record<string, any>;
  const now = Date.now();
  return Object.values(mods)
    .map((m) => (m.default ?? m))
    .filter((e) => e && e.title && e.start)
    .filter((e) => new Date(e.end || e.start).getTime() >= now - 6 * 3600 * 1000)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

/** Load every issue of The Beacon, newest first. */
export function allNewsletters() {
  const mods = import.meta.glob("../../content/newsletters/*.json", { eager: true }) as Record<string, any>;
  return Object.values(mods)
    .map((m) => (m.default ?? m))
    .filter((n) => n && n.date)
    .map((n) => ({ ...n, date: calendarDate(n.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** "Sunday, September 6, 2026" — always in the church's timezone, so an issue
 *  never shows the day before because the build machine sits in UTC. */
export const longDate = (d: string) =>
  new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", {
    timeZone: TZ, weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

/** The calendar date an editor actually picked, as YYYY-MM-DD.
 *
 *  Tina's datetime field stores a UTC instant. Pick Sunday 13 September in
 *  Texas and it saves "2026-09-14T00:00:00.000Z" — because 13 Sept 19:00 CDT
 *  IS 14 Sept 00:00 UTC. Slicing the first ten characters, which is what this
 *  used to do, therefore printed Monday the 14th over a Sunday bulletin.
 *
 *  So: a plain YYYY-MM-DD is taken at face value, and a timestamp is resolved
 *  in the church's own timezone rather than the build server's. Cloudflare
 *  builds in UTC, so resolving "locally" would have kept the bug. */
export function calendarDate(value: unknown): string {
  const raw = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA gives YYYY-MM-DD
}

/** "Sat, October 4" for one day, "October 4 – 31" for a run of them.
 *  Lived in index.astro until the Upcoming page needed the same thing. */
export const eventDateRange = (e: any) => {
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const fmt = (d: Date, o: any) => d.toLocaleDateString("en-US", { timeZone: TZ, ...o });
  const a = new Date(e.start);
  const b = e.end ? new Date(e.end) : null;
  if (!b || dayKey(b) === dayKey(a)) return fmt(a, { weekday: "short", month: "long", day: "numeric" });
  const sameMonth = fmt(a, { month: "long" }) === fmt(b, { month: "long" });
  return `${fmt(a, { month: "long", day: "numeric" })} \u2013 ${fmt(b, sameMonth ? { day: "numeric" } : { month: "long", day: "numeric" })}`;
};

/** The current Beacon's front page, as a link target.
 *  The footer lists "Newsletter" because that is the word people know, and it
 *  opens the picture itself rather than a page about the picture. Falls back
 *  to the Upcoming page in any week with no issue, or none uploaded yet. */
export function currentBeaconHref() {
  const first = allNewsletters()[0]?.pages?.[0]?.image;
  return typeof first === "string" && first.startsWith("/") ? first : "/news/";
}

/** schema.org Event objects, so Google can show church events as rich results.
 *  Shared by the homepage and the Upcoming page so the two cannot drift. */
export function eventSchema(events: any[], siteUrl?: URL) {
  if (!events.length) return undefined;
  const abs = (u?: string) => (u && siteUrl ? new URL(u, siteUrl).href : undefined);
  const place = {
    "@type": "Place", name: site.churchName,
    address: { "@type": "PostalAddress", streetAddress: site.street, addressLocality: site.city,
               addressRegion: "TX", postalCode: site.zip, addressCountry: "US" },
  };
  return events.map((e: any) => ({
    "@context": "https://schema.org", "@type": "Event",
    name: e.title, startDate: e.start, endDate: e.end || undefined,
    description: e.description || undefined,
    image: abs(e.image),
    url: e.url || siteUrl?.href,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", availability: "https://schema.org/InStock",
      url: e.url || siteUrl?.href, validFrom: e.start },
    location: place,
    organizer: { "@type": "Organization", name: site.churchName, url: siteUrl?.href },
  }));
}
