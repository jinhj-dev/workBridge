import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave, UserSummary } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { LeaveApplyForm } from './LeaveApplyForm';

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

function renderForm(user: AuthUser = EMPLOYEE) {
  auth.user = user;
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <LeaveApplyForm onApplied={onApplied} onBalanceStale={onBalanceStale} />
    </ToastProvider>,
  );
  return ui;
}

type Ui = ReturnType<typeof userEvent.setup>;

async function pickApprover(ui: Ui) {
  await ui.click(await screen.findByLabelText(t.approver));
  await ui.click(await screen.findByRole('option', { name: /佐藤花子/ }));
}

async function fillAnnual(ui: Ui, { withApprover = true }: { withApprover?: boolean } = {}) {
  await ui.selectOptions(screen.getByLabelText(t.leaveType), 'ANNUAL');
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

describe('LeaveApplyForm(SCR-004 休暇申請)', () => {
  it('shouldShowValidationMessagesWithoutCallingApi', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await screen.findByLabelText(t.approver);
    await ui.click(screen.getByRole('button', { name: t.submit }));

    expect(screen.getByText(t.validation.leaveType)).toBeInTheDocument();
    expect(screen.getByText(t.validation.period)).toBeInTheDocument();
    expect(screen.getByText(t.validation.reasonRequired)).toBeInTheDocument();
    expect(screen.getByText(t.validation.approver)).toBeInTheDocument();
    expect(screen.getByLabelText(t.leaveType)).toHaveFocus();
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldShowPreviewAndFixEndDateForHalfDay', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    expect(screen.getByText(messages.common.noValue)).toBeInTheDocument();

    await ui.selectOptions(screen.getByLabelText(t.leaveType), 'HALF_AM');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
    expect(screen.getByLabelText(t.endDate)).toBeDisabled();
    expect(screen.getByLabelText(t.endDate)).toHaveValue('2026-11-16');
    expect(screen.getByText('0.5日')).toBeInTheDocument();
  });

  it('shouldFollowStartDateAndEnableEndDateWhenSwitchedBackToAnnual', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await ui.selectOptions(screen.getByLabelText(t.leaveType), 'HALF_AM');
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-16');
    await ui.clear(screen.getByLabelText(t.startDate));
    await ui.type(screen.getByLabelText(t.startDate), '2026-11-17');
    expect(screen.getByLabelText(t.endDate)).toHaveValue('2026-11-17');

    await ui.selectOptions(screen.getByLabelText(t.leaveType), 'ANNUAL');
    expect(screen.getByLabelText(t.endDate)).toBeEnabled();
    await ui.clear(screen.getByLabelText(t.endDate));
    await ui.type(screen.getByLabelText(t.endDate), '2026-11-18');
    expect(screen.getByText('2日')).toBeInTheDocument();
  });

  it('shouldRejectPeriodOnlyWeekend', async () => {
    mockApi(() => createdLeave());
    const ui = renderForm();
    await ui.selectOptions(screen.getByLabelText(t.leaveType), 'ANNUAL');
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
    await ui.selectOptions(screen.getByLabelText(t.leaveType), 'ANNUAL');
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

describe('LeaveApplyForm サーバーの入力エラー', () => {
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
