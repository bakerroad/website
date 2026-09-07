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
  search: { tina: { indexerToken: process.env.TINA_SEARCH_TOKEN || "", stopwordLanguages: ["eng"] } },

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
            type: "object", name: "sections", label: "Sections", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.heading || "Section" }) },
            fields: [
              { type: "string", name: "eyebrow", label: "Small line above the heading" },
              { type: "string", name: "heading", label: "Heading" },
              textarea("body", "Paragraph"),
              { type: "string", name: "note", label: "Small note at the end" },
              {
                type: "object", name: "items", label: "List of items in this section", list: true,
                ui: { itemProps: (i: any) => ({ label: i?.title || "Item" }) },
                fields: [
                  { type: "string", name: "title", label: "Title" },
                  { type: "string", name: "meta", label: "Time / detail on the right" },
                  textarea("body", "Description"),
                  { type: "string", name: "linkText", label: "Link text (optional)" },
                  { type: "string", name: "linkUrl", label: "Link address (optional)" },
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
          { type: "boolean", name: "featured", label: "Show on the homepage" },
        ],
      },
    ],
  },
});
