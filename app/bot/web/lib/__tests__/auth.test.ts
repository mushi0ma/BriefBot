import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { validateInitData } from '../auth';

// ── Helpers: create real Telegram-style initData ─────────────────────

const BOT_TOKEN = '7777777777:AAAAAAAAAAAAAAAAAAAAAA-BBBBBBBBBBB';

function buildInitData(
  overrides: {
    user?: object;
    auth_date?: number;
    botToken?: string;
    tamperHash?: string;
    omitUser?: boolean;
    omitHash?: boolean;
  } = {}
): string {
  const token = overrides.botToken ?? BOT_TOKEN;
  const authDate = overrides.auth_date ?? Math.floor(Date.now() / 1000);
  const user = overrides.user ?? {
    id: 123456789,
    first_name: 'Test',
    username: 'testuser',
  };

  const params = new URLSearchParams();
  if (!overrides.omitUser) {
    params.set('user', JSON.stringify(user));
  }
  params.set('auth_date', String(authDate));

  // Build data-check-string (sorted, without hash)
  const entries = Array.from(params.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  // HMAC-SHA256
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(token)
    .digest();
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', overrides.tamperHash ?? hash);
  if (overrides.omitHash) params.delete('hash');

  return params.toString();
}

// ── Tests ────────────────────────────────────────────────────────────

describe('validateInitData — Security Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set "now" to a fixed point so we control auth_date freshness
    vi.setSystemTime(new Date('2026-03-11T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Happy path ──────────────────────────────────────────────────

  it('accepts valid initData and returns the user', () => {
    const initData = buildInitData();
    const user = validateInitData(initData, BOT_TOKEN);

    expect(user).not.toBeNull();
    expect(user!.id).toBe(123456789);
    expect(user!.first_name).toBe('Test');
    expect(user!.username).toBe('testuser');
  });

  // ── Rejection cases ─────────────────────────────────────────────

  it('rejects empty initData', () => {
    expect(validateInitData('', BOT_TOKEN)).toBeNull();
  });

  it('rejects empty botToken', () => {
    const initData = buildInitData();
    expect(validateInitData(initData, '')).toBeNull();
  });

  it('rejects initData without hash parameter', () => {
    const initData = buildInitData({ omitHash: true });
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects initData without user parameter', () => {
    const initData = buildInitData({ omitUser: true });
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
  });

  // ── Tampered data ───────────────────────────────────────────────

  it('rejects tampered hash (MITM attack)', () => {
    const initData = buildInitData({
      tamperHash: 'deadbeef'.repeat(8), // fake 64-char hex
    });
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects initData signed with wrong bot token', () => {
    const initData = buildInitData({ botToken: '999999:WRONG_TOKEN' });
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
  });

  // ── Time-based attacks ──────────────────────────────────────────

  it('rejects expired auth_date (> 10 minutes old)', () => {
    const elevenMinutesAgo = Math.floor(Date.now() / 1000) - 660;
    const initData = buildInitData({ auth_date: elevenMinutesAgo });
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('accepts auth_date within 10 minute window', () => {
    const nineMinutesAgo = Math.floor(Date.now() / 1000) - 540;
    const initData = buildInitData({ auth_date: nineMinutesAgo });
    expect(validateInitData(initData, BOT_TOKEN)).not.toBeNull();
  });

  it('rejects auth_date in the far future (clock skew attack)', () => {
    const oneHourAhead = Math.floor(Date.now() / 1000) + 3600;
    const initData = buildInitData({ auth_date: oneHourAhead });
    // CURRENT CODE DOES NOT CHECK THIS — this test should FAIL (RED)
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
  });

  // ── Timing-safe comparison ──────────────────────────────────────

  it('uses crypto.timingSafeEqual for hash comparison (not ===)', () => {
    const spy = vi.spyOn(crypto, 'timingSafeEqual');

    const initData = buildInitData();
    validateInitData(initData, BOT_TOKEN);

    // CURRENT CODE DOES NOT USE timingSafeEqual — this test should FAIL (RED)
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Malicious payloads ──────────────────────────────────────────

  it('rejects initData with malformed JSON in user field', () => {
    const params = new URLSearchParams();
    params.set('user', '{not valid json!!!');
    params.set('auth_date', String(Math.floor(Date.now() / 1000)));
    params.set('hash', 'a'.repeat(64));
    expect(validateInitData(params.toString(), BOT_TOKEN)).toBeNull();
  });
});
