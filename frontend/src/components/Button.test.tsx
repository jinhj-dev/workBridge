import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, buttonClass } from './Button';

afterEach(cleanup);

const ICON = <svg data-testid="icon" viewBox="0 0 24 24" />;

describe('Button 色 variant', () => {
  it('shouldApplyPrimaryTokensWhenVariantPrimary', () => {
    render(<Button variant="primary">送信</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-100', 'text-white', 'rounded-btn');
  });

  it('shouldApplyDangerTokensWhenVariantDanger', () => {
    render(<Button variant="danger">削除</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-100', 'text-white');
    expect(button).toHaveClass('disabled:bg-danger-100/50');
  });

  it('shouldApplyOutlineTokensWhenVariantDangerOutline', () => {
    render(<Button variant="dangerOutline">削除</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-danger-100', 'text-danger-100');
  });

  it('shouldApplyPrimaryOutlineTokensWhenVariantPrimaryOutline', () => {
    render(<Button variant="primaryOutline">詳細</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-primary-100', 'text-primary-100');
  });

  it('shouldApplySecondaryTokensWhenVariantSecondary', () => {
    render(<Button variant="secondary">キャンセル</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-general-50', 'bg-white', 'text-general-100');
    expect(button).toHaveClass('disabled:text-general-60');
  });

  it('shouldApplyGhostTokensWhenVariantGhost', () => {
    render(<Button variant="ghost">メニュー</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-general-80', 'hover:bg-general-30');
    expect(button).not.toHaveClass('border-general-50');
  });

  it('shouldApplyLinkTokensWithoutBorderOrBackgroundWhenVariantText', () => {
    render(<Button variant="text">もっと見る</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-primary-100', 'hover:underline');
    expect(button).not.toHaveClass('border');
    expect(button).not.toHaveClass('bg-white');
    expect(button).not.toHaveClass('bg-primary-100');
  });

  it('shouldUseSecondaryAndMdWhenNoVariantOrSize', () => {
    render(<Button>標準</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-general-50', 'h-btn-md');
  });
});

describe('Button サイズ', () => {
  it.each([
    ['sm', 'h-btn-sm'],
    ['md', 'h-btn-md'],
    ['lg', 'h-btn-lg'],
  ] as const)('shouldApplyHeightWhenSize%s', (size, heightClass) => {
    render(<Button size={size}>文字</Button>);
    expect(screen.getByRole('button')).toHaveClass(heightClass);
  });

  it('shouldApplyNoWrapOnlyWhenSizeSm', () => {
    const { unmount } = render(<Button size="sm">文字</Button>);
    expect(screen.getByRole('button')).toHaveClass('whitespace-nowrap');
    unmount();
    render(<Button size="md">文字</Button>);
    expect(screen.getByRole('button')).not.toHaveClass('whitespace-nowrap');
  });

  it.each([
    ['sm', 'size-btn-sm'],
    ['md', 'size-btn-md'],
    ['lg', 'size-btn-lg'],
  ] as const)('shouldApplySquareSizeWhenIconOnlySize%s', (size, squareClass) => {
    render(<Button iconOnly size={size} icon={ICON} aria-label="閉じる" />);
    const button = screen.getByRole('button', { name: '閉じる' });
    expect(button).toHaveClass(squareClass);
    // アイコン専用は左右 padding を持たないため、どのサイズの px クラスも付かない
    for (const paddingClass of ['px-btn-x-sm', 'px-btn-x-md', 'px-btn-x-lg']) {
      expect(button).not.toHaveClass(paddingClass);
    }
  });
});

describe('Button 種類・属性', () => {
  it('shouldDefaultToTypeButtonWhenTypeOmitted', () => {
    render(<Button>送信しない</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('shouldSubmitFormOutsideWhenTypeSubmitWithFormAttribute', async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <>
        <form id="search-form" onSubmit={onSubmit}>
          <input aria-label="検索語" />
        </form>
        <Button type="submit" form="search-form">
          検索
        </Button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shouldCallOnClickWhenClicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>実行</Button>);
    await userEvent.click(screen.getByRole('button', { name: '実行' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shouldIgnoreClickWhenDisabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        実行
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: '実行' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shouldPassAutoFocusAndDataAttributeWhenGiven', () => {
    render(
      <Button autoFocus data-autofocus="">
        確定
      </Button>,
    );
    const button = screen.getByRole('button', { name: '確定' });
    expect(button).toHaveAttribute('data-autofocus');
    expect(button).toHaveFocus();
  });

  it('shouldForwardRefToButtonElement', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>参照</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('参照');
  });

  it('shouldPassAriaPressedWhenGiven', () => {
    render(<Button aria-pressed={true}>切替</Button>);
    expect(screen.getByRole('button', { name: '切替' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shouldRenderSingleButtonElementAsOnlyChild', () => {
    const { container } = render(<Button>一つ</Button>);
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });
});

describe('Button loading', () => {
  it('shouldDisableAndShowSpinnerWhenLoading', () => {
    const { container } = render(<Button loading>保存</Button>);
    const button = screen.getByRole('button', { name: '保存' });
    expect(button).toBeDisabled();
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('shouldKeepLabelWhenLoading', () => {
    render(<Button loading>保存</Button>);
    expect(screen.getByRole('button', { name: '保存' })).toHaveTextContent('保存');
  });

  it('shouldReplaceIconWithSpinnerWhenLoadingWithIcon', () => {
    const { container } = render(
      <Button loading icon={ICON}>
        保存
      </Button>,
    );
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });
});

describe('Button アイコン', () => {
  it('shouldWrapIconInAriaHiddenSlotWhenIconGiven', () => {
    render(<Button icon={ICON}>検索</Button>);
    const icon = screen.getByTestId('icon');
    expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument();
  });

  it('shouldPlaceIconAfterLabelWhenIconPositionEnd', () => {
    render(
      <Button icon={ICON} iconPosition="end">
        次へ
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button.lastElementChild?.querySelector('svg')).toBe(screen.getByTestId('icon'));
  });

  it('shouldFindIconOnlyButtonByAriaLabelWhenIconOnly', () => {
    render(<Button iconOnly icon={ICON} aria-label="前月" />);
    const button = screen.getByRole('button', { name: '前月' });
    expect(button).toBeInTheDocument();
    expect(button.textContent).toBe('');
  });

  it('shouldUseSizeFourSlotForSmIconWhenSizeSm', () => {
    render(
      <Button size="sm" icon={ICON}>
        件
      </Button>,
    );
    expect(screen.getByTestId('icon').parentElement).toHaveClass('size-4');
  });
});

describe('Button text variant クラス', () => {
  it('shouldNotHaveInlineFlexOrNoWrapWhenTextWithoutIcon', () => {
    render(<Button variant="text">リンク</Button>);
    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('inline-flex');
    expect(button).not.toHaveClass('whitespace-nowrap');
  });

  it('shouldHaveInlineFlexWhenTextWithIcon', () => {
    render(
      <Button variant="text" icon={ICON}>
        リンク
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('inline-flex');
  });

  it('shouldNotHaveSelectNoneInAnyVariant', () => {
    const variants = [
      'primary',
      'secondary',
      'primaryOutline',
      'danger',
      'dangerOutline',
      'ghost',
      'text',
    ] as const;
    for (const variant of variants) {
      expect(buttonClass({ variant })).not.toContain('select-none');
    }
  });
});

describe('buttonClass', () => {
  it('shouldReturnTextClassWhenVariantText', () => {
    const className = buttonClass({ variant: 'text' });
    expect(className).toContain('text-primary-100');
    expect(className).not.toContain('inline-flex');
    expect(className).not.toContain('h-');
  });

  it('shouldReturnIconOnlySquareClassWhenGhostIconOnly', () => {
    const className = buttonClass({ variant: 'ghost', iconOnly: true });
    expect(className).toContain('size-btn-md');
    expect(className).toContain('text-general-80');
    expect(className).not.toContain('px-');
  });

  it('shouldIncludeInlineFlexWhenTextWithIcon', () => {
    expect(buttonClass({ variant: 'text', withIcon: true })).toContain('inline-flex');
  });
});

describe('Button 型 (@ts-expect-error で不正な組み合わせを検証)', () => {
  it('shouldRejectIconOnlyWithoutAriaLabel', () => {
    // @ts-expect-error iconOnly では aria-label が必須
    const element = <Button iconOnly icon={ICON} />;
    expect(element).toBeDefined();
  });

  it('shouldRejectIconOnlyWithChildren', () => {
    const element = (
      // @ts-expect-error iconOnly では children を渡せない
      <Button iconOnly icon={ICON} aria-label="前月">
        文字
      </Button>
    );
    expect(element).toBeDefined();
  });
});
