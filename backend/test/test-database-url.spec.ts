// テスト用 DB の接続先検証(assertTestDatabaseUrl)の単体テスト。DB は使わない。
import { describe, expect, it } from 'vitest';
import { assertTestDatabaseUrl } from './test-database-url.js';

describe('assertTestDatabaseUrl', () => {
  it('ローカルの *_test DB だけを許可する', () => {
    for (const url of [
      'postgresql://u:p@localhost:5432/workbridge_test',
      'postgresql://u:p@127.0.0.1:5432/workbridge_test',
      'postgresql://u:p@[::1]:5432/workbridge_test',
    ]) {
      expect(assertTestDatabaseUrl(url)).toBe(url);
    }
  });

  it('開発用 DB・他ホスト・不正な URL・未設定は拒否する', () => {
    expect(() => assertTestDatabaseUrl('postgresql://u:p@localhost:5432/workbridge')).toThrow(
      'テスト用 DB(*_test)以外には接続できません',
    );
    expect(() => assertTestDatabaseUrl('postgresql://u:p@db.example.com:5432/x_test')).toThrow(
      'ローカルのみ接続できます',
    );
    expect(() => assertTestDatabaseUrl('not a url')).toThrow('形式が不正です');
    expect(() => assertTestDatabaseUrl('')).toThrow('設定されていません');
    expect(() => assertTestDatabaseUrl(undefined)).toThrow('設定されていません');
  });
});
