import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { DepartmentDetail, DepartmentMember } from '@/lib/api/types';
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

type Member = Pick<DepartmentMember, 'id' | 'empId' | 'name'> &
  Partial<Pick<DepartmentMember, 'hireDate' | 'jobTitle' | 'contactEmail'>>;

function pageOf(items: Member[], page = 1, totalPages = 1, totalCount = items.length) {
  const normalized = items.map((m) => ({
    hireDate: '2020-04-01',
    jobTitle: null,
    contactEmail: null,
    ...m,
  }));
  return { items: normalized, page, limit: 100, totalCount, totalPages };
}

// 6 列 + 右端の矢印列(見出しは空)
const COLUMNS = [t.empId, t.name, t.hireDate, t.department, t.jobTitle, t.contact, ''];

// 一覧テーブルの列見出しを表示順に返す
function columnHeaderTexts(): string[] {
  return screen.getAllByRole('columnheader').map((header) => header.textContent ?? '');
}

// 行の各セルの文字列を表示順に返す
function cellTexts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

// 読み込み中・エラー・空の状態を表示する行の最初のセル
function stateCell(): HTMLElement {
  const cell = document.querySelector('tbody td');
  if (!(cell instanceof HTMLElement)) throw new Error('状態行のセルが見つかりません');
  return cell;
}

// 表示幅(lg 以上なら表、未満ならカード)を切り替えられるように matchMedia を差し替える
function setDesktop(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

// 氏名 社員1 … 社員N の一覧(全員同じ部署)
function numberedMembers(count: number): Member[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `u-${i + 1}`,
    empId: String(i + 1).padStart(5, '0'),
    name: `社員${i + 1}`,
  }));
}

beforeEach(() => {
  apiFetch.mockReset();
  setDesktop(true);
});

