import { AppException } from '../../common/exceptions/app.exception.js';
import type { DepartmentRow } from './department.mapper.js';
import { DepartmentsService } from './departments.service.js';
import type { DepartmentsRepository } from './departments.repository.js';

const ID = '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f9a01';

function makeRow(overrides: Partial<DepartmentRow> = {}): DepartmentRow {
  return {
    id: ID,
    code: 'DEV',
    name: '開発部',
    description: null,
    manager: null,
    createdAt: new Date('2026-11-10T00:00:00Z'),
    updatedAt: new Date('2026-11-10T00:00:00Z'),
    memberCount: 3,
    inactiveMemberCount: 1,
    ...overrides,
  };
}

describe('DepartmentsService', () => {
  const repository = {
    findAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    countSummary: vi.fn(),
    findMembersPage: vi.fn(),
    findManagerCandidates: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const service = new DepartmentsService(repository as unknown as DepartmentsRepository);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function errorOf(run: () => Promise<unknown>): Promise<unknown> {
    try {
      await run();
    } catch (error) {
      return error;
    }
    throw new Error('例外が発生するはずでした');
  }

  it('shouldMapRowToDetailWithTokyoTimeAndSystemFlag', async () => {
    repository.findPage.mockResolvedValue({
      items: [makeRow(), makeRow({ code: 'UNASSIGNED' })],
      total: 2,
    });
    const page = await service.listDetails({ page: 1, limit: 20, sort: 'code', order: 'asc' });
    expect(page.totalCount).toBe(2);
    expect(page.items[0]).toMatchObject({
      isSystem: false,
      memberCount: 3,
      inactiveMemberCount: 1,
      createdAt: '2026-11-10T09:00:00+09:00',
    });
    expect(page.items[1].isSystem).toBe(true);
  });

  it('shouldEscapeLikeWildcardsInSearchKeywords', async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 0 });
    await service.listDetails({
      page: 1,
      limit: 20,
      sort: 'code',
      order: 'asc',
      code: 'A%_',
      name: '100\\%',
    });
    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'A\\%\\_', name: '100\\\\\\%' }),
    );
  });

  it.each([
    ['code', 'DUPLICATE_DEPARTMENT_CODE'],
    ['name', 'DUPLICATE_DEPARTMENT_NAME'],
  ] as const)('shouldThrow409WhenCreateDuplicates_%s', async (field, code) => {
    repository.create.mockResolvedValue({ status: 'duplicate', field });
    const error = await errorOf(() => service.create({ code: 'DEV', name: '開発部' }));
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).toBody()).toMatchObject({ statusCode: 409, code });
  });

  it('shouldThrowProtectedWhenUpdatingSystemDepartment', async () => {
    repository.update.mockResolvedValue({ status: 'protected' });
    const error = await errorOf(() => service.update(ID, { name: 'x' }));
    expect((error as AppException).toBody()).toMatchObject({
      statusCode: 409,
      code: 'PROTECTED_DEPARTMENT',
    });
  });

  it.each([
    ['notFound', 404, 'NOT_FOUND', '部署が見つかりません。'],
    ['protected', 409, 'PROTECTED_DEPARTMENT', '未所属部署は変更・削除できません。'],
    [
      'hasMembers',
      409,
      'DEPARTMENT_HAS_MEMBERS',
      '所属する社員が存在するため、部署を削除できません。',
    ],
  ] as const)('shouldMapDeleteResult_%s', async (result, status, code, message) => {
    repository.delete.mockResolvedValue(result);
    const error = await errorOf(() => service.remove(ID));
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).toBody()).toMatchObject({ statusCode: status, code, message });
  });

  it('shouldThrowInvalidManagerWhenCreateOrUpdateRejectsManager', async () => {
    repository.create.mockResolvedValue({ status: 'invalidManager' });
    repository.update.mockResolvedValue({ status: 'invalidManager' });
    for (const run of [
      () => service.create({ code: 'DEV', name: '開発部', managerId: ID }),
      () => service.update(ID, { managerId: ID }),
    ]) {
      const error = await errorOf(run);
      expect((error as AppException).toBody()).toMatchObject({
        statusCode: 400,
        code: 'INVALID_MANAGER',
      });
    }
  });

  it('shouldThrowNotFoundWhenListingMembersOfMissingDepartment', async () => {
    repository.findMembersPage.mockResolvedValue(null);
    const error = await errorOf(() => service.listMembers(ID, { page: 1, limit: 20 }));
    expect((error as AppException).toBody()).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('shouldMapManagerCandidatesToUserSummary', async () => {
    repository.findManagerCandidates.mockResolvedValue([
      { id: ID, name: '山田 太郎', empId: '00001', department: { name: '開発部' } },
    ]);
    await expect(service.listManagerCandidates({ keyword: '' })).resolves.toEqual([
      { id: ID, name: '山田 太郎', empId: '00001', departmentName: '開発部' },
    ]);
    expect(repository.findManagerCandidates).toHaveBeenCalledWith(undefined);
  });

  it('shouldResolveWhenDeleted', async () => {
    repository.delete.mockResolvedValue('deleted');
    await expect(service.remove(ID)).resolves.toBeUndefined();
  });
});
