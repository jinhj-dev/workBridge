'use client';

import { Button } from '@/components/Button';
import { EditButton } from '@/components/ActionButtons';
import { DetailTable, DetailTableRow } from '@/components/DetailTable';
import { JobTitleBadge } from '@/components/JobTitleBadge';
import { Modal } from '@/components/Modal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { UserDetail } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDate, formatTokyoDate } from '@/lib/format';
import { messages } from '@/messages/ja';
import { EmploymentStatusBadge } from './EmploymentStatusBadge';
import { PeopleIcon } from './icons';

const t = messages.users;
const d = messages.users.detailModal;

interface UserDetailModalProps {
  open: boolean;
  // 表示する社員の id(閉じているときは null でもよい)
  userId: string | null;
  onClose: () => void;
  // [編集]: 詳細を閉じて編集を開く(親が切り替える)
  onEdit: (user: UserDetail) => void;
  // 社員が見つからなかったとき(一覧の再取得用)
  onNotFound?: () => void;
}

// SCR-006 社員詳細モーダル(表示のみ)。親が開くたびに key を変えて作り直す
export function UserDetailModal({
  open,
  userId,
  onClose,
  onEdit,
  onNotFound,
}: UserDetailModalProps) {
  const { showToast } = useToast();
  const query = useApiQuery<UserDetail>(open && userId ? `/admin/users/${userId}` : null, {
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 404) {
        showToast(t.notFound, 'error');
        onClose();
        onNotFound?.();
      }
    },
  });
  const user = query.data;

  function renderBody() {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (query.status === 'error' || !user) return <SectionError onRetry={query.reload} />;
    return (
      <DetailTable>
        <DetailTableRow label={t.columns.empId}>
          <span className="tabular-nums">{user.empId}</span>
        </DetailTableRow>
        <DetailTableRow label={t.columns.name}>{user.name}</DetailTableRow>
        <DetailTableRow label={t.columns.jobTitle}>
          <JobTitleBadge jobTitle={user.jobTitle} />
        </DetailTableRow>
        <DetailTableRow label={t.columns.email}>
          {user.contactEmail ?? messages.common.noValue}
        </DetailTableRow>
        <DetailTableRow label={t.columns.department}>{user.departmentName}</DetailTableRow>
        <DetailTableRow label={t.columns.hireDate}>
          <span className="tabular-nums">{formatDate(user.hireDate)}</span>
        </DetailTableRow>
        <DetailTableRow label={t.columns.status}>
          <EmploymentStatusBadge status={user.employmentStatus} />
        </DetailTableRow>
        <DetailTableRow label={d.role}>
          {user.role === 'ADMIN' ? d.roleAdmin : d.roleEmployee}
        </DetailTableRow>
        <DetailTableRow label={d.approvalRequired}>
          {user.approvalRequired ? d.approvalRequiredYes : d.approvalRequiredNo}
        </DetailTableRow>
        <DetailTableRow label={d.passwordChange}>
          {user.mustChangePassword ? d.passwordChangeRequired : d.passwordChangeDone}
        </DetailTableRow>
        <DetailTableRow label={d.createdAt}>
          <span className="tabular-nums">{formatTokyoDate(user.createdAt)}</span>
        </DetailTableRow>
        <DetailTableRow label={d.updatedAt}>
          <span className="tabular-nums">{formatTokyoDate(user.updatedAt)}</span>
        </DetailTableRow>
      </DetailTable>
    );
  }

  return (
    <Modal
      open={open}
      title={d.title}
      icon={<PeopleIcon />}
      iconVariant="circle"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.close}
          </Button>
          <EditButton size="md" disabled={!user} onClick={() => user && onEdit(user)} />
        </>
      }
    >
      {renderBody()}
    </Modal>
  );
}
