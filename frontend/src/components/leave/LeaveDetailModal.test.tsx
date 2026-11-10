import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { LeaveDetailModal } from './LeaveDetailModal';

const t = messages.leave;

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

const APPROVER: AuthUser = {
  id: 'u-approver',
  name: '承認者',
  empId: '10002',
  role: 'EMPLOYEE',
  departmentName: '開発部',
  approvalRequired: true,
  mustChangePassword: false,
};
const ADMIN: AuthUser = { ...APPROVER, id: 'u-admin', name: '管理者', role: 'ADMIN' };
const APPLICANT_AUTH: AuthUser = { ...APPROVER, id: 'u-applicant', name: '申請者' };

const LEAVE_ID = 'leave-1';

function leave(overrides: Partial<Leave> = {}): Leave {
  return {
    id: LEAVE_ID,
    user: { id: 'u-applicant', name: '申請者', empId: '10001', departmentName: '営業部' },
    approver: { id: 'u-approver', name: '承認者', empId: '10002', departmentName: '開発部' },
    leaveType: 'ANNUAL',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    days: 2,
    reason: '家族の用事',
    status: 'PENDING',
    autoApproved: false,
    processedBy: null,
    processedAt: null,
    rejectReason: null,
    createdAt: '2026-11-08T10:00:00+09:00',
    ...overrides,
  };
}

type Handler = (init?: RequestInit) => unknown;

function mockApi(handlers: Record<string, Handler>): void {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const handler = handlers[path];
    if (!handler) throw new Error(`想定外の API 呼び出し: ${path}`);
    return handler(init);
  });
}

function callsTo(path: string): unknown[][] {
  return apiFetch.mock.calls.filter(([p]) => p === path);
}

const onClose = vi.fn();
const onProcessed = vi.fn();

// 親(一覧)と同じく、onClose で leaveId を null に戻す
function Harness() {
  return <LeaveDetailModal leaveId={LEAVE_ID} onClose={onClose} onProcessed={onProcessed} />;
}

async function renderModal(user: AuthUser, detail: Leave = leave()) {
  auth.user = user;
  const handlers: Record<string, Handler> = { [`/leaves/${LEAVE_ID}`]: () => detail };
  mockApi(handlers);
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
  const dialog = await screen.findByRole('dialog', { name: t.detail.title });
  await within(dialog).findByText(t.detail.leaveType);
  return { ui, dialog, handlers };
}

function toast(): HTMLElement {
  return screen
    .getAllByRole('status')
    .find((el) => el.getAttribute('aria-live') === 'polite') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LeaveDetailModal 表示', () => {
  it('shouldShowDetailItems', async () => {
    const { dialog } = await renderModal(APPROVER);

    expect(dialog).toHaveTextContent('申請者 (10001) / 営業部');
    expect(dialog).toHaveTextContent(t.types.ANNUAL);
    expect(dialog).toHaveTextContent('2026/11/20 ~ 2026/11/21');
    expect(dialog).toHaveTextContent('2日');
    expect(dialog).toHaveTextContent('家族の用事');
    expect(dialog).toHaveTextContent('承認者');
    expect(dialog).toHaveTextContent(t.statuses.PENDING);
    expect(within(dialog).queryByText(t.detail.rejectReason)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(t.detail.processedAt)).not.toBeInTheDocument();
  });

  it('shouldShowAutoApprovedWhenApproverIsNull', async () => {
    const { dialog } = await renderModal(
      APPLICANT_AUTH,
      leave({
        approver: null,
        autoApproved: true,
        status: 'APPROVED',
        processedBy: leave().user,
        processedAt: '2026-11-08T10:00:00+09:00',
      }),
    );

    expect(dialog).toHaveTextContent(t.detail.autoApproved);
    expect(dialog).toHaveTextContent('2026/11/08 10:00');
    expect(within(dialog).queryByText(t.detail.rejectReason)).not.toBeInTheDocument();
  });

  it('shouldShowRejectReasonOnlyWhenRejected', async () => {
    const { dialog } = await renderModal(
      APPLICANT_AUTH,
      leave({
        status: 'REJECTED',
        processedBy: leave().approver,
        processedAt: '2026-11-09T11:00:00+09:00',
        rejectReason: '繁忙期のため',
      }),
    );

    expect(within(dialog).getByText(t.detail.rejectReason)).toBeInTheDocument();
    expect(dialog).toHaveTextContent('繁忙期のため');
    expect(dialog).toHaveTextContent(t.statuses.REJECTED);
  });
});

