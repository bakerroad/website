import { defineConfig } from "tinacms";

/**
 * Baker Road Baptist Church — content model.
 *
 * DESIGN RULE: every field below is a plain labelled text box, a number, or a
 * simple repeating list. There is no page builder, no drag-and-drop layout and
 * no Markdown. An editor who can fill in a form can run this whole website.
 * If you are tempted to add a "blocks" field, don't.
 */

const textarea = (name: string, label: string, description?: string) => ({
  type: "string" as const,
  name,
  label,
  description,
  ui: { component: "textarea" as const },
});

export default defineConfig({
  branch: process.env.GITHUB_BRANCH || process.env.HEAD || "main",
  clientId: process.env.PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",
  build: { outputFolder: "admin", publicFolder: "public" },
  media: { tina: { mediaRoot: "images", publicFolder: "public" } },

  schema: {
    collections: [
      // ─────────────────────────────────────────────────────────────
      // 1. SETTINGS — the things that appear on every page.
      //    This is the file people will edit most. Keep it first.
      // ─────────────────────────────────────────────────────────────
      {
        name: "settings",
        label: "1. Church Info (address, phone, service times)",
        path: "content",
        format: "json",
        match: { include: "settings" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "churchName", label: "Church name", required: true },
          { type: "string", name: "tagline", label: "Short tagline" },
          { type: "string", name: "street", label: "Street address" },
          { type: "string", name: "city", label: "City" },
          { type: "string", name: "state", label: "State" },
          { type: "string", name: "zip", label: "ZIP code" },
          { type: "string", name: "phone", label: "Phone number", description: "Shown as a tap-to-call link on phones." },
          { type: "string", name: "email", label: "General email address" },
          { type: "string", name: "prayerEmail", label: "Prayer email address" },
          { type: "string", name: "mapUrl", label: "Google Maps link" },
          {
            type: "object", name: "officeHours", label: "Office hours", list: true,
            ui: { itemProps: (i: any) => ({ label: `${i?.day ?? "Day"} — ${i?.hours ?? ""}` }) },
            fields: [
              { type: "string", name: "day", label: "Day" },
              { type: "string", name: "hours", label: "Hours", description: 'e.g. "9:00 AM – 2:00 PM" or "Closed"' },
            ],
          },
          {
            type: "object", name: "sunday", label: "Sunday schedule", list: true,
            ui: { itemProps: (i: any) => ({ label: `${i?.time ?? ""} — ${i?.label ?? "Item"}` }) },
            fields: [
              { type: "string", name: "label", label: "What it is" },
              { type: "string", name: "note", label: "Small note underneath" },
              { type: "string", name: "time", label: "Time" },
            ],
          },
          {
            type: "object", name: "wednesday", label: "Wednesday schedule", list: true,
            ui: { itemProps: (i: any) => ({ label: `${i?.time ?? ""} — ${i?.label ?? "Item"}` }) },
            fields: [
              { type: "string", name: "label", label: "What it is" },
              { type: "string", name: "note", label: "Small note underneath" },
              { type: "string", name: "time", label: "Time" },
            ],
          },
          { type: "string", name: "facebookUrl", label: "Facebook page link" },
          { type: "string", name: "youtubeUrl", label: "YouTube channel link" },
          { type: "string", name: "givingUrl", label: "Online giving link", description: "The Subsplash giving page. Do not change unless Subsplash gives you a new address." },
          { type: "string", name: "appUrl", label: "Church app link" },
          { type: "string", name: "connectionCardUrl", label: "Connection Card form link", description: "The Planning Center form behind every \"I'm interested\" button." },
          { type: "string", name: "serveFormUrl", label: "Join the Team form link", description: "The Planning Center form behind every \"Join the serve team\" button." },
        ],
      },

      // ─────────────────────────────────────────────────────────────
      // 2. PAGES — one file per page, all fields are plain text.
      // ─────────────────────────────────────────────────────────────
      {
        name: "page",
        label: "2. Pages",
        path: "content/pages",
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "title", label: "Page title (shown in the browser tab)", required: true },
          textarea("metaDescription", "Description for Google", "One sentence. Google shows this under the page title in search results."),
          { type: "string", name: "eyebrow", label: "Small line above the headline" },
          { type: "string", name: "headline", label: "Headline", required: true },
          textarea("intro", "Opening paragraph"),
          {
            type: "string", name: "layout", label: "Card layout",
            description: 'How the cards on this page are arranged. "One per row" suits a list of ministries; "Side by side" suits shorter cards.',
            options: [
              { value: "grid", label: "Side by side" },
              { value: "stack", label: "One per row" },
            ],
          },
          {
            type: "object", name: "sections", label: "Sections", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.heading || "Section" }) },
            fields: [
              { type: "string", name: "eyebrow", label: "Small line above the heading" },
              { type: "string", name: "heading", label: "Heading" },
              textarea("body", "Paragraph"),
              { type: "image", name: "image", label: "Picture (optional)" },
              { type: "string", name: "imageAlt", label: "Describe the picture", description: "For people using a screen reader. Say what is in it." },
              { type: "string", name: "linkText", label: "Button text (optional)" },
              { type: "string", name: "linkUrl", label: "Button link (optional)", description: 'Type @tel to call the office, @mailto to email it, or paste a web address.' },
              { type: "string", name: "note", label: "Small note at the end" },
              {
                type: "object", name: "items", label: "List of items in this section", list: true,
                ui: { itemProps: (i: any) => ({ label: i?.title || "Item" }) },
                fields: [
                  { type: "string", name: "title", label: "Title" },
                  { type: "string", name: "meta", label: "Small label on the right" },
                  { type: "string", name: "when", label: "When it meets" },
                  textarea("body", "Description"),
                  { type: "image", name: "image", label: "Picture (optional)" },
                  { type: "string", name: "linkText", label: "Link text (optional)" },
                  { type: "string", name: "linkUrl", label: "Link address (optional)", description: 'Type @tel to call the office, @mailto to email it, or paste a web address.' },
                ],
              },
            ],
          },
        ],
      },

      // ─────────────────────────────────────────────────────────────
      // 3. SERMONS — written automatically from YouTube. Read only.
      // ─────────────────────────────────────────────────────────────
      {
        name: "sermon",
        label: "3. Sermons (updates itself from YouTube)",
        path: "content/sermons",
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
          // Editors may fix a title or assign a series; everything else is synced.
        },
        fields: [
          { type: "string", name: "title", label: "Sermon title", required: true },
          { type: "datetime", name: "date", label: "Date preached", required: true },
          { type: "string", name: "series", label: "Series name" },
          { type: "string", name: "speaker", label: "Speaker" },
          { type: "string", name: "youtubeId", label: "YouTube video ID", ui: { component: () => null } },
          { type: "string", name: "thumbnail", label: "Thumbnail", ui: { component: () => null } },
          { type: "boolean", name: "embeddable", label: "Can play on this website", ui: { component: () => null } },
          textarea("description", "Description"),
        ],
      },

      // ─────────────────────────────────────────────────────────────
      // 4. EVENTS — written automatically from Planning Center.
      // ─────────────────────────────────────────────────────────────
      {
        name: "event",
        label: "4. Events (updates itself from Planning Center)",
        path: "content/events",
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "title", label: "Event name", required: true },
          { type: "datetime", name: "start", label: "Starts" },
          { type: "datetime", name: "end", label: "Ends" },
          { type: "string", name: "location", label: "Location" },
          textarea("description", "Description"),
          { type: "string", name: "url", label: "Sign-up or info link" },
          { type: "image", name: "image", label: "Picture" },
          { type: "boolean", name: "featured", label: "Show on the homepage" },
        ],
      },

      // ─────────────────────────────────────────────────────────────
      // 5. THE BEACON — the weekly newsletter. The office already makes
      //    these as pictures every Saturday; this collection is a place to
      //    drop them, nothing more. Date + pictures is the whole job.
      // ─────────────────────────────────────────────────────────────
      {
        name: "newsletter",
        label: "5. The Beacon (weekly newsletter)",
        path: "content/newsletters",
        format: "json",
        defaultItem: () => {
          // The coming Sunday, counting today if today is Sunday. Most weeks
          // this is already right and nobody touches the date at all.
          // Built from local parts, not toISOString(): an evening in Texas is
          // already tomorrow in UTC, which would date the issue a day late.
          const d = new Date();
          d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
          const pad = (n: number) => String(n).padStart(2, "0");
          return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
        },
        ui: {
          // The file is always named after its Sunday, so the list stays in
          // date order and nobody has to invent a filename.
          filename: {
            readonly: true,
            slugify: (values: any) =>
              values?.date ? String(values.date).slice(0, 10) : "new-issue",
          },
          itemProps: (i: any) => ({ label: i?.date ? String(i.date).slice(0, 10) : "New issue" }),
        },
        fields: [
          {
            type: "datetime",
            name: "date",
            label: "Which Sunday is this issue for?",
            required: true,
            ui: { dateFormat: "YYYY-MM-DD" },
            description: "Pick the Sunday. The web address and the order on the page both come from this.",
          },
          {
            type: "object",
            name: "pages",
            label: "The pictures",
            list: true,
            description:
              "Upload the same pictures you already make each week, in reading order — front page first.",
            ui: { itemProps: (i: any) => ({ label: i?.alt || "Page" }) },
            fields: [
              { type: "image", name: "image", label: "Picture", required: true },
              {
                type: "string",
                name: "alt",
                label: "What is on this page?",
                description:
                  "A few words for someone using a screen reader, who cannot see the picture at all. e.g. \"Front page: schedule, sermon and Sunday classes\".",
              },
            ],
          },
          textarea(
            "summary",
            "One line about this week (optional)",
            "Shown under the date, and used when somebody shares the link. e.g. \"Lord's Supper, the Pumpkin Patch work day, and ActivStars sign-ups.\""
          ),
          {
            type: "object",
            name: "highlights",
            label: "A few things worth typing out (optional)",
            list: true,
            description:
              "A picture cannot be read aloud by a phone, searched, or enlarged well on a small screen. Three or four lines here cover the things nobody should miss. Leave it empty on a busy week — the pictures still work.",
            ui: { itemProps: (i: any) => ({ label: i?.title || "Item" }) },
            fields: [
              { type: "string", name: "title", label: "What it is" },
              { type: "string", name: "when", label: "When (optional)" },
              textarea("body", "Anything else (optional)"),
            ],
          },
        ],
      },
    ],
  },
});
