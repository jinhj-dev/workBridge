import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

// 新しい任意 prop(icon・iconCircle・unit・selected)を付けなくても従来の表示が変わらないことを確認する
describe('StatCard', () => {
  it('shouldShowLabelAndValueWithUnitByDefault', () => {
    render(<StatCard label="社員数" value="120" unit="名" />);
    expect(screen.getByText('社員数')).toBeInTheDocument();
    expect(screen.getByText('名')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shouldRenderIconInsideCircleWhenIconCircleIsSet', () => {
    render(
      <StatCard
        label="今月の入社"
        value="3"
        unit="名"
        icon={<svg data-testid="stat-icon" />}
        iconCircle
        tone="danger"
      />,
    );
    const icon = screen.getByTestId('stat-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('rounded-full');
  });

  it('shouldMarkLinkCardAsCurrentWhenSelected', () => {
    // 現在の呼び出し元はアイコン付きのリンクカードで選択状態を使う
    render(
      <StatCard
        label="無効"
        value="2"
        icon={<svg data-testid="stat-icon" />}
        href="/admin/users?status=INACTIVE"
        selected
      />,
    );
    const link = screen.getByRole('link', { name: /無効/ });
    expect(link).toHaveAttribute('href', '/admin/users?status=INACTIVE');
    expect(link).toHaveAttribute('aria-current', 'true');
  });
});
