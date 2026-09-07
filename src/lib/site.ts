import settings from "../../content/settings.json";

export const site = settings;

export const NAV = [
  { href: "/",            label: "Home" },
  { href: "/visit",       label: "Plan a Visit" },
  { href: "/about",       label: "About" },
  { href: "/ministries",  label: "Ministries" },
  { href: "/outreach",    label: "Outreach" },
  { href: "/watch",       label: "Watch" },
  { href: "/give",        label: "Give" },
  { href: "/contact",     label: "Contact" },
];

/** "(281) 427-0506" -> "+12814270506" so phones can dial it. */
export const telHref = (phone: string) => {
  const d = (phone || "").replace(/\D/g, "");
  return d ? `tel:+${d.length === 10 ? "1" : ""}${d}` : "";
};

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
