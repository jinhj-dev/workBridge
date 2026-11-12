import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave, LeaveType, UserSummary } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { LeaveApplyModal } from './LeaveApplyModal';

const t = messages.leaves.apply;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'authenticated', user: auth.user, login: vi.fn(), logout: vi.fn() }),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const EMPLOYEE: AuthUser = {
  id: 'u-me',
  name: '申請者',
  empId: '10001',
  role: 'EMPLOYEE',
  departmentName: '営業部',
  approvalRequired: true,
  mustChangePassword: false,
};
const AUTO_APPROVE_USER: AuthUser = { ...EMPLOYEE, approvalRequired: false };

const APPROVER: UserSummary = {
  id: 'u-approver',
  name: '佐藤花子',
  empId: '10002',
  departmentName: '開発部',
};

function createdLeave(overrides: Partial<Leave> = {}): Leave {
  return {
    id: 'leave-1',
    user: { id: 'u-me', name: '申請者', empId: '10001', departmentName: '営業部' },
    approver: APPROVER,
    leaveType: 'ANNUAL',
    startDate: '2026-11-16',
    endDate: '2026-11-18',
    days: 3,
    reason: '私用',
    status: 'PENDING',
    autoApproved: false,
    processedBy: null,
    processedAt: null,
    rejectReason: null,
    createdAt: '2026-11-10T10:00:00+09:00',
    ...overrides,
  };
}

const onApplied = vi.fn();
const onClose = vi.fn();
const onBalanceStale = vi.fn();

function mockApi(post: () => unknown) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/leaves/approvers') return [APPROVER];
    if (path === '/leaves') return post();
    throw new Error(`想定外の API 呼び出し: ${path}`);
  });
}

function postCalls(): unknown[][] {
  return apiFetch.mock.calls.filter(([path]) => path === '/leaves');
}

function approverCalls(): number {
  return apiFetch.mock.calls.filter(([path]) => path === '/leaves/approvers').length;
}

function renderForm(user: AuthUser = EMPLOYEE, open = true) {
  auth.user = user;
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <LeaveApplyModal
        open={open}
        onClose={onClose}
        onApplied={onApplied}
        onBalanceStale={onBalanceStale}
      />
    </ToastProvider>,
  );
  return ui;
}

function leaveTypeSelect(): HTMLElement {
  return screen.getByRole('combobox', { name: t.leaveType });
}

async function chooseType(ui: ReturnType<typeof userEvent.setup>, type: LeaveType) {
  await ui.selectOptions(leaveTypeSelect(), type);
}

type Ui = ReturnType<typeof userEvent.setup>;

async function pickApprover(ui: Ui) {
  await ui.click(await screen.findByLabelText(t.approver));
  await ui.click(await screen.findByRole('option', { name: /佐藤花子/ }));
}

async function fillAnnual(ui: Ui, { withApprover = true }: { withApprover?: boolean } = {}) {
  await chooseType(ui, 'ANNUAL');
  await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
  await ui.type(screen.getByLabelText(t.endDate), '2026-11-18');
  await ui.type(screen.getByLabelText(t.reason), '  私用  ');
  if (withApprover) await pickApprover(ui);
}

