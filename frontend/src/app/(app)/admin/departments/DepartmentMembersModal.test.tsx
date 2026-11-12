import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { DepartmentDetail } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { DepartmentMembersModal } from './DepartmentMembersModal';

const t = messages.departments.membersModal;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const DEPARTMENT: DepartmentDetail = {
  id: 'd-1',
  code: 'DEV',
  name: '開発部',
  memberCount: 1,
  inactiveMemberCount: 0,
  isSystem: false,
  description: null,
  manager: null,
  createdAt: '2026-11-01T09:00:00+09:00',
  updatedAt: '2026-11-08T09:00:00+09:00',
};

function renderModal() {
  const onClose = vi.fn();
  const onNotFound = vi.fn();
  render(
    <ToastProvider>
      <DepartmentMembersModal department={DEPARTMENT} onClose={onClose} onNotFound={onNotFound} />
    </ToastProvider>,
  );
  return { onClose, onNotFound };
}

type Member = { id: string; empId: string; name: string };

function pageOf(items: Member[], page = 1, totalPages = 1, totalCount = items.length) {
  return { items, page, limit: 100, totalCount, totalPages };
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe('DepartmentMembersModal(SCR-010 所属社員確認)', () => {
  it('shouldShowMembersWhenLoaded', async () => {
    apiFetch.mockResolvedValue(pageOf([{ id: 'u-1', empId: '00001', name: '山田 太郎' }]));
    renderModal();
    expect(await screen.findByText('山田 太郎')).toBeInTheDocument();
    expect(screen.getByText('00001')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
    expect(screen.getByText(t.subtitle('開発部', 1))).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/admin/departments/d-1/members?page=1&limit=100');
    // 部署列は対象部署の名前
    expect(screen.getByRole('cell', { name: '開発部' })).toBeInTheDocument();
  });

  it('shouldKeepTableHeaderWhileLoading', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    renderModal();
    for (const name of [t.empId, t.name, t.department]) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
  });

  it('shouldCollectAllPagesWhenMembersSpanMultiplePages', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({
      id: `u-${i}`,
      empId: String(i).padStart(5, '0'),
      name: `社員${i}`,
    }));
    const second = [{ id: 'u-100', empId: '00100', name: '最後 太郎' }];
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('page=2') ? pageOf(second, 2, 2, 101) : pageOf(first, 1, 2, 101),
      ),
    );
    renderModal();
    expect(await screen.findByText('最後 太郎')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/admin/departments/d-1/members?page=2&limit=100');
    expect(screen.getByText(t.subtitle('開発部', 101))).toBeInTheDocument();
  });

  it('shouldFilterByNameWithoutChangingTotalCount', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        { id: 'u-1', empId: '00001', name: '山田 太郎' },
        { id: 'u-2', empId: '00002', name: '佐藤 花子' },
      ]),
    );
    renderModal();
    await screen.findByText('山田 太郎');
    // 空白を無視して絞り込む
    await userEvent.type(screen.getByRole('searchbox', { name: t.searchLabel }), '山田太郎');
    expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    expect(screen.queryByText('佐藤 花子')).not.toBeInTheDocument();
    expect(screen.getByText(t.subtitle('開発部', 2))).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('shouldShowNoResultMessageWhenSearchMatchesNobody', async () => {
    apiFetch.mockResolvedValue(pageOf([{ id: 'u-1', empId: '00001', name: '山田 太郎' }]));
    renderModal();
    await screen.findByText('山田 太郎');
    await userEvent.type(screen.getByRole('searchbox', { name: t.searchLabel }), 'zzz');
    expect(screen.getByText(t.noResult)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: t.empId })).toBeInTheDocument();
  });

  it('shouldShowEmptyMessageWhenNoMembers', async () => {
    apiFetch.mockResolvedValue(pageOf([]));
    renderModal();
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('shouldShowRetryWhenLoadFails', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'INTERNAL', 'error', []));
    renderModal();
    expect(await screen.findByRole('button', { name: messages.common.retry })).toBeInTheDocument();
  });

  it('shouldShowErrorWithoutPartialListWhenSecondPageFails', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({
      id: `u-${i}`,
      empId: String(i).padStart(5, '0'),
      name: `社員${i}`,
    }));
    apiFetch.mockImplementation((path: string) =>
      path.includes('page=2')
        ? Promise.reject(new ApiError(500, 'INTERNAL', 'error', []))
        : Promise.resolve(pageOf(first, 1, 2, 101)),
    );
    renderModal();
    expect(await screen.findByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    // 1 ページ目が成功しても部分的な一覧は出さない
    expect(screen.queryByText('社員0')).not.toBeInTheDocument();
    expect(screen.queryByText(t.noResult)).not.toBeInTheDocument();
  });

  it('shouldReloadAllPagesWhenRetryClicked', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'error', []));
    apiFetch.mockResolvedValue(pageOf([{ id: 'u-1', empId: '00001', name: '山田 太郎' }]));
    renderModal();
    await userEvent.click(await screen.findByRole('button', { name: messages.common.retry }));
    expect(await screen.findByText('山田 太郎')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: messages.common.retry })).not.toBeInTheDocument();
    // 失敗した 1 回目と再取得の 1 回目の計 2 回
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenLastCalledWith('/admin/departments/d-1/members?page=1&limit=100');
  });

  it('shouldIgnoreLateNotFoundResponseAfterUnmount', async () => {
    let rejectFetch: (reason: unknown) => void = () => {};
    apiFetch.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFetch = reject;
      }),
    );
    const onClose = vi.fn();
    const onNotFound = vi.fn();
    const { unmount } = render(
      <ToastProvider>
        <DepartmentMembersModal department={DEPARTMENT} onClose={onClose} onNotFound={onNotFound} />
      </ToastProvider>,
    );
    unmount();
    rejectFetch(new ApiError(404, 'NOT_FOUND', '部署が見つかりません。', []));
    await Promise.resolve();
    await Promise.resolve();
    // 閉じた後の遅れた 404 では通知・閉じる・一覧再取得を行わない
    expect(onClose).not.toHaveBeenCalled();
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it('shouldCloseAndNotifyWithServerMessageWhenDepartmentNotFound', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'NOT_FOUND', '部署が見つかりません。', []));
    const { onClose, onNotFound } = renderModal();
    expect(await screen.findByText('部署が見つかりません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onNotFound).toHaveBeenCalled();
  });

  it('shouldCallCloseWhenCloseButtonClicked', async () => {
    apiFetch.mockResolvedValue(pageOf([]));
    const { onClose } = renderModal();
    await waitFor(() => screen.getByText(t.empty));
    await userEvent.click(screen.getAllByRole('button', { name: t.close }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });
});
