import { describe, it, expect } from 'vitest';
import { TemplateSchema, TEMPLATES } from '../model/schema';

describe('TemplateSchema', () => {
  it('validates a correct template object', () => {
    const result = TemplateSchema.safeParse({
      slug: 'design',
      icon: '🎨',
      name: 'Дизайн',
      desc: 'Визуальные проекты',
    });
    expect(result.success).toBe(true);
  });

  it('fails on missing slug', () => {
    const result = TemplateSchema.safeParse({
      icon: '🎨',
      name: 'Дизайн',
      desc: 'Визуальные проекты',
    });
    expect(result.success).toBe(false);
  });

  it('TEMPLATES contains at least 1 entry', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(1);
  });

  it('all TEMPLATES conform to schema', () => {
    TEMPLATES.forEach((t) => {
      const result = TemplateSchema.safeParse(t);
      expect(result.success).toBe(true);
    });
  });
});