function toast(): HTMLElement {
  return screen
    .getAllByRole('status')
    .find((el) => el.getAttribute('aria-live') === 'polite') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LeaveApplyModal(SCR-004 / SCR-002 休暇申請モーダル)', () => {
  it('shouldShowValidationMessagesWithoutCallingApi', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await screen.findByLabelText(t.approver);
    await ui.click(screen.getByRole('button', { name: t.submit }));

    expect(screen.getByText(t.validation.leaveType)).toBeInTheDocument();
    expect(screen.getByText(t.validation.period)).toBeInTheDocument();
    expect(screen.getByText(t.validation.reasonRequired)).toBeInTheDocument();
    expect(screen.getByText(t.validation.approver)).toBeInTheDocument();
    expect(leaveTypeSelect()).toHaveFocus();
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldRenderFiveLeaveTypeOptionsWithNoneSelected', () => {
    mockApi(() => createdLeave());
    renderForm();
    const options = within(leaveTypeSelect()).getAllByRole('option') as HTMLOptionElement[];
    expect(options[0]).toHaveTextContent(messages.common.selectPlaceholder);
    expect(leaveTypeSelect()).toHaveValue('');
    expect(options.slice(1).map((o) => o.value)).toEqual([
      'ANNUAL',
      'HALF_AM',
      'HALF_PM',
      'SPECIAL',
      'OTHER',
    ]);
  });

  it('shouldClearLeaveTypeErrorWhenTypeChosen', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await ui.click(screen.getByRole('button', { name: t.submit }));
    expect(screen.getByText(t.validation.leaveType)).toBeInTheDocument();
    await chooseType(ui, 'SPECIAL');
    expect(screen.queryByText(t.validation.leaveType)).not.toBeInTheDocument();
  });

  it('shouldCallOnCloseWhenCancelPressed', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await ui.click(screen.getByRole('button', { name: messages.common.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldCallOnCloseWhenCloseIconPressed', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await ui.click(screen.getByRole('button', { name: messages.common.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldNotFetchApproversWhileClosed', () => {
    mockApi(() => createdLeave());
    renderForm(EMPLOYEE, false);
    expect(approverCalls()).toBe(0);
  });

  it('shouldShowPreviewAndFixEndDateForHalfDay', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    expect(screen.getByText(messages.common.noValue)).toBeInTheDocument();

    await chooseType(ui, 'HALF_AM');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
    expect(screen.getByLabelText(t.endDate)).toBeDisabled();
    expect(screen.getByLabelText(t.endDate)).toHaveValue('2026-11-16');
    expect(screen.getByText('0.5日')).toBeInTheDocument();
  });

  it('shouldFollowStartDateAndEnableEndDateWhenSwitchedBackToAnnual', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await chooseType(ui, 'HALF_AM');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
    await ui.clear(screen.getByLabelText(t.startDate));
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-17');
    expect(screen.getByLabelText(t.endDate)).toHaveValue('2026-11-17');

    await chooseType(ui, 'ANNUAL');
    expect(screen.getByLabelText(t.endDate)).toBeEnabled();
    await ui.clear(screen.getByLabelText(t.endDate));
    await ui.type(screen.getByLabelText(t.endDate), '2026-11-18');
    expect(screen.getByText('2日')).toBeInTheDocument();
  });

  it('shouldRejectPeriodOnlyWeekend', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await chooseType(ui, 'ANNUAL');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-14');
    await ui.type(screen.getByLabelText(t.endDate), '2026-11-15');
    await ui.type(screen.getByLabelText(t.reason), '私用');
    await pickApprover(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));

    expect(screen.getByText(t.validation.noWorkingDays)).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldRejectEndDateBeforeStartDate', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-18');
    await ui.type(screen.getByLabelText(t.endDate), '2026-11-16');
    await ui.click(screen.getByRole('button', { name: t.submit }));
    expect(screen.getByText(t.validation.order)).toBeInTheDocument();
  });

  it('shouldCountReasonByCodePointAndRejectOver500', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await chooseType(ui, 'ANNUAL');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
    await ui.type(screen.getByLabelText(t.endDate), '2026-11-16');
    await ui.click(screen.getByLabelText(t.reason));
    await ui.paste('😀'.repeat(501));
    expect(screen.getByText('501/500')).toBeInTheDocument();
    await pickApprover(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));
    expect(screen.getByText(t.validation.reasonTooLong)).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldPostTrimmedReasonWithApproverAndNotify', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await fillAnnual(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    const [, init] = postCalls()[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      leaveType: 'ANNUAL',
      startDate: '2026-11-16',
      endDate: '2026-11-18',
      reason: '私用',
      approverId: APPROVER.id,
    });
    expect(toast()).toHaveTextContent(t.pendingSuccess);
  });

  it('shouldHideApproverAndShowAutoApproveNoticeWhenApprovalNotRequired', async () => {
    mockApi(() => createdLeave({ status: 'APPROVED', autoApproved: true, approver: null }));
    const ui = renderForm(AUTO_APPROVE_USER);
    expect(screen.queryByLabelText(t.approver)).not.toBeInTheDocument();
    expect(screen.getByText(t.autoApprove)).toBeInTheDocument();
    expect(approverCalls()).toBe(0);

    await fillAnnual(ui, { withApprover: false });
    await ui.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    const [, init] = postCalls()[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).not.toHaveProperty('approverId');
    expect(toast()).toHaveTextContent(t.approvedSuccess);
  });

  it('shouldNotSubmitTwiceWhileRequestIsPending', async () => {
    let resolve: (leave: Leave) => void = () => undefined;
    mockApi(() => new Promise<Leave>((r) => (resolve = r)));
    const ui = renderForm();
    await fillAnnual(ui);
    const button = screen.getByRole('button', { name: t.submit });
    await ui.click(button);
    await ui.click(button);
    expect(postCalls()).toHaveLength(1);
    expect(button).toBeDisabled();
    resolve(createdLeave());
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['INVALID_DATE_RANGE', '半休は開始日と終了日を同じ日にしてください。'],
    ['NO_WORKING_DAYS', '勤務日がありません。'],
  ])('shouldShowServerMessageUnderPeriodOn%s', async (code, message) => {
    mockApi(() => {
      throw new ApiError(400, code, message);
    });
    const ui = renderForm();
    await fillAnnual(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('shouldClearApproverAndReloadCandidatesOnInvalidApprover', async () => {
    mockApi(() => {
      throw new ApiError(400, 'INVALID_APPROVER', 'サーバーの文言');
    });
    const ui = renderForm();
    await fillAnnual(ui);
    const before = approverCalls();
    await ui.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(t.reselectApprover)).toBeInTheDocument();
    await waitFor(() => expect(approverCalls()).toBe(before + 1));
    expect(await screen.findByLabelText(t.approver)).toHaveValue('');
  });

  it('shouldShowToastOnConflict', async () => {
    mockApi(() => {
      throw new ApiError(409, 'LEAVE_CONFLICT', '該当期間にすでに申請された休暇があります。');
    });
    const ui = renderForm();
    await fillAnnual(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() =>
      expect(toast()).toHaveTextContent('該当期間にすでに申請された休暇があります。'),
    );
    expect(onBalanceStale).not.toHaveBeenCalled();
  });

  it('shouldShowToastAndRefreshSummaryOnInsufficientBalance', async () => {
    mockApi(() => {
      throw new ApiError(422, 'INSUFFICIENT_LEAVE_BALANCE', '残日数が不足しています。(残り 1 日)');
    });
    const ui = renderForm();
    await fillAnnual(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => expect(toast()).toHaveTextContent('(残り 1 日)'));
    expect(onBalanceStale).toHaveBeenCalledTimes(1);
  });
});

