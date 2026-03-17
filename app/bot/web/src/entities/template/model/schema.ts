import { z } from 'zod';

export const TemplateSchema = z.object({
  slug: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string().optional(),
});

export type Template = z.infer<typeof TemplateSchema>;

export const TEMPLATES: Template[] = [
  { slug: "default", name: "Universal", desc: "General purpose brief for any project type", icon: "public" },
  { slug: "design", name: "Design", desc: "UI/UX, Branding, and Creative assets", icon: "palette" },
  { slug: "development", name: "Development", desc: "Software specs, API docs, and technical tasks", icon: "code" },
  { slug: "marketing", name: "Marketing", desc: "Campaigns, Ads, and Content strategy", icon: "trending_up" },
];
