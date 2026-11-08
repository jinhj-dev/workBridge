import { describe, expect, it } from 'vitest';
import { safeRedirect } from './redirect';

describe('safeRedirect(ログイン後の戻り先)', () => {
  it('shouldReturnNullWhenRedirectIsEmpty', () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect('')).toBeNull();
  });

  it.each(['/dashboard', '/leaves?status=PENDING#a', '/leaves/abc?page=2'])(
    'shouldReturnInternalPathAsIs(%s)',
    (redirect) => {
      expect(safeRedirect(redirect)).toBe(redirect);
    },
  );

  it.each([
    'https://evil.example',
    'http://evil.example/dashboard',
    'javascript:alert(1)',
    'dashboard',
    '//evil.example',
    '/\\evil.example',
    '\\/evil',
    '\\\\evil.example',
  ])('shouldReturnNullWhenRedirectPointsOutside(%j)', (redirect) => {
    expect(safeRedirect(redirect)).toBeNull();
  });

  it.each([
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '/\u0000/evil.example',
    '/\u007f/evil.example',
    '/dash\tboard',
  ])('shouldReturnNullWhenRedirectContainsControlCharacter(%j)', (redirect) => {
    expect(safeRedirect(redirect)).toBeNull();
  });

  it.each(['/login', '/login?x=1', '/login#a', '/login/', '/login/sub', '/dashboard/../login'])(
    'shouldReturnNullWhenRedirectIsLoginPage(%s)',
    (redirect) => {
      expect(safeRedirect(redirect)).toBeNull();
    },
  );

  it('shouldNotTreatLoginPrefixedPathAsLoginPage', () => {
    expect(safeRedirect('/loginhistory')).toBe('/loginhistory');
  });

  it('shouldReturnNormalizedPathWhenRedirectContainsDotSegments', () => {
    expect(safeRedirect('/leaves/../dashboard?x=1')).toBe('/dashboard?x=1');
  });
});
