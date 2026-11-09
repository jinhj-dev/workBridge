import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError, NetworkError } from '@/lib/api/client';
import type { Attendance } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { AttendanceEditModal } from './AttendanceEditModal';

const t = messages.adminAttendance.modal;

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const TARGET: Attendance = {
  id: 'att-1',
  user: { id: 'u-1', name: '山田太郎', empId: '10001', departmentName: '開発部' },
  workDate: '2026-11-08',
  clockIn: '2026-11-08T09:00:00+09:00',
  clockOut: null,
  workMinutes: null,
  status: 'MISSING_CLOCK_OUT',
  modifiedAt: null,
};

function renderModal(attendance: Attendance | null = TARGET) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ToastProvider>
      <AttendanceEditModal attendance={attendance} onClose={onClose} onSaved={onSaved} />
    </ToastProvider>,
  );
  return { onClose, onSaved };
}

function clockInput(): HTMLElement {
  return screen.getByLabelText(t.clockIn);
}
function clockOutInput(): HTMLElement {
  return screen.getByLabelText(t.clockOut);
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe('AttendanceEditModal(SCR-008 勤怠修正)', () => {
  it('shouldShowReadOnlyEmployeeAndDateWithExistingValues', () => {
    renderModal();
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText('2026/11/08(日)')).toBeInTheDocument();
    expect(clockInput()).toHaveValue('2026-11-08T09:00');
    expect(clockOutInput()).toHaveValue('');
  });

  it('shouldShowClockOutOrderErrorAndNotCallApiWhenClockOutNotAfterClockIn', async () => {
    const user = userEvent.setup();
    renderModal();
    fireEvent.change(clockOutInput(), { target: { value: '2026-11-08T09:00' } });
    await user.click(screen.getByRole('button', { name: t.save }));

    expect(screen.getByText(t.validation.clockOutOrder)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('shouldShowClockInRequiredWhenClockInEmpty', async () => {
    const user = userEvent.setup();
    renderModal();
    fireEvent.change(clockInput(), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: t.save }));

    expect(screen.getByText(t.validation.clockInRequired)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('shouldConfirmBeforeSubmittingAndSendPatchWithOffsetAndNullClockOut', async () => {
    const user = userEvent.setup();
    apiFetch.mockResolvedValue({ ...TARGET });
    const { onClose, onSaved } = renderModal();

    await user.click(screen.getByRole('button', { name: t.save }));
    expect(screen.getByText(t.confirm)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledWith('/admin/attendance/att-1', {
      method: 'PATCH',
      body: JSON.stringify({ clockIn: '2026-11-08T09:00:00+09:00', clockOut: null }),
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(t.success)).toBeInTheDocument();
  });

  it('shouldSendClockOutWithOffsetWhenEntered', async () => {
    const user = userEvent.setup();
    apiFetch.mockResolvedValue({ ...TARGET, status: 'DONE' });
    renderModal();
    fireEvent.change(clockOutInput(), { target: { value: '2026-11-08T18:00' } });

    await user.click(screen.getByRole('button', { name: t.save }));
    await user.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse((apiFetch.mock.calls[0][1] as { body: string }).body)).toEqual({
      clockIn: '2026-11-08T09:00:00+09:00',
      clockOut: '2026-11-08T18:00:00+09:00',
    });
  });

  it('shouldShowServerMessageInModalAndReturnToInputOnInvalidTimeRange', async () => {
    const user = userEvent.setup();
    apiFetch.mockRejectedValue(new ApiError(400, 'INVALID_TIME_RANGE', 'サーバー文言'));
    const { onClose, onSaved } = renderModal();
    await user.click(screen.getByRole('button', { name: t.save }));
    await user.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(t.invalidTimeRange)).toBeInTheDocument();
    expect(clockInput()).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shouldCloseAndReloadWhenNotFound', async () => {
    const user = userEvent.setup();
    apiFetch.mockRejectedValue(new ApiError(404, 'NOT_FOUND', '見つかりません'));
    const { onClose, onSaved } = renderModal();
    await user.click(screen.getByRole('button', { name: t.save }));
    await user.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(t.notFound)).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shouldDisableButtonsWhileRequestInFlight', async () => {
    const user = userEvent.setup();
    let resolveRequest: (value: unknown) => void = () => undefined;
    apiFetch.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));
    renderModal();
    await user.click(screen.getByRole('button', { name: t.save }));
    await user.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() => expect(screen.getByRole('button', { name: t.back })).toBeDisabled());
    expect(screen.getByRole('button', { name: t.submit })).toBeDisabled();
    // 連続クリックでも API は 1 回だけ
    await user.click(screen.getByRole('button', { name: t.submit }));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    resolveRequest({ ...TARGET });
  });

  it('shouldKeepModalOpenOnNetworkError', async () => {
    const user = userEvent.setup();
    apiFetch.mockRejectedValue(new NetworkError());
    const { onClose, onSaved } = renderModal();
    await user.click(screen.getByRole('button', { name: t.save }));
    await user.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(messages.error.network)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
