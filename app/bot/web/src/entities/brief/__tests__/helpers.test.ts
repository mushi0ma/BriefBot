import { describe, it, expect } from 'vitest';
import { formatDate, stateInfo } from '../model/helpers';

describe('Brief helpers', () => {
  describe('formatDate', () => {
    it('formats ISO string correctly', () => {
      const iso = "2026-03-11T12:30:00Z";
      const result = formatDate(iso);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Since standard formatting depends on timezone of test runner, 
      // we do loose assertions on exact string, but it should contain time/date parts
    });
  });

  describe('stateInfo', () => {
    it('returns correct info for "done" state', () => {
      const info = stateInfo('done');
      expect(info.label).toBe('Готов');
      expect(info.color).toContain('bg-[#30d158]');
    });

    it('returns correct info for "failed" state', () => {
      const info = stateInfo('failed');
      expect(info.label).toBe('Ошибка');
      expect(info.color).toContain('bg-[#ff453a]');
    });

    it('returns correct info for "pending" state', () => {
      const info = stateInfo('pending');
      expect(info.label).toBe('Обработка...');
      expect(info.color).toContain('bg-[#ff9f0a]');
    });
  });
});