describe('LeaveDetailModal ボタンの表示', () => {
  it('shouldShowApproveAndRejectToAssignedApproverForPending', async () => {
    const { dialog } = await renderModal(APPROVER);
    expect(within(dialog).getByRole('button', { name: t.detail.approve })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: t.detail.reject })).toBeInTheDocument();
  });

  it('shouldShowApproveAndRejectToAdminAsProxy', async () => {
    const { dialog } = await renderModal(ADMIN);
    expect(within(dialog).getByRole('button', { name: t.detail.approve })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: t.detail.reject })).toBeInTheDocument();
  });

  it('shouldShowOnlyCloseForProcessedLeave', async () => {
    const { dialog } = await renderModal(
      APPROVER,
      leave({
        status: 'APPROVED',
        processedBy: leave().approver,
        processedAt: '2026-11-09T11:00:00+09:00',
      }),
    );
    expect(
      within(dialog).queryByRole('button', { name: t.detail.approve }),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: t.detail.reject })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('button', { name: messages.common.close }).length).toBe(2);
  });

  it('shouldNotShowButtonsToApplicantEvenWhenAdmin', async () => {
    const { dialog } = await renderModal({ ...ADMIN, id: 'u-applicant' });
    expect(
      within(dialog).queryByRole('button', { name: t.detail.approve }),
    ).not.toBeInTheDocument();
  });
});

describe('LeaveDetailModal 承認', () => {
  it('shouldReturnToDetailWithoutClosingWhenCancelingConfirm', async () => {
    const { ui, dialog } = await renderModal(APPROVER);

    await ui.click(within(dialog).getByRole('button', { name: t.detail.approve }));
    expect(dialog).toHaveTextContent(t.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: messages.common.cancel }));

    // 詳細に戻り、モーダルは閉じない(ダッシュボード経路の回帰確認)
    expect(await within(dialog).findByText(t.detail.leaveType)).toBeInTheDocument();
    expect(within(dialog).queryByText(t.approve.confirm('申請者'))).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(callsTo(`/leaves/${LEAVE_ID}/approve`)).toHaveLength(0);
  });

  it('shouldApproveAfterConfirm', async () => {
    const { ui, dialog, handlers } = await renderModal(APPROVER);
    handlers[`/leaves/${LEAVE_ID}/approve`] = () => leave({ status: 'APPROVED' });

    await ui.click(within(dialog).getByRole('button', { name: t.detail.approve }));
    expect(dialog).toHaveTextContent(t.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: t.approve.submit }));

    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(callsTo(`/leaves/${LEAVE_ID}/approve`)[0][1]).toMatchObject({ method: 'PATCH' });
    expect(toast()).toHaveTextContent(t.approve.success);
  });

  it('shouldCallApproveOnlyOnceOnDoubleClick', async () => {
    let resolveApprove: (value: Leave) => void = () => {};
    const { ui, dialog, handlers } = await renderModal(APPROVER);
    handlers[`/leaves/${LEAVE_ID}/approve`] = () =>
      new Promise<Leave>((resolve) => {
        resolveApprove = resolve;
      });

    await ui.click(within(dialog).getByRole('button', { name: t.detail.approve }));
    const submit = within(dialog).getByRole('button', { name: t.approve.submit });
    await ui.click(submit);
    await ui.click(submit);

    expect(submit).toBeDisabled();
    expect(callsTo(`/leaves/${LEAVE_ID}/approve`)).toHaveLength(1);
    resolveApprove(leave({ status: 'APPROVED' }));
    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(1));
  });

  it('shouldToastCloseAndRefreshWhenAlreadyProcessed', async () => {
    const { ui, dialog, handlers } = await renderModal(APPROVER);
    handlers[`/leaves/${LEAVE_ID}/approve`] = () => {
      throw new ApiError(409, 'ALREADY_PROCESSED', 'サーバーの文言');
    };

    await ui.click(within(dialog).getByRole('button', { name: t.detail.approve }));
    await ui.click(within(dialog).getByRole('button', { name: t.approve.submit }));

    // サーバーの文言ではなく、画面用の文言(t.alreadyProcessed)が出ることを確認する
    await waitFor(() => expect(toast()).toHaveTextContent(t.alreadyProcessed));
    expect(screen.queryByText('サーバーの文言')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onProcessed).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, 'FORBIDDEN', 'サーバー文言', t.forbidden],
    [404, 'NOT_FOUND', '対象が見つかりません。', '対象が見つかりません。'],
  ])(
    'shouldToastCloseAndRefreshWhenProcessFailsWith%i',
    async (status, code, serverMessage, expected) => {
      const { ui, dialog, handlers } = await renderModal(APPROVER);
      handlers[`/leaves/${LEAVE_ID}/approve`] = () => {
        throw new ApiError(status, code, serverMessage);
      };

      await ui.click(within(dialog).getByRole('button', { name: t.detail.approve }));
      await ui.click(within(dialog).getByRole('button', { name: t.approve.submit }));

      await waitFor(() => expect(toast()).toHaveTextContent(expected));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onProcessed).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [403, 'FORBIDDEN', 'アクセス権限がありません。'],
    [404, 'NOT_FOUND', '対象が見つかりません。'],
  ])('shouldToastCloseAndRefreshWhenDetailFailsWith%i', async (status, code, serverMessage) => {
    auth.user = APPROVER;
    mockApi({
      [`/leaves/${LEAVE_ID}`]: () => {
        throw new ApiError(status, code, serverMessage);
      },
    });
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await waitFor(() => expect(toast()).toHaveTextContent(serverMessage));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onProcessed).toHaveBeenCalledTimes(1);
  });
});

