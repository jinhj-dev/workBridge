// zod の検証メッセージを日本語にする(環境変数と API 入力の両方に効く)。
// main.ts の先頭とテストの setupFiles で読み込む。
import { z } from 'zod';

z.config(z.locales.ja());