afterEach(() => {
  // 未処理の描画 effect が matchMedia を呼ぶため、スタブを外す前にアンマウントする
  // (setup の cleanup は本フックの後に走るため、ここで先に行う)
  cleanup();
  vi.unstubAllGlobals();
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

  it('shouldShowJobTitleBadgeAndContactEmailWhenPresent', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          jobTitle: { id: 'j-1', name: 'マネージャー', tone: 'VIOLET' },
          contactEmail: 'yamada@example.com',
        },
        {
          id: 'u-2',
          empId: '00002',
          name: '佐藤 花子',
          jobTitle: { id: 'j-2', name: 'デザイナー', tone: 'PINK' },
          contactEmail: 'sato@example.com',
        },
      ]),
    );
    renderModal();
    expect(await screen.findByText('マネージャー')).toHaveClass('bg-violet-30', 'text-violet-110');
    expect(screen.getByText('デザイナー')).toHaveClass('bg-pink-30', 'text-pink-110');
    expect(screen.getByText('yamada@example.com')).toBeInTheDocument();
    expect(screen.getByText('sato@example.com')).toBeInTheDocument();
  });

  it('shouldMapBlueAndGrayTonesToInfoAndNeutralBadges', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          jobTitle: { id: 'j-1', name: 'リーダー', tone: 'BLUE' },
        },
        {
          id: 'u-2',
          empId: '00002',
          name: '佐藤 花子',
          jobTitle: { id: 'j-2', name: 'エンジニア', tone: 'GRAY' },
        },
      ]),
    );
    renderModal();
    expect(await screen.findByText('リーダー')).toHaveClass('bg-primary-30');
    expect(screen.getByText('エンジニア')).toHaveClass('bg-general-40');
  });

  it('shouldShowContactAsPlainTextWithoutMailtoLink', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          contactEmail: 'yamada@example.com',
        },
      ]),
    );
    renderModal();
    const email = await screen.findByText('yamada@example.com');
    expect(email.closest('a')).toBeNull();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    const icon = email.previousElementSibling;
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('shouldShowDashWhenJobTitleAndContactAreEmpty', async () => {
    apiFetch.mockResolvedValue(pageOf([{ id: 'u-1', empId: '00001', name: '山田 太郎' }]));
    renderModal();
    await screen.findByText('山田 太郎');
    const row = screen.getByText('00001').closest('tr')!;
    expect(within(row).getAllByText(messages.common.noValue)).toHaveLength(2);
  });

  it('shouldNotSearchByJobTitleOrContact', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          jobTitle: { id: 'j-1', name: 'マネージャー', tone: 'VIOLET' },
          contactEmail: 'yamada@example.com',
        },
      ]),
    );
    renderModal();
    await screen.findByText('山田 太郎');
    await userEvent.type(screen.getByRole('searchbox', { name: t.searchLabel }), 'yamada@');
    expect(screen.getByText(t.noResult)).toBeInTheDocument();
  });

  it('shouldShowSixColumnsInOrderWithHireDateJobTitleAndContactCells', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          jobTitle: { id: 'j-1', name: 'マネージャー', tone: 'VIOLET' },
          contactEmail: 'yamada@example.com',
        },
        { id: 'u-2', empId: '00002', name: '佐藤 花子' },
      ]),
    );
    renderModal();
    await screen.findByText('山田 太郎');
    expect(columnHeaderTexts()).toEqual(COLUMNS);
    const filledRow = screen.getByText('00001').closest('tr')!;
    expect(cellTexts(filledRow)).toEqual([
      '00001',
      '山田 太郎',
      '2020/04/01',
      '開発部',
      'マネージャー',
      'yamada@example.com',
      '',
    ]);
    // 右端の矢印は飾り(aria-hidden の svg のみ。操作要素なし)
    expect(within(filledRow).queryByRole('button')).not.toBeInTheDocument();
    expect(within(filledRow).queryByRole('link')).not.toBeInTheDocument();
    expect(filledRow.querySelector('td:last-child svg[aria-hidden="true"]')).not.toBeNull();
    const emptyRow = screen.getByText('00002').closest('tr')!;
    expect(cellTexts(emptyRow)).toEqual([
      '00002',
      '佐藤 花子',
      '2020/04/01',
      '開発部',
      messages.common.noValue,
      messages.common.noValue,
      '',
    ]);
  });

  it('shouldKeepSixColumnHeaderAndFullWidthStateCellWhileLoading', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    renderModal();
    expect(columnHeaderTexts()).toEqual(COLUMNS);
    expect(stateCell()).toHaveAttribute('colspan', '7');
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
    // 5 名ずつ表示するので最後の社員は最終ページ(21 ページ目)にいる
    await userEvent.click(await screen.findByRole('button', { name: '21ページ' }));
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
    expect(stateCell()).toHaveAttribute('colspan', '7');
    expect(columnHeaderTexts()).toEqual(COLUMNS);
  });

  it('shouldShowRetryWhenLoadFails', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'INTERNAL', 'error', []));
    renderModal();
    expect(await screen.findByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    expect(stateCell()).toHaveAttribute('colspan', '7');
    expect(columnHeaderTexts()).toEqual(COLUMNS);
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

  it('shouldShowFiveMembersPerPageAndMovePagesWithoutRefetch', async () => {
    apiFetch.mockResolvedValue(pageOf(numberedMembers(12)));
    renderModal();
    await screen.findByText('社員1');
    expect(document.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(screen.queryByText('社員6')).not.toBeInTheDocument();
    expect(screen.getByText(messages.pagination.total(12))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: messages.pagination.page(3) }));
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByText('社員11')).toBeInTheDocument();
    expect(screen.queryByText('社員1')).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('shouldResetToFirstPageAndCountMatchesWhenSearching', async () => {
    apiFetch.mockResolvedValue(pageOf(numberedMembers(12)));
    renderModal();
    await screen.findByText('社員1');
    await userEvent.click(screen.getByRole('button', { name: messages.pagination.page(3) }));
    await userEvent.type(screen.getByRole('searchbox', { name: t.searchLabel }), '社員1');
    // 一致は 社員1・社員10・社員11・社員12 の 4 名。3 ページ目のままではなく 1 ページ目に戻る
    expect(document.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(screen.getByText('社員1')).toBeInTheDocument();
    expect(screen.getByText(messages.pagination.total(4))).toBeInTheDocument();
    // 対象社員の件数は部署の全体のまま
    expect(screen.getByText(t.subtitle('開発部', 12))).toBeInTheDocument();
  });

  it('shouldShowCardsWithSameInformationWhenViewportIsNarrow', async () => {
    setDesktop(false);
    apiFetch.mockResolvedValue(
      pageOf([
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          hireDate: '2020-04-01',
          jobTitle: { id: 'j-1', name: 'マネージャー', tone: 'VIOLET' },
          contactEmail: 'yamada@example.com',
        },
        { id: 'u-2', empId: '00002', name: '佐藤 花子' },
      ]),
    );
    renderModal();
    await screen.findByText('山田 太郎');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: t.listLabel })).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const card = cards[0];
    expect(within(card).getByText('00001')).toBeInTheDocument();
    expect(within(card).getByText('開発部')).toBeInTheDocument();
    expect(within(card).getByText('マネージャー')).toHaveClass('bg-violet-30');
    expect(within(card).getByText(`${t.hireDate}：2020/04/01`)).toBeInTheDocument();
    expect(within(card).getByText('yamada@example.com')).toBeInTheDocument();
    // 役職・連絡先なしは「—」
    expect(within(cards[1]).getAllByText(messages.common.noValue)).toHaveLength(2);
    // 右の矢印は操作できない飾り
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(card.querySelector('svg[aria-hidden="true"]:last-child')).not.toBeNull();
  });

  it('shouldPaginateAndShowStatusMessageInCardLayout', async () => {
    setDesktop(false);
    apiFetch.mockResolvedValue(pageOf(numberedMembers(7)));
    renderModal();
    await screen.findByText('社員1');
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(5);
    await userEvent.click(screen.getByRole('button', { name: messages.pagination.page(2) }));
    expect(screen.getByText('社員7')).toBeInTheDocument();
    expect(screen.queryByText('社員1')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: t.searchLabel }), 'zzz');
    expect(screen.getByText(t.noResult)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: t.listLabel })).not.toBeInTheDocument();
  });

  it('shouldCallCloseWhenCloseButtonClicked', async () => {
    apiFetch.mockResolvedValue(pageOf([]));
    const { onClose } = renderModal();
    await waitFor(() => screen.getByText(t.empty));
    await userEvent.click(screen.getAllByRole('button', { name: t.close }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });
});