describe('LeaveDetailModal 却下', () => {
  it.each([
    ['empty', '', t.reject.validation.required],
    ['whitespace', '   ', t.reject.validation.required],
    ['501 chars', 'あ'.repeat(501), t.reject.validation.tooLong],
  ])('shouldShowFieldErrorWithoutCallingApi(%s)', async (_label, input, expected) => {
    const { ui, dialog } = await renderModal(APPROVER);

    await ui.click(within(dialog).getByRole('button', { name: t.detail.reject }));
    const textarea = within(dialog).getByLabelText(t.reject.reasonLabel);
    if (input) {
      await ui.click(textarea);
      await ui.paste(input);
    }
    await ui.click(within(dialog).getByRole('button', { name: t.reject.submit }));

    expect(within(dialog).getByText(expected)).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(callsTo(`/leaves/${LEAVE_ID}/reject`)).toHaveLength(0);
  });

  it('shouldRejectWithTrimmedReason', async () => {
    const { ui, dialog, handlers } = await renderModal(APPROVER);
    handlers[`/leaves/${LEAVE_ID}/reject`] = () => leave({ status: 'REJECTED' });

    await ui.click(within(dialog).getByRole('button', { name: t.detail.reject }));
    await ui.type(within(dialog).getByLabelText(t.reject.reasonLabel), '  繁忙期のため  ');
    await ui.click(within(dialog).getByRole('button', { name: t.reject.submit }));

    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(1));
    const [, init] = callsTo(`/leaves/${LEAVE_ID}/reject`)[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ rejectReason: '繁忙期のため' });
    expect(toast()).toHaveTextContent(t.reject.success);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldAccept500CharsReason', async () => {
    const { ui, dialog, handlers } = await renderModal(APPROVER);
    handlers[`/leaves/${LEAVE_ID}/reject`] = () => leave({ status: 'REJECTED' });

    await ui.click(within(dialog).getByRole('button', { name: t.detail.reject }));
    await ui.click(within(dialog).getByLabelText(t.reject.reasonLabel));
    await ui.paste('あ'.repeat(500));
    await ui.click(within(dialog).getByRole('button', { name: t.reject.submit }));

    await waitFor(() => expect(callsTo(`/leaves/${LEAVE_ID}/reject`)).toHaveLength(1));
  });
});

