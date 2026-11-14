// 社員番号の自動採番(設計: design-backend 「公通決定」 社員番号 自動採番)
// 前提シグネチャ: nextEmpId(existingEmpIds: readonly string[]): string | null
// 実装のシグネチャが異なる場合は RUN フェーズで test を設計に合わせて修正する
import { nextEmpId } from './emp-id-generator.js';

describe('nextEmpId(社員番号の自動採番)', () => {
  it('shouldReturn00001WhenNoFiveDigitEmpIdExists', () => {
    expect(nextEmpId([])).toBe('00001');
  });

  it('shouldIgnoreSixDigitEmpIdWhenTakingMaximum', () => {
    // 900001(6 桁, E2E 用)は採番の対象外。5 桁の最大 10100 の次
    const existing = ['00001', '10001', '10100', '900001'];
    expect(nextEmpId(existing)).toBe('10101');
  });

  it('shouldZeroPadResultToFiveDigits', () => {
    expect(nextEmpId(['00009'])).toBe('00010');
  });

  it('shouldReturnNullWhenMaximumIs99999', () => {
    expect(nextEmpId(['00001', '99999'])).toBeNull();
  });

  it('shouldIgnoreNonNumericOrWrongLengthEmpIds', () => {
    expect(nextEmpId(['ABC12', 'WB0001', '1234', '123456', '0000A'])).toBe('00001');
  });
});
