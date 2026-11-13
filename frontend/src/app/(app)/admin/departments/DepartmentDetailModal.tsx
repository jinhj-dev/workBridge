import { Badge } from '@/components/Badge';
import { DetailTable, DetailTableRow } from '@/components/DetailTable';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import type { DepartmentDetail } from '@/lib/api/types';
import { formatTokyoDate } from '@/lib/format';
import { messages } from '@/messages/ja';
import { BuildingIcon } from './icons';

const t = messages.departments;

interface DepartmentDetailModalProps {
  department: DepartmentDetail | null; // null のときは閉じている
  onClose: () => void;
  onEdit: (department: DepartmentDetail) => void;
}

// SCR-010 部署詳細モーダル(参照のみ)。一覧の行データをそのまま表示する
export function DepartmentDetailModal({ department, onClose, onEdit }: DepartmentDetailModalProps) {
  const manager = department?.manager ?? null;
  return (
    <Modal
      open={department !== null}
      title={t.detailModal.title}
      size="lg"
      icon={<BuildingIcon />}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.detailModal.close}
          </Button>
          {department && !department.isSystem && (
            <Button variant="primary" onClick={() => onEdit(department)}>
              {t.editSelected}
            </Button>
          )}
        </>
      }
    >
      {department && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <div className="flex items-center gap-4 md:w-40 md:shrink-0 md:flex-col md:gap-3 md:text-center">
            <span
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100 [&>svg]:size-8"
            >
              <BuildingIcon />
            </span>
            <div className="flex min-w-0 flex-col items-start gap-1 md:items-center">
              <span className="text-base/6 font-bold break-words text-general-100">
                {department.name}
              </span>
              {department.isSystem && <Badge variant="neutral">{t.system}</Badge>}
            </div>
          </div>
          <DetailTable className="min-w-0 flex-1">
            <DetailTableRow label={t.code}>{department.code}</DetailTableRow>
            <DetailTableRow label={t.columns.manager}>
              {manager ? t.managerValue(manager.name, manager.empId) : t.managerUnset}
            </DetailTableRow>
            <DetailTableRow label={t.memberCount}>
              {t.members(department.memberCount)}
            </DetailTableRow>
            {department.inactiveMemberCount > 0 && (
              <DetailTableRow label={t.inactiveMemberCount}>
                {t.members(department.inactiveMemberCount)}
              </DetailTableRow>
            )}
            <DetailTableRow label={t.columns.description}>
              {department.description ? (
                <span className="whitespace-pre-line">{department.description}</span>
              ) : (
                messages.common.noValue
              )}
            </DetailTableRow>
            <DetailTableRow label={t.updatedAt}>
              {formatTokyoDate(department.updatedAt)}
            </DetailTableRow>
          </DetailTable>
        </div>
      )}
    </Modal>
  );
}