describe('LeaveDetailModal initialStep', () => {
  function renderWithStep(user: AuthUser, initialStep: 'approve' | 'reject', detail = leave()) {
    auth.user = user;
    mockApi({ [`/leaves/${LEAVE_ID}`]: () => detail });
    const ui = userEvent.setup();
    render(
      <ToastProvider>
        <LeaveDetailModal
          leaveId={LEAVE_ID}
          initialStep={initialStep}
          onClose={onClose}
          onProcessed={onProcessed}
        />
      </ToastProvider>,
    );
    return ui;
  }

  it('shouldOpenApproveConfirmDirectlyAndCloseOnCancel', async () => {
    const ui = renderWithStep(APPROVER, 'approve');
    const dialog = await screen.findByRole('dialog', { name: t.approve.title });
    expect(await within(dialog).findByText(t.approve.confirm('申請者'))).toBeInTheDocument();

    await ui.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldOpenRejectReasonDirectly', async () => {
    renderWithStep(APPROVER, 'reject');
    const dialog = await screen.findByRole('dialog', { name: t.reject.title });
    expect(await within(dialog).findByLabelText(t.reject.reasonLabel)).toBeInTheDocument();
  });

  it('shouldShowDetailInsteadOfConfirmWhenAlreadyProcessed', async () => {
    renderWithStep(APPROVER, 'approve', leave({ status: 'APPROVED' }));
    const dialog = await screen.findByRole('dialog', { name: t.detail.title });
    expect(await within(dialog).findByText(t.detail.leaveType)).toBeInTheDocument();
    expect(within(dialog).queryByText(t.approve.confirm('申請者'))).not.toBeInTheDocument();
  });

  it('shouldShowAlreadyProcessedMessageOn409', async () => {
    const ui = renderWithStep(APPROVER, 'approve');
    apiFetch.mockImplementation(async (path: string) => {
      if (path === `/leaves/${LEAVE_ID}/approve`) {
        throw new ApiError(409, 'ALREADY_PROCESSED', 'サーバーの文言');
      }
      return leave();
    });
    const dialog = await screen.findByRole('dialog', { name: t.approve.title });
    await within(dialog).findByText(t.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: t.approve.submit }));

    await waitFor(() => expect(toast()).toHaveTextContent(t.alreadyProcessed));
    expect(onProcessed).toHaveBeenCalledTimes(1);
  });
});

