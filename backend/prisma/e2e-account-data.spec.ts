// E2E アカウントの設定読み込み(parseE2eAccountConfig)の単体テスト。DB は使わない。
// 作成・初期化処理(resetE2eAccounts)の統合テストは test/db/e2e-accounts.e2e-spec.ts。
import { describe, expect, it } from 'vitest';
import { Role } from '../src/generated/prisma/client.js';
import { assertLocalDatabaseUrl, parseE2eAccountConfig } from './e2e-account-data.js';

const ADMIN_PASSWORD = 'Admin1234pass';
const INITIAL_PASSWORD = 'Initial5678pass';
const VALID_ENV = { E2E_ADMIN_PASSWORD: ADMIN_PASSWORD, E2E_INITIAL_PASSWORD: INITIAL_PASSWORD };

describe('parseE2eAccountConfig', () => {
  it('両方のパスワードが有効なとき、900001(ADMIN)と 900002(初回ログイン)の設定を返す', () => {
    expect(parseE2eAccountConfig(VALID_ENV)).toEqual({
      accounts: [
        {
          empId: '900001',
          name: 'E2E管理者',
          role: Role.ADMIN,
          mustChangePassword: false,
          password: ADMIN_PASSWORD,
        },
        {
          empId: '900002',
          name: 'E2E初回ログイン',
          role: Role.EMPLOYEE,
          mustChangePassword: true,
          password: INITIAL_PASSWORD,
        },
      ],
    });
  });

  it('どちらかのパスワードが未設定・空のときは、その環境変数名を含めて失敗する', () => {
    expect(() => parseE2eAccountConfig({ E2E_INITIAL_PASSWORD: INITIAL_PASSWORD })).toThrow(
      '環境変数 E2E_ADMIN_PASSWORD が設定されていません',
    );
    expect(() => parseE2eAccountConfig({ E2E_ADMIN_PASSWORD: ADMIN_PASSWORD })).toThrow(
      '環境変数 E2E_INITIAL_PASSWORD が設定されていません',
    );
    expect(() => parseE2eAccountConfig({ ...VALID_ENV, E2E_INITIAL_PASSWORD: '' })).toThrow(
      'E2E_INITIAL_PASSWORD',
    );
  });

  it('規則違反(7 文字・英字なし・数字なし・73 バイト)のときは失敗する', () => {
    const cases: [string, string][] = [
      ['Abc1234', '8 文字以上'],
      ['12345678', '英字と数字'],
      ['abcdefgh', '英字と数字'],
      [`a1${'x'.repeat(71)}`, '72 バイト以下'],
      // 'a1' + マルチバイト 23 文字(各 3 バイト)+ 'xx' = 73 バイト
      [`a1${'あ'.repeat(23)}xx`, '72 バイト以下'],
    ];
    for (const [password, message] of cases) {
      expect(
        () => parseE2eAccountConfig({ ...VALID_ENV, E2E_ADMIN_PASSWORD: password }),
        password,
      ).toThrow(`E2E_ADMIN_PASSWORD は`);
      expect(
        () => parseE2eAccountConfig({ ...VALID_ENV, E2E_ADMIN_PASSWORD: password }),
        password,
      ).toThrow(message);
      expect(
        () => parseE2eAccountConfig({ ...VALID_ENV, E2E_INITIAL_PASSWORD: password }),
        password,
      ).toThrow(`E2E_INITIAL_PASSWORD は`);
    }
  });

  it('境界値: 8 文字の英数字と、ちょうど 72 バイトのパスワードは通る', () => {
    const eightChars = 'abcd1234';
    const exactly72Bytes = `a1${'x'.repeat(70)}`;
    expect(Buffer.byteLength(exactly72Bytes)).toBe(72);
    const config = parseE2eAccountConfig({
      E2E_ADMIN_PASSWORD: eightChars,
      E2E_INITIAL_PASSWORD: exactly72Bytes,
    });
    expect(config.accounts.map((account) => account.password)).toEqual([
      eightChars,
      exactly72Bytes,
    ]);
    // マルチバイトでもちょうど 72 バイトなら通る('a1' + 'あ' × 22 + 'xxxx' = 72 バイト)
    const multiByte72 = `a1${'あ'.repeat(22)}xxxx`;
    expect(Buffer.byteLength(multiByte72)).toBe(72);
    expect(
      parseE2eAccountConfig({ ...VALID_ENV, E2E_ADMIN_PASSWORD: multiByte72 }).accounts[0].password,
    ).toBe(multiByte72);
  });

  it('NODE_ENV=production のときは、パスワードが有効でも失敗する', () => {
    expect(() => parseE2eAccountConfig({ ...VALID_ENV, NODE_ENV: 'production' })).toThrow(
      '本番環境では E2E アカウントを作成できません。',
    );
  });
});

describe('assertLocalDatabaseUrl', () => {
  it.each([
    'postgresql://user:pass@localhost:5432/workbridge',
    'postgresql://user:pass@127.0.0.1:5432/workbridge',
    'postgresql://user:pass@[::1]:5432/workbridge',
  ])('ローカルのホスト %s は許可する', (databaseUrl) => {
    expect(() => assertLocalDatabaseUrl(databaseUrl)).not.toThrow();
  });

  it.each([
    'postgresql://user:pass@db.example.com:5432/workbridge',
    'postgresql://user:pass@192.168.0.10:5432/workbridge',
    'postgresql://user:pass@localhost.evil.com:5432/workbridge',
    'postgresql://user:pass@127.0.0.1.evil.com:5432/workbridge',
    'not a url',
    '',
  ])('ローカル以外または解析できない %s は拒否する', (databaseUrl) => {
    expect(() => assertLocalDatabaseUrl(databaseUrl)).toThrow();
  });

  it('拒否時のエラーメッセージに接続文字列のパスワードを含めない', () => {
    const secret = 'SuperSecretPw987';
    let message = '';
    try {
      assertLocalDatabaseUrl(`postgresql://user:${secret}@db.example.com:5432/workbridge`);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toBe('');
    expect(message).not.toContain(secret);
  });

  it('解析できない文字列を渡しても接続文字列のパスワードを含めない', () => {
    const secret = 'SuperSecretPw987';
    expect(() => assertLocalDatabaseUrl(`postgresql//user:${secret}@`)).toThrow();
    let message = '';
    try {
      assertLocalDatabaseUrl(`postgresql//user:${secret}@`);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toContain(secret);
  });
});
