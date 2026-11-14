import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

// description・icon・action は任意。省略時の見出し構造が従来どおりであることを確認する
describe('PageHeader', () => {
  it('shouldRenderTitleAsHeadingWithoutDescriptionByDefault', () => {
    const { container } = render(<PageHeader title="社員管理" />);
    expect(screen.getByRole('heading', { level: 1, name: '社員管理' })).toBeInTheDocument();
    expect(container.querySelector('p')).toBeNull();
  });

  it('shouldShowDescriptionAndActionWhenGiven', () => {
    render(
      <PageHeader
        title="社員管理"
        description="社員情報の確認・追加・編集・削除を行います。"
        action={<button type="button">社員追加</button>}
      />,
    );
    expect(screen.getByText('社員情報の確認・追加・編集・削除を行います。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '社員追加' })).toBeInTheDocument();
  });

  it('shouldHideDecorativeIconFromAssistiveTech', () => {
    render(<PageHeader title="休暇管理" icon={<svg data-testid="page-icon" />} />);
    expect(screen.getByTestId('page-icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});
