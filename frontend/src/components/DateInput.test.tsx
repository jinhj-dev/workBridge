import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { DateInput, formatDateInputValue } from './DateInput';

const t = messages.dateInput;

// jsdom には showPicker が無いため、テストごとに定義して後始末で消す
function mockShowPicker(): ReturnType<typeof vi.fn> {
  const showPicker = vi.fn();
  Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
    configurable: true,
    writable: true,
    value: showPicker,
  });
  return showPicker;
}

afterEach(() => {
  Reflect.deleteProperty(HTMLInputElement.prototype, 'showPicker');
  vi.restoreAllMocks();
});

describe('formatDateInputValue', () => {
  it('shouldFormatDateValueAsJapaneseDate', () => {
    expect(formatDateInputValue('2026-11-09', 'date')).toBe('2026年11月09日');
  });

  it('shouldFormatDatetimeValueWith24HourTime', () => {
    expect(formatDateInputValue('2026-11-09T18:05', 'datetime-local')).toBe(
      '2026年11月09日 18時05分',
    );
  });

  it('shouldReturnNullWhenValueIsEmpty', () => {
    expect(formatDateInputValue('', 'date')).toBeNull();
    expect(formatDateInputValue('', 'datetime-local')).toBeNull();
  });

  it('shouldReturnNullWhenValueIsInvalidShape', () => {
    expect(formatDateInputValue('2026/11/09', 'date')).toBeNull();
    expect(formatDateInputValue('abc', 'datetime-local')).toBeNull();
  });

  it('shouldReturnNullWhenDatetimeTypeHasDateOnlyValue', () => {
    expect(formatDateInputValue('2026-11-09', 'datetime-local')).toBeNull();
  });

  it('shouldFormatDateOnlyWhenDateTypeHasDatetimeValue', () => {
    expect(formatDateInputValue('2026-11-09T18:05', 'date')).toBe('2026年11月09日');
  });
});

describe('DateInput 表示', () => {
  it('shouldShowFormattedTextOverlayWhenValueIsSet', () => {
    const { container } = render(<DateInput id="d" value="2026-11-09" onChange={vi.fn()} />);
    const overlay = container.querySelector('span[aria-hidden="true"]');
    expect(overlay).toHaveTextContent('2026年11月09日');
  });

  it('shouldShowDatePlaceholderWhenDateValueIsEmpty', () => {
    const { container } = render(<DateInput id="d" value="" onChange={vi.fn()} />);
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveTextContent(t.datePlaceholder);
  });

  it('shouldShowDatetimePlaceholderWhenDatetimeValueIsEmpty', () => {
    const { container } = render(
      <DateInput id="d" type="datetime-local" value="" onChange={vi.fn()} />,
    );
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveTextContent(
      t.dateTimePlaceholder,
    );
  });

  it('shouldHideOverlayFromAccessibleTree', () => {
    const { container } = render(<DateInput id="d" value="2026-11-09" onChange={vi.fn()} />);
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('shouldRenderNativeDateInputWithType', () => {
    const { container } = render(<DateInput id="d" value="" onChange={vi.fn()} />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'date');
  });
});

describe('DateInput 操作', () => {
  it('shouldAssociateLabelWithNativeInput', () => {
    render(
      <>
        <label htmlFor="d">開始日</label>
        <DateInput id="d" value="" onChange={vi.fn()} />
      </>,
    );
    expect(screen.getByLabelText('開始日')).toHaveAttribute('type', 'date');
  });

  it('shouldPropagateChangeEventWhenValueChanged', () => {
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="d">開始日</label>
        <DateInput id="d" value="" onChange={onChange} />
      </>,
    );
    // jsdom の date 入力は userEvent の入力に対応しないため fireEvent で値を変える
    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-11-09' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shouldCallShowPickerOnClickWhenDefined', async () => {
    const showPicker = mockShowPicker();
    render(
      <>
        <label htmlFor="d">開始日</label>
        <DateInput id="d" value="" onChange={vi.fn()} />
      </>,
    );
    await userEvent.setup().click(screen.getByLabelText('開始日'));
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('shouldNotThrowOnClickWhenShowPickerUndefined', async () => {
    // showPicker 未定義(jsdom 既定)のままクリックしてもエラーにならないこと
    expect(HTMLInputElement.prototype).not.toHaveProperty('showPicker');
    render(
      <>
        <label htmlFor="d">開始日</label>
        <DateInput id="d" value="" onChange={vi.fn()} />
      </>,
    );
    await expect(userEvent.setup().click(screen.getByLabelText('開始日'))).resolves.toBeUndefined();
  });

  it('shouldCallExternalOnClickAndStillOpenPicker', async () => {
    const showPicker = mockShowPicker();
    const onClick = vi.fn();
    render(
      <>
        <label htmlFor="d">開始日</label>
        <DateInput id="d" value="" onChange={vi.fn()} onClick={onClick} />
      </>,
    );
    await userEvent.setup().click(screen.getByLabelText('開始日'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('shouldDisableNativeInputAndDimOverlayWhenDisabled', () => {
    const { container } = render(<DateInput id="d" value="2026-11-09" disabled onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('2026-11-09')).toBeDisabled();
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveClass('text-general-80');
  });
});
