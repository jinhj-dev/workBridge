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
    const page = await service.listDetails({ page: 1, limit: 20 });
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
    await service.listDetails({ page: 1, limit: 20, code: 'A%_', name: '100\\%' });
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
    ['hasMembers', 409, 'DEPARTMENT_HAS_MEMBERS', '所属する社員が存在するため、部署を削除できません。'],
  ] as const)('shouldMapDeleteResult_%s', async (result, status, code, message) => {
    repository.delete.mockResolvedValue(result);
    const error = await errorOf(() => service.remove(ID));
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).toBody()).toMatchObject({ statusCode: status, code, message });
  });

  it('shouldResolveWhenDeleted', async () => {
    repository.delete.mockResolvedValue('deleted');
    await expect(service.remove(ID)).resolves.toBeUndefined();
  });
});
