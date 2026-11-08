import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { BCRYPT_COST, DUMMY_PASSWORD_HASH, EMP_ID_PATTERN } from './credentials.js';

describe('credentials', () => {
  it('shouldUseSameCostForDummyHashAsForRealHashes', () => {
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_COST);
  });

  it('shouldBeValidBcryptHashThatDoesNotMatchArbitraryPassword', async () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2b\$\d{2}\$[./A-Za-z0-9]{53}$/);
    await expect(bcrypt.compare('Correct1pass', DUMMY_PASSWORD_HASH)).resolves.toBe(false);
  });

  it.each(['0', '00001', '1'.repeat(50)])('shouldAcceptEmpId(%s)', (value) => {
    expect(EMP_ID_PATTERN.test(value)).toBe(true);
  });

  it.each(['', ' 1', '1 ', 'E0001', '1'.repeat(51), '１２３', '1\n', '1\u0000', '1-2'])(
    'shouldRejectEmpId(%j)',
    (value) => {
      expect(EMP_ID_PATTERN.test(value)).toBe(false);
    },
  );
});
