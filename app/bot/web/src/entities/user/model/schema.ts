import { z } from 'zod';

export const UserSettingsSchema = z.object({
  brand_color: z.string().nullable(),
  logo_url: z.string().url().nullable().or(z.literal("")),
  default_template: z.string().nullable(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
