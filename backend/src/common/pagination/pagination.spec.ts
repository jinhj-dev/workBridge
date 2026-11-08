import { describe, expect, it } from 'vitest';
import { paginationQuerySchema, toPage, toSkipTake } from './pagination.js';

describe('paginationQuerySchema', () => {
  it('shouldApplyDefaultsWhenPageAndLimitAreOmitted', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('shouldCoerceQueryStrings', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '100' })).toEqual({
      page: 3,
      limit: 100,
    });
  });

  it.each([
    { limit: '101' },
    { limit: '0' },
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'abc' },
  ])('shouldFailValidation(%j)', (query) => {
    expect(paginationQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('toPage', () => {
  it('shouldReturnZeroTotalPagesWhenNoItems', () => {
    expect(toPage([], 0, 1, 20)).toEqual({
      items: [],
      page: 1,
      limit: 20,
      totalCount: 0,
      totalPages: 0,
    });
  });

  it('shouldRoundUpTotalPages', () => {
    expect(toPage(['a'], 21, 2, 20).totalPages).toBe(2);
    expect(toPage(['a'], 20, 1, 20).totalPages).toBe(1);
  });
});

describe('toSkipTake', () => {
  it('shouldConvertPageToSkipTake', () => {
    expect(toSkipTake({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
    expect(toSkipTake({ page: 3, limit: 5 })).toEqual({ skip: 10, take: 5 });
  });
});
