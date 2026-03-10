import { describe, it, expect } from 'vitest';
import { SettingsPatchSchema } from '../schemas/settings';

/**
 * Tests for SettingsPatchSchema — Zod validation contract
 * for PATCH /api/settings input.
 */

describe('SettingsPatchSchema — Input Validation', () => {
  // ── Happy path ──────────────────────────────────────────────────

  it('accepts valid full payload', () => {
    const result = SettingsPatchSchema.safeParse({
      brand_color: '#FF5500',
      logo_url: 'https://example.com/logo.png',
      default_template: 'minimal',
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial payload (only brand_color)', () => {
    const result = SettingsPatchSchema.safeParse({ brand_color: '#000000' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = SettingsPatchSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  // ── brand_color validation ──────────────────────────────────────

  it('rejects brand_color without #', () => {
    const result = SettingsPatchSchema.safeParse({ brand_color: 'FF5500' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toContain('hex color');
  });

  it('rejects brand_color with 3-digit hex', () => {
    const result = SettingsPatchSchema.safeParse({ brand_color: '#F00' });
    expect(result.success).toBe(false);
  });

  it('rejects brand_color with 8-digit hex (alpha)', () => {
    const result = SettingsPatchSchema.safeParse({ brand_color: '#FF5500AA' });
    expect(result.success).toBe(false);
  });

  it('rejects brand_color with non-hex chars', () => {
    const result = SettingsPatchSchema.safeParse({ brand_color: '#GGHHII' });
    expect(result.success).toBe(false);
  });

  // ── logo_url validation ─────────────────────────────────────────

  it('rejects logo_url that is not a URL', () => {
    const result = SettingsPatchSchema.safeParse({ logo_url: 'not-a-url' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toContain('URL');
  });

  it('rejects logo_url longer than 500 chars', () => {
    const result = SettingsPatchSchema.safeParse({
      logo_url: 'https://example.com/' + 'a'.repeat(500),
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toContain('500');
  });

  // ── default_template validation ─────────────────────────────────

  it('rejects unknown template slug', () => {
    const result = SettingsPatchSchema.safeParse({
      default_template: 'hacker_template',
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toContain('expected one of');
  });

  it('rejects SQL injection in template field', () => {
    const result = SettingsPatchSchema.safeParse({
      default_template: "'; DROP TABLE users; --",
    });
    expect(result.success).toBe(false);
  });

  // ── Strict mode (no extra fields) ──────────────────────────────

  it('rejects unknown fields (strict mode)', () => {
    const result = SettingsPatchSchema.safeParse({
      brand_color: '#FF5500',
      is_admin: true, // extra field — should be rejected
    });
    expect(result.success).toBe(false);
  });

  // ── Error format ────────────────────────────────────────────────

  it('returns human-readable error messages', () => {
    const result = SettingsPatchSchema.safeParse({
      brand_color: 'bad',
      logo_url: 'not-url',
      default_template: 'nonexistent',
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues).toHaveLength(3);
    // Each issue should have a readable message
    result.error!.issues.forEach((issue) => {
      expect(issue.message.length).toBeGreaterThan(5);
    });
  });
});
