import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTelegram } from '../lib/telegram';

describe('useTelegram', () => {
  it('returns default context values when outside provider', () => {
    const { result } = renderHook(() => useTelegram());

    expect(result.current.webApp).toBeNull();
    expect(result.current.initData).toBe('');
    expect(result.current.isReady).toBe(false);
  });
});
