import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { UserSummary } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { ApproverSelect } from './ApproverSelect';

const t = messages.leaves.approverSelect;

const SATO: UserSummary = { id: 'u-1', name: '佐藤花子', empId: '10001', departmentName: '営業部' };
const SUZUKI: UserSummary = { id: 'u-2', name: '鈴木一郎', empId: '10002', departmentName: null };
const CANDIDATES = [SATO, SUZUKI];

function Harness(props: {
  candidates?: UserSummary[];
  status?: 'loading' | 'error' | 'success';
  error?: string | null;
  onRetry?: () => void;
  onChangeSpy?: (value: UserSummary | null) => void;
}) {
  const [value, setValue] = useState<UserSummary | null>(null);
  return (
    <ApproverSelect
      id="approver"
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChangeSpy?.(next);
      }}
      error={props.error}
      candidates={props.candidates ?? CANDIDATES}
      status={props.status ?? 'success'}
      onRetry={props.onRetry ?? vi.fn()}
    />
  );
}

describe('ApproverSelect', () => {
  it('shouldFilterByNameAndEmpId', async () => {
    const ui = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox');
    await ui.click(input);
    expect(screen.getAllByRole('option')).toHaveLength(2);

    await ui.type(input, '鈴木');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('鈴木一郎 (10002)');

    await ui.clear(input);
    await ui.type(input, '10001');
    expect(screen.getByRole('option')).toHaveTextContent('佐藤花子 (10001) / 営業部');
  });

  it('shouldShowNoMatchMessageWhenNothingMatches', async () => {
    const ui = userEvent.setup();
    render(<Harness />);
    await ui.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(t.noMatch)).toBeInTheDocument();
  });

  it('shouldSelectWithKeyboard', async () => {
    const ui = userEvent.setup();
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const input = screen.getByRole('combobox');
    await ui.click(input);
    await ui.keyboard('{ArrowDown}{Enter}');

    expect(spy).toHaveBeenLastCalledWith(SUZUKI);
    expect(input).toHaveValue('鈴木一郎 (10002)');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('shouldCloseAndRestoreSelectionOnEscape', async () => {
    const ui = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox');
    await ui.click(screen.getByRole('combobox'));
    await ui.click(screen.getByRole('option', { name: /佐藤/ }));
    await ui.type(input, 'x');
    await ui.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('shouldClearSelectionWhenTextEdited', async () => {
    const ui = userEvent.setup();
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const input = screen.getByRole('combobox');
    await ui.click(input);
    await ui.click(screen.getByRole('option', { name: /佐藤/ }));
    await ui.type(input, 'a');
    expect(spy).toHaveBeenLastCalledWith(null);
  });

  it('shouldShowEmptyMessageWhenNoCandidates', () => {
    render(<Harness candidates={[]} />);
    expect(screen.getByText(t.empty)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shouldShowErrorWithRetryWhenLoadFailed', async () => {
    const ui = userEvent.setup();
    const onRetry = vi.fn();
    render(<Harness status="error" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(t.loadError);
    await ui.click(screen.getByRole('button', { name: messages.common.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shouldLinkFieldErrorToInput', () => {
    render(<Harness error="承認者を選択してください。" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('承認者を選択してください。');
  });
});