describe('LeaveApplyModal サーバーの入力エラー', () => {
  it('shouldMapValidationErrorDetailsToFields', async () => {
    mockApi(() => {
      throw new ApiError(400, 'VALIDATION_ERROR', '入力値が不正です', [
        { field: 'reason', message: 'サーバー: 理由が不正' },
      ]);
    });
    const ui = renderForm();
    await fillAnnual(ui);
    await ui.click(screen.getByRole('button', { name: t.submit }));
    expect(await screen.findByText('サーバー: 理由が不正')).toBeInTheDocument();
    expect(screen.getByLabelText(t.reason)).toHaveFocus();
  });
});

describe('LeaveApplyModal の表示(SCR-004 §3.2 表レイアウト・必須表示)', () => {
  it('shouldUseLeaveApplyTitleAsDialogName', () => {
    mockApi(() => createdLeave());
    renderForm();
    expect(screen.getByRole('dialog', { name: t.title })).toBeInTheDocument();
  });

  it('shouldMarkFiveRequiredRowsWithAriaRequiredWhenApprovalRequired', async () => {
    mockApi(() => createdLeave());
    renderForm();
    await screen.findByLabelText(t.approver);

    const required = document.querySelectorAll('[aria-required="true"]');
    expect(required).toHaveLength(5);
    for (const label of [t.leaveType, t.startDate, t.endDate, t.reason, t.approver]) {
      expect(screen.getByText(label).parentElement).toHaveTextContent('*');
    }
  });

  it('shouldNotMarkDaysRowAsRequired', async () => {
    mockApi(() => createdLeave());
    renderForm();
    await screen.findByLabelText(t.approver);
    expect(screen.getByText(t.days).parentElement).not.toHaveTextContent('*');
  });

  it('shouldShowAutoApproveNoticeWithoutRequiredMarkOrApproverWhenApprovalNotRequired', () => {
    mockApi(() => createdLeave({ status: 'APPROVED', autoApproved: true, approver: null }));
    renderForm(AUTO_APPROVE_USER);
    expect(screen.getByText(t.approver).parentElement).not.toHaveTextContent('*');
    expect(screen.getByText(t.autoApprove)).toBeInTheDocument();
    expect(document.querySelectorAll('[aria-required="true"]')).toHaveLength(4);
  });

  it('shouldKeepAriaRequiredOnDisabledEndDateForHalfDay', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await chooseType(ui, 'HALF_AM');
    const endDate = screen.getByLabelText(t.endDate);
    expect(endDate).toBeDisabled();
    expect(endDate).toHaveAttribute('aria-required', 'true');
  });

  it('shouldShowThreeDaysForAnnualLeaveSpanningWeekdays', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await chooseType(ui, 'ANNUAL');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
    await ui.type(screen.getByLabelText(t.endDate), '2026-11-18');
    expect(screen.getByText('3日')).toBeInTheDocument();
  });

  it('shouldNotShowStatusLabelInsideModal', () => {
    mockApi(() => createdLeave());
    renderForm();
    expect(screen.queryByText(messages.leaves.history.statusColumn)).not.toBeInTheDocument();
  });
});
