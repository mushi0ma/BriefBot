import { describe, it, expect } from 'vitest';
import { UserSettingsSchema } from '../model/schema';

describe('UserSettingsSchema', () => {
  it('successfully parses valid user settings', () => {
    const validSettings = {
      brand_color: "#ff0000",
      logo_url: "https://example.com/img.png",
      default_template: "marketing"
    };
    
    const result = UserSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('successfully parses null values', () => {
    const nullSettings = {
      brand_color: null,
      logo_url: null,
      default_template: null
    };
    
    const result = UserSettingsSchema.safeParse(nullSettings);
    expect(result.success).toBe(true);
  });

  it('fails if logo_url is invalid', () => {
    const invalidSettings = {
      brand_color: null,
      logo_url: "not-a-valid-url",
      default_template: null
    };
    
    const result = UserSettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
  });
});
