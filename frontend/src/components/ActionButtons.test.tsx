import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { DetailButton, EditButton } from './ActionButtons';

// 詳細・編集ボタンの共通プリセット(design-frontend §2, test-plan §1 U1~U10)。
// 外形は Button の variant・size クラスで確認する(jsdom は Tailwind を読まないためクラス名で判定)

afterEach(cleanup);

// アイコンは aria-hidden の span の中に 1 つだけ入る
function iconSvgs(button: HTMLElement): NodeListOf<SVGSVGElement> {
  return button.querySelectorAll<SVGSVGElement>('span[aria-hidden="true"] > svg');
}

describe('DetailButton(詳細)', () => {
  it('shouldRenderSecondarySmDetailButtonWhenDefault', () => {
    render(<DetailButton aria-label="X" />);
    const button = screen.getByRole('button', { name: 'X' });
    expect(button).toHaveTextContent(messages.common.detail);
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('border-general-50', 'text-general-100', 'h-btn-sm');
    expect(button).toHaveClass('whitespace-nowrap');
  });

  it('shouldRenderOneEyeIconHiddenFromAccessibilityWhenDetailButton', () => {
    render(<DetailButton aria-label="X" />);
    const button = screen.getByRole('button', { name: 'X' });
    expect(iconSvgs(button)).toHaveLength(1);
    expect(button.querySelector('span[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('shouldUseMdHeightWithoutNowrapWhenSizeMd', () => {
    render(<DetailButton aria-label="X" size="md" />);
    const button = screen.getByRole('button', { name: 'X' });
    expect(button).toHaveClass('h-btn-md');
    expect(button).not.toHaveClass('whitespace-nowrap');
  });

  it('shouldCallOnClickOnceWhenClickEnterOrSpace', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<DetailButton aria-label="X" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'X' });

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);

    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('shouldNotCallOnClickAndBeDisabledWhenDisabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<DetailButton aria-label="X" disabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'X' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shouldKeepExtraClassNameWithBaseClassesWhenClassNameGiven', () => {
    render(<DetailButton aria-label="X" className="w-full" />);
    const button = screen.getByRole('button', { name: 'X' });
    expect(button).toHaveClass('w-full', 'h-btn-sm', 'border-general-50');
  });

  it('shouldNotSubmitParentFormWhenClicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <DetailButton aria-label="X" />
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'X' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('EditButton(編集)', () => {
  it('shouldRenderPrimaryOutlineSmEditButtonWhenDefault', () => {
    render(<EditButton aria-label="Y" />);
    const button = screen.getByRole('button', { name: 'Y' });
    expect(button).toHaveTextContent(messages.common.edit);
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('border-primary-100', 'text-primary-100', 'h-btn-sm');
    expect(button).toHaveClass('disabled:border-general-50');
  });

  it('shouldRenderOnePencilIconHiddenFromAccessibilityWhenEditButton', () => {
    render(<EditButton aria-label="Y" />);
    expect(iconSvgs(screen.getByRole('button', { name: 'Y' }))).toHaveLength(1);
  });

  it('shouldReplaceTextWithChildrenWhenChildrenGiven', () => {
    render(<EditButton size="md">この部署を編集</EditButton>);
    const button = screen.getByRole('button', { name: 'この部署を編集' });
    expect(button).toHaveClass('h-btn-md', 'border-primary-100');
    expect(iconSvgs(button)).toHaveLength(1);
  });

  it('shouldRenderIconOnlyWithoutTextWhenIconOnly', () => {
    render(<EditButton iconOnly aria-label="Z" />);
    const button = screen.getByRole('button', { name: 'Z' });
    expect(button).not.toHaveTextContent(messages.common.edit);
    expect(button).toHaveTextContent('');
    expect(button).toHaveClass('size-btn-sm', 'border-primary-100');
    expect(button).not.toHaveClass('h-btn-sm');
  });

  it('shouldCallOnClickOnceWhenClickEnterOrSpace', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EditButton aria-label="Y" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Y' });

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);

    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('shouldNotCallOnClickAndBeDisabledWhenDisabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EditButton aria-label="Y" disabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Y' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shouldKeepExtraClassNameWithBaseClassesWhenClassNameGiven', () => {
    render(<EditButton aria-label="Y" className="w-full" />);
    const button = screen.getByRole('button', { name: 'Y' });
    expect(button).toHaveClass('w-full', 'h-btn-sm', 'border-primary-100');
  });

  it('shouldNotSubmitParentFormWhenClicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <EditButton aria-label="Y" />
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Y' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
