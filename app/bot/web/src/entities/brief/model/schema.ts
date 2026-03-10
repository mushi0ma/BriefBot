import { z } from 'zod';

export const BriefSchema = z.object({
  id: z.string().uuid(),
  template_slug: z.string(),
  processing_state: z.string(),
  brief_data: z.any().nullable(),
  pdf_url: z.string().nullable(),
  processing_time_ms: z.number().nullable(),
  created_at: z.string(),
});

export type Brief = z.infer<typeof BriefSchema>;
