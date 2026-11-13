import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

afterEach(cleanup);

function renderSearch(onChange = vi.fn()) {
  render(
    <SearchInput
      id="search"
      label="部署名"
      value=""
      onChange={onChange}
      placeholder="部署名で検索"
    />,
  );
  return screen.getByRole('searchbox', { name: '部署名' });
}

describe('SearchInput', () => {
  it('shouldHaveHeight44ClassWithoutHeight48Class', () => {
    const input = renderSearch();
    expect(input).toHaveClass('h-11');
    // inputClass の h-12 と衝突させない(同じ属性の重複は CSS の出力順で結果が変わる)
    expect(input).not.toHaveClass('h-12');
  });

  it('shouldHaveExactlyOneHeightClass', () => {
    const input = renderSearch();
    const heightClasses = input.className.split(/\s+/).filter((name) => /^h-/.test(name));
    expect(heightClasses).toEqual(['h-11']);
  });

  it('shouldReserveLeftPaddingForIconAndTextSmall', () => {
    const input = renderSearch();
    expect(input).toHaveClass('pl-10', 'text-sm/5');
  });

  it('shouldCallOnChangeWhenTyped', async () => {
    const onChange = vi.fn();
    const input = renderSearch(onChange);
    await userEvent.type(input, 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
