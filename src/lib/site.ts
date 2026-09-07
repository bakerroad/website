import settings from "../../content/settings.json";

export const site = settings;

/** Planning Center stores an all-day event as an instant (midnight Central as
 *  UTC). Formatting that in the build machine's timezone slides the date by a
 *  day, so every date on this site is rendered in the church's own timezone. */
export const TZ = "America/Chicago";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/visit", label: "Plan a Visit", children: [
    { href: "/visit#900-w-baker-rd", label: "Getting here" },
    { href: "/visit#aim-for-10-05", label: "When to arrive" },
    { href: "/visit#where-the-kids-go", label: "Where the kids go" },
    { href: "/visit#a-typical-sunday", label: "A typical Sunday" },
  ]},
  { href: "/about", label: "About", children: [
    { href: "/about#make-disciples", label: "Our mission" },
    { href: "/about#our-core-convictions", label: "What we believe" },
    { href: "/about#on-baker-road-since-1978", label: "Our story" },
    { href: "/about#the-people-who-serve-here", label: "Leadership" },
  ]},
  { href: "/ministries", label: "Ministries", children: [
    { href: "/ministries#one-student-ministry", label: "Students, grades 6–12" },
    { href: "/ministries#children-s-ministry", label: "Children" },
    { href: "/ministries#crosswalk", label: "Men — Crosswalk" },
    { href: "/ministries#ladies-bible-fellowship", label: "Women" },
    { href: "/ministries#adult-bible-study", label: "Adult Bible Study" },
    { href: "/ministries#care-team", label: "Care Team" },
  ]},
  { href: "/serve", label: "Serve", children: [
    { href: "/serve#worship-team", label: "Worship team" },
    { href: "/serve#media-and-sound", label: "Media and sound" },
    { href: "/serve#childcare-and-sunday-school", label: "Children and Sunday School" },
    { href: "/serve#hospitality", label: "Hospitality" },
    { href: "/serve#transportation", label: "Transportation" },
    { href: "/serve#the-pumpkin-patch", label: "The Pumpkin Patch" },
  ]},
  { href: "/outreach", label: "Outreach", children: [
    { href: "/outreach#the-pumpkin-patch", label: "The Pumpkin Patch" },
    { href: "/outreach#the-sonrise-service", label: "Easter SONrise" },
    { href: "/outreach#a-ride-to-church", label: "A ride to church" },
    { href: "/outreach#neighbors-in-need", label: "Neighbors in need" },
    { href: "/outreach#missionaries", label: "Missionaries" },
  ]},
  { href: "/watch", label: "Watch", children: [
    { href: "/watch#recent-messages", label: "Recent messages" },
    { href: "/watch#our-sermon-channel", label: "YouTube channel" },
    { href: "/watch#day-to-day-news", label: "Facebook" },
  ]},
  { href: "/give", label: "Give", children: [
    { href: "/give#give-online", label: "Give online" },
    { href: "/give#on-sunday-morning", label: "On Sunday morning" },
    { href: "/give#send-a-check", label: "By mail" },
    { href: "/give#why-we-give-at-all", label: "Why we give" },
  ]},
  { href: "/contact", label: "Contact", children: [
    { href: "/contact#let-us-pray-for-you", label: "Prayer request" },
    { href: "/contact#send-us-a-note", label: "Send us a note" },
    { href: "/contact#baptism-and-membership", label: "Baptism & membership" },
  ]},
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

export const fullAddress = () =>
  [site.street, [site.city, site.state].filter(Boolean).join(", "), site.zip].filter(Boolean).join(" ");

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
  `${String(s.date).slice(0, 10)}-${String(s.title || "")
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