describe('LeaveDetailModal 取消', () => {
  const cancelButtonName = t.detail.cancel;

  it('shouldShowCancelButtonForOwnPendingLeave', async () => {
    const { dialog } = await renderModal(APPLICANT_AUTH);
    expect(within(dialog).getByRole('button', { name: cancelButtonName })).toBeInTheDocument();
  });

  it('shouldHideCancelButtonForOthersLeave', async () => {
    const { dialog } = await renderModal(APPROVER);
    expect(
      within(dialog).queryByRole('button', { name: cancelButtonName }),
    ).not.toBeInTheDocument();
  });

  it('shouldHideCancelButtonForOwnLeaveAdminCannotCancelForOthers', async () => {
    const { dialog } = await renderModal(ADMIN);
    expect(
      within(dialog).queryByRole('button', { name: cancelButtonName }),
    ).not.toBeInTheDocument();
  });

  it('shouldHideCancelButtonForApprovedLeaveApprovedByApprover', async () => {
    const { dialog } = await renderModal(APPLICANT_AUTH, leave({ status: 'APPROVED' }));
    expect(
      within(dialog).queryByRole('button', { name: cancelButtonName }),
    ).not.toBeInTheDocument();
  });

  it('shouldShowCancelButtonForAutoApprovedFutureLeave', async () => {
    const { dialog } = await renderModal(
      APPLICANT_AUTH,
      leave({ status: 'APPROVED', autoApproved: true, approver: null, startDate: '2999-01-01' }),
    );
    expect(within(dialog).getByRole('button', { name: cancelButtonName })).toBeInTheDocument();
  });

  it('shouldHideCancelButtonForAutoApprovedPastLeave', async () => {
    const { dialog } = await renderModal(
      APPLICANT_AUTH,
      leave({ status: 'APPROVED', autoApproved: true, approver: null, startDate: '2000-01-03' }),
    );
    expect(
      within(dialog).queryByRole('button', { name: cancelButtonName }),
    ).not.toBeInTheDocument();
  });

  it('shouldReturnToDetailWhenBackPressed', async () => {
    const { ui, dialog } = await renderModal(APPLICANT_AUTH);
    await ui.click(within(dialog).getByRole('button', { name: cancelButtonName }));
    const confirm = await screen.findByRole('dialog', { name: t.cancel.title });
    expect(within(confirm).getByText(t.cancel.confirm)).toBeInTheDocument();
    await ui.click(within(confirm).getByRole('button', { name: t.cancel.back }));
    expect(await screen.findByRole('dialog', { name: t.detail.title })).toBeInTheDocument();
    expect(callsTo(`/leaves/${LEAVE_ID}/cancel`)).toHaveLength(0);
  });

  it('shouldCancelAndNotifyWhenConfirmed', async () => {
    const { ui, dialog, handlers } = await renderModal(APPLICANT_AUTH);
    handlers[`/leaves/${LEAVE_ID}/cancel`] = () => leave({ status: 'CANCELLED' });
    await ui.click(within(dialog).getByRole('button', { name: cancelButtonName }));
    const confirm = await screen.findByRole('dialog', { name: t.cancel.title });
    await ui.click(within(confirm).getByRole('button', { name: t.cancel.submit }));

    await waitFor(() => expect(toast()).toHaveTextContent(t.cancel.success));
    expect(callsTo(`/leaves/${LEAVE_ID}/cancel`)[0][1]).toMatchObject({ method: 'PATCH' });
    expect(onProcessed).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldCancelOnlyOnceOnDoubleClickWhileRequesting', async () => {
    let resolveCancel: (value: Leave) => void = () => undefined;
    const { ui, dialog, handlers } = await renderModal(APPLICANT_AUTH);
    handlers[`/leaves/${LEAVE_ID}/cancel`] = () =>
      new Promise<Leave>((resolve) => {
        resolveCancel = resolve;
      });
    await ui.click(within(dialog).getByRole('button', { name: cancelButtonName }));
    const confirm = await screen.findByRole('dialog', { name: t.cancel.title });
    const submit = within(confirm).getByRole('button', { name: t.cancel.submit });
    await ui.click(submit);
    await ui.click(submit);

    expect(submit).toBeDisabled();
    expect(callsTo(`/leaves/${LEAVE_ID}/cancel`)).toHaveLength(1);
    resolveCancel(leave({ status: 'CANCELLED' }));
    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(1));
  });

  it('shouldShowNotCancellableMessageOn409', async () => {
    const { ui, dialog, handlers } = await renderModal(APPLICANT_AUTH);
    handlers[`/leaves/${LEAVE_ID}/cancel`] = () => {
      throw new ApiError(409, 'NOT_CANCELLABLE', 'サーバーの文言');
    };
    await ui.click(within(dialog).getByRole('button', { name: cancelButtonName }));
    const confirm = await screen.findByRole('dialog', { name: t.cancel.title });
    await ui.click(within(confirm).getByRole('button', { name: t.cancel.submit }));

    await waitFor(() => expect(toast()).toHaveTextContent(t.cancel.notCancellable));
    expect(onProcessed).toHaveBeenCalledTimes(1);
  });

  describe('開始日の境界(東京の今日 2026-11-09 に固定)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-09T09:00:00+09:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shouldHideCancelButtonForAutoApprovedLeaveStartingToday', async () => {
      const { dialog } = await renderModal(
        APPLICANT_AUTH,
        leave({ status: 'APPROVED', autoApproved: true, approver: null, startDate: '2026-11-09' }),
      );
      expect(
        within(dialog).queryByRole('button', { name: cancelButtonName }),
      ).not.toBeInTheDocument();
    });

    it('shouldShowCancelButtonForAutoApprovedLeaveStartingTomorrow', async () => {
      const { dialog } = await renderModal(
        APPLICANT_AUTH,
        leave({ status: 'APPROVED', autoApproved: true, approver: null, startDate: '2026-11-10' }),
      );
      expect(within(dialog).getByRole('button', { name: cancelButtonName })).toBeInTheDocument();
    });

    it('shouldHideCancelButtonForOwnRejectedLeave', async () => {
      const { dialog } = await renderModal(
        APPLICANT_AUTH,
        leave({ status: 'REJECTED', rejectReason: '業務都合', startDate: '2026-11-20' }),
      );
      expect(
        within(dialog).queryByRole('button', { name: cancelButtonName }),
      ).not.toBeInTheDocument();
    });

    it('shouldHideCancelButtonForOwnCancelledLeave', async () => {
      const { dialog } = await renderModal(
        APPLICANT_AUTH,
        leave({ status: 'CANCELLED', startDate: '2026-11-20' }),
      );
      expect(
        within(dialog).queryByRole('button', { name: cancelButtonName }),
      ).not.toBeInTheDocument();
    });
  });
});
