import { z } from 'zod';

export const UserSettingsSchema = z.object({
  brand_color: z.string().nullable(),
  logo_url: z.string().url().nullable().or(z.literal("")),
  default_template: z.string().nullable(),
  include_assessment: z.boolean().nullable().optional(),
  include_keywords: z.boolean().nullable().optional(),
  include_summary: z.boolean().nullable().optional(),
  include_competitors: z.boolean().nullable().optional(),
  include_tone: z.boolean().nullable().optional(),
  // New Output Options
  watermark_on_pdf: z.boolean().nullable().optional(),
  include_cover_page: z.boolean().nullable().optional(),
  page_numbering: z.boolean().nullable().optional(),
  base_font_size: z.number().nullable().optional(),
  paper_size: z.string().nullable().optional(),
  // New Account Options
  language: z.string().nullable().optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
