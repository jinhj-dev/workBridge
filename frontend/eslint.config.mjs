import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

// 禁止クラス(反応形・状態の接頭辞付きを含む)。flex は単語単位のみ(flex-1 は許可)
const BUTTON_FORBIDDEN_CLASS =
  '(^|[ ])([^ ]+:)?(h-|size-|min-h-|p[xytblrse]?-|text-|font-|leading-|bg-|border|rounded|gap-|flex($|[ ])|inline-flex|grid|items-|justify-|whitespace-|outline|shadow|opacity-|cursor-)';
const BUTTON_CLASS_MESSAGE =
  'Button の className は配置用クラスのみ指定できます(UI_BUTTON_PATTERNS §4.6)';

const eslintConfig =defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  // Button の className は配置用クラスのみ許可する(UI_BUTTON_PATTERNS §4.6)
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='className'] Literal[value=/${BUTTON_FORBIDDEN_CLASS}/]`,
          message: BUTTON_CLASS_MESSAGE,
        },
        {
          selector: `JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='className'] TemplateElement[value.raw=/${BUTTON_FORBIDDEN_CLASS}/]`,
          message: BUTTON_CLASS_MESSAGE,
        },
        {
          selector: `TemplateLiteral:has(CallExpression[callee.name='buttonClass']) > TemplateElement[value.raw=/${BUTTON_FORBIDDEN_CLASS}/]`,
          message: BUTTON_CLASS_MESSAGE,
        },
      ],
    },
  },
  // 整形は Prettier に任せるため、競合するルールを無効にする(最後に置く)
  eslintConfigPrettier,
]);

export default eslintConfig;
