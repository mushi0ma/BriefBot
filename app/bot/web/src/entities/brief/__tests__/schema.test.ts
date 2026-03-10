import { describe, it, expect } from 'vitest';
import { BriefSchema } from '../model/schema';

describe('BriefSchema', () => {
  it('successfully parses a valid brief object', () => {
    const validBrief = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      template_slug: "default",
      processing_state: "done",
      brief_data: { summary: "Project details" },
      pdf_url: "https://example.com/file.pdf",
      processing_time_ms: 1500,
      created_at: new Date().toISOString()
    };
    
    const result = BriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it('fails to parse an invalid brief object', () => {
    const invalidBrief = {
      id: "not-a-uuid",
      template_slug: "default",
      processing_state: "unknown_state",
      pdf_url: "not-a-url"
    };
    
    const result = BriefSchema.safeParse(invalidBrief);
    expect(result.success).toBe(false);
  });
});
