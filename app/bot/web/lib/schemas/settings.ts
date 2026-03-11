import { z } from 'zod';

export const VALID_TEMPLATES = ['default', 'minimal', 'detailed', 'creative'] as const;

/**
 * Zod schema for PATCH /api/settings request body.
 * Validates branding fields with strict mode (rejects unknown keys).
 */
export const SettingsPatchSchema = z.object({
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color like #FF5500')
    .optional(),
  logo_url: z
    .string()
    .url('Must be a valid URL')
    .max(500, 'URL must be under 500 characters')
    .refine((url) => url.startsWith('https://'), {
      message: 'Only HTTPS URLs are allowed',
    })
    .optional(),
  default_template: z
    .enum(VALID_TEMPLATES)
    .optional(),
}).strict();

export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;
