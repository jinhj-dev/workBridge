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

  it('shouldSetAriaRequiredOnlyWhenRequired', () => {
    const { rerender } = render(
      <ApproverSelect
        id="approver"
        value={null}
        onChange={vi.fn()}
        candidates={CANDIDATES}
        status="success"
        onRetry={vi.fn()}
        required
      />,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');

    rerender(
      <ApproverSelect
        id="approver"
        value={null}
        onChange={vi.fn()}
        candidates={CANDIDATES}
        status="success"
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-required');
  });
});

// onSearch 指定時(部署責任者)は入力で外れた選択を、確定せず離れたとき元に戻す。未指定(휴가 승인자)は従来どおり
function SearchHarness(props: {
  onChangeSpy: (value: UserSummary | null) => void;
  withSearch?: boolean;
}) {
  const [value, setValue] = useState<UserSummary | null>(null);
  return (
    <>
      <ApproverSelect
        id="approver"
        value={value}
        onChange={(next) => {
          setValue(next);
          props.onChangeSpy(next);
        }}
        candidates={CANDIDATES}
        status="success"
        onRetry={vi.fn()}
        onSearch={props.withSearch === false ? undefined : vi.fn()}
      />
      <button type="button">外側</button>
    </>
  );
}

describe('ApproverSelect(onSearch 指定時の blur 復元)', () => {
  async function selectSato(ui: ReturnType<typeof userEvent.setup>) {
    await ui.click(screen.getByRole('combobox'));
    await ui.click(screen.getByRole('option', { name: /佐藤/ }));
  }

  it('shouldRestorePreviousManagerWhenTypedTextLeftWithoutSelection', async () => {
    const ui = userEvent.setup();
    const spy = vi.fn();
    render(<SearchHarness onChangeSpy={spy} />);
    await selectSato(ui);
    await ui.type(screen.getByRole('combobox'), 'x');
    expect(spy).toHaveBeenLastCalledWith(null);
    // 候補を選ばず外側をクリック(blur)
    await ui.click(screen.getByRole('button', { name: '外側' }));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'u-1' }));
    expect(screen.getByRole('combobox')).toHaveValue('佐藤花子 (10001) / 営業部');
  });

  it('shouldKeepClearedSelectionWhenInputEmptiedBeforeLeaving', async () => {
    const ui = userEvent.setup();
    const spy = vi.fn();
    render(<SearchHarness onChangeSpy={spy} />);
    await selectSato(ui);
    await ui.clear(screen.getByRole('combobox'));
    await ui.click(screen.getByRole('button', { name: '外側' }));
    // 入力欄を空にしたのは意図的な解除なので復元しない
    expect(spy).toHaveBeenLastCalledWith(null);
  });

  it('shouldNotRestoreWhenOnSearchIsNotGiven', async () => {
    const ui = userEvent.setup();
    const spy = vi.fn();
    render(<SearchHarness onChangeSpy={spy} withSearch={false} />);
    await selectSato(ui);
    await ui.type(screen.getByRole('combobox'), 'x');
    await ui.click(screen.getByRole('button', { name: '外側' }));
    // 承認者向け(onSearch なし)は従来どおり、離れると選択は外れたまま
    expect(spy).toHaveBeenLastCalledWith(null);
  });
});
