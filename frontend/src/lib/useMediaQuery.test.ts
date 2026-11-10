import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

const QUERY = '(min-width: 768px)';

interface FakeMql {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  fireChange: (matches: boolean) => void;
}

let mql: FakeMql;

// matchMedia を差し替え、change リスナーを外から発火できるようにする
function stubMatchMedia(initial: boolean): FakeMql {
  const listeners = new Set<() => void>();
  const fake: FakeMql = {
    matches: initial,
    media: QUERY,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => listeners.delete(cb)),
    fireChange: (matches: boolean) => {
      fake.matches = matches;
      listeners.forEach((cb) => cb());
    },
  };
  vi.stubGlobal('matchMedia', vi.fn(() => fake));
  return fake;
}

beforeEach(() => {
  mql = stubMatchMedia(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('shouldReturnTrueWhenQueryMatches', () => {
    mql = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery(QUERY));
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(QUERY);
  });

  it('shouldReturnFalseWhenQueryDoesNotMatch', () => {
    mql = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(QUERY));
    expect(result.current).toBe(false);
  });

  it('shouldRerenderWithNewValueWhenChangeEventFires', () => {
    const { result } = renderHook(() => useMediaQuery(QUERY));
    expect(result.current).toBe(true);
    act(() => mql.fireChange(false));
    expect(result.current).toBe(false);
    act(() => mql.fireChange(true));
    expect(result.current).toBe(true);
  });

  it('shouldRemoveChangeListenerWhenUnmounted', () => {
    const { unmount } = renderHook(() => useMediaQuery(QUERY));
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    const added = mql.addEventListener.mock.calls[0][1];
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', added);
  });

  it('shouldReturnNullWhenServerRendering', () => {
    function Probe() {
      const matches = useMediaQuery(QUERY);
      return createElement('span', null, String(matches));
    }
    // サーバー描画では window.matchMedia を呼ばず、判定前(null)として扱う
    vi.stubGlobal('matchMedia', undefined);
    expect(renderToString(createElement(Probe))).toBe('<span>null</span>');
  });
});
