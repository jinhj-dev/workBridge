import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import { JobTitlesModal } from './JobTitlesModal';

// 役職確認モーダル(design-frontend §3)。文言は設計書の「테스트 근거 문구」そのまま
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const JOB_TITLES = [
  { id: 'jt-1', name: 'マネージャー', tone: 'VIOLET', userCount: 2, createdAt: '', updatedAt: '' },
  { id: 'jt-2', name: 'エンジニア', tone: 'GRAY', userCount: 0, createdAt: '', updatedAt: '' },
];

function renderModal(onChanged = vi.fn()) {
  render(
    <ToastProvider>
      <JobTitlesModal open onClose={vi.fn()} onChanged={onChanged} />
    </ToastProvider>,
  );
  return onChanged;
}

function routeApi(
  handlers: Partial<Record<'post' | 'patch' | 'delete', () => Promise<unknown>>> = {},
) {
  apiFetch.mockImplementation((path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'POST' && handlers.post) return handlers.post();
    if (method === 'PATCH' && handlers.patch) return handlers.patch();
    if (method === 'DELETE' && handlers.delete) return handlers.delete();
    return Promise.resolve(JOB_TITLES);
  });
}

beforeEach(() => {
  apiFetch.mockReset();
  routeApi();
});

describe('JobTitlesModal', () => {
  it('shouldListJobTitlesWithCount', async () => {
    renderModal();
    expect(await screen.findByText('登録されている役職（2件）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'マネージャーを編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'エンジニアを削除' })).toBeInTheDocument();
  });

  it('shouldRequireNameAndColorOnAdd', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('button', { name: '追加' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByText('役職名を入力してください。')).toBeInTheDocument();
    expect(screen.getByText('色を選択してください。')).toBeInTheDocument();
  });

  it('shouldUpdatePreviewBadgeWhenNameAndColorChange', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('button', { name: '追加' }));
    await user.type(screen.getByRole('textbox', { name: '役職名' }), '人事');
    await user.click(screen.getByRole('radio', { name: '緑' }));
    expect(screen.getByRole('radio', { name: '緑' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('人事').className).toContain('bg-success-30');
  });

  it('shouldSupportArrowKeyNavigationInRadioGroup', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('button', { name: '追加' }));
    const group = screen.getByRole('radiogroup', { name: '色' });
    await user.click(within(group).getByRole('radio', { name: '紫' }));
    await user.keyboard('{ArrowRight}');
    expect(within(group).getByRole('radio', { name: '青' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('shouldCreateSaveToastRefreshListAndNotifyParent', async () => {
    const user = userEvent.setup();
    const post = vi.fn(() => Promise.resolve({ id: 'jt-3', name: '人事', tone: 'GREEN' }));
    routeApi({ post });
    const onChanged = renderModal();
    await user.click(await screen.findByRole('button', { name: '追加' }));
    await user.type(screen.getByRole('textbox', { name: '役職名' }), '人事');
    await user.click(screen.getByRole('radio', { name: '緑' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('役職を追加しました。')).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalled();
  });

  it('shouldShowDuplicateNameErrorUnderNameField', async () => {
    const user = userEvent.setup();
    routeApi({
      post: () =>
        Promise.reject(
          new ApiError(409, 'DUPLICATE_JOB_TITLE_NAME', 'この役職名は既に登録されています。'),
        ),
    });
    renderModal();
    await user.click(await screen.findByRole('button', { name: '追加' }));
    await user.type(screen.getByRole('textbox', { name: '役職名' }), 'マネージャー');
    await user.click(screen.getByRole('radio', { name: '紫' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('この役職名は既に登録されています。')).toBeInTheDocument();
  });

  it('shouldPrefillFormWhenEditing', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'マネージャーを編集' }));
    expect(screen.getByRole('textbox', { name: '役職名' })).toHaveValue('マネージャー');
    expect(screen.getByRole('radio', { name: '紫' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shouldShowInUseNoticeAndKeepDeleteDisabledWhenDeleteReturns409', async () => {
    const user = userEvent.setup();
    routeApi({
      delete: () =>
        Promise.reject(
          new ApiError(
            409,
            'JOB_TITLE_IN_USE',
            'この役職を使用している社員が存在するため、削除できません。',
          ),
        ),
    });
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'マネージャーを削除' }));
    expect(screen.getByText('「マネージャー」を削除しますか？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '削除' }));
    expect(
      await screen.findByText('この役職を使用している社員が存在するため、削除できません。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeDisabled();
  });

  it('shouldDeleteUnusedJobTitleWithToast', async () => {
    const user = userEvent.setup();
    const del = vi.fn(() => Promise.resolve(undefined));
    routeApi({ delete: del });
    const onChanged = renderModal();
    await user.click(await screen.findByRole('button', { name: 'エンジニアを削除' }));
    await user.click(screen.getByRole('button', { name: '削除' }));
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('役職を削除しました。')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });
});
