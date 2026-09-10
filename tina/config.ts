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
    ],
  },
});
