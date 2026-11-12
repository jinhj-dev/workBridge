// seed の設定読み込み(parseSeedConfig)の単体テスト。DB は使わない。
import { describe, expect, it } from 'vitest';
import { JOB_TITLES, parseSeedConfig } from './initial-data.js';

const VALID_PASSWORD = 'Seed1234pass';

describe('parseSeedConfig', () => {
  it('未指定の項目は既定値を使い、社員番号・氏名は前後の空白を除く', () => {
    expect(parseSeedConfig({ SEED_ADMIN_PASSWORD: VALID_PASSWORD })).toEqual({
      adminEmpId: '00001',
      adminName: '管理者',
      adminPassword: VALID_PASSWORD,
    });
    const config = parseSeedConfig({
      SEED_ADMIN_PASSWORD: VALID_PASSWORD,
      SEED_ADMIN_EMP_ID: ' 00123 ',
      SEED_ADMIN_NAME: ' 総務 太郎 ',
    });
    // 先頭の 0 は保持する
    expect(config.adminEmpId).toBe('00123');
    expect(config.adminName).toBe('総務 太郎');
  });

  it('パスワードが未設定・規則違反・72 バイト超のときは失敗する', () => {
    expect(() => parseSeedConfig({})).toThrow('SEED_ADMIN_PASSWORD が設定されていません');
    expect(() => parseSeedConfig({ SEED_ADMIN_PASSWORD: 'Ab1' })).toThrow('8 文字以上');
    expect(() => parseSeedConfig({ SEED_ADMIN_PASSWORD: 'abcdefgh' })).toThrow('英字と数字');
    expect(() => parseSeedConfig({ SEED_ADMIN_PASSWORD: '12345678' })).toThrow('英字と数字');
    // 'a1' + マルチバイト 24 文字 = 74 バイト
    expect(() => parseSeedConfig({ SEED_ADMIN_PASSWORD: `a1${'あ'.repeat(24)}` })).toThrow(
      '72 バイト以下',
    );
    // ちょうど 72 バイトは通る
    expect(
      parseSeedConfig({ SEED_ADMIN_PASSWORD: `a1${'x'.repeat(70)}` }).adminPassword,
    ).toHaveLength(72);
  });

  it('社員番号が数字のみ・最大 50 桁でないとき、氏名が列長を超えるときは失敗する', () => {
    const withEmpId = (empId: string) =>
      parseSeedConfig({ SEED_ADMIN_PASSWORD: VALID_PASSWORD, SEED_ADMIN_EMP_ID: empId });
    expect(withEmpId('1'.repeat(50)).adminEmpId).toHaveLength(50);
    for (const invalid of ['1'.repeat(51), 'ADMIN001', 'a0001', '000-1', '00 01', '１２３', '+1']) {
      expect(() => withEmpId(invalid), invalid).toThrow('SEED_ADMIN_EMP_ID');
    }
    expect(() =>
      parseSeedConfig({ SEED_ADMIN_PASSWORD: VALID_PASSWORD, SEED_ADMIN_NAME: '名'.repeat(101) }),
    ).toThrow('SEED_ADMIN_NAME');
  });
});

describe('JOB_TITLES', () => {
  it('shouldDefineFourUniqueJobTitlesWithinColumnLength', () => {
    expect(JOB_TITLES.map((jobTitle) => jobTitle.name)).toEqual([
      'マネージャー',
      'リーダー',
      'エンジニア',
      'デザイナー',
    ]);
    expect(new Set(JOB_TITLES.map((jobTitle) => jobTitle.name)).size).toBe(JOB_TITLES.length);
    for (const jobTitle of JOB_TITLES) {
      expect(jobTitle.name.length).toBeLessThanOrEqual(50);
    }
    expect(JOB_TITLES.map((jobTitle) => jobTitle.tone)).toEqual(['VIOLET', 'BLUE', 'GRAY', 'PINK']);
  });
});
