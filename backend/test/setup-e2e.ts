// e2e テストは backend/.env.test の設定(テスト用 DB)で実行する
import { loadEnvTest } from './test-database-url.js';

loadEnvTest();
