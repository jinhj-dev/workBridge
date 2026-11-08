// @ts-check
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'src/generated/', 'eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Controller から Prisma を直接使わない(Service / Repository を通す)。型の import だけは許す
    files: ['**/*.controller.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/generated/prisma/**', '@prisma/*', '**/prisma/prisma.service*'],
              message: 'Controller から Prisma を直接使わず、Service を通してください。',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // 整形は Prettier に任せるため、競合するルールを無効にする(最後に置く)
  eslintConfigPrettier,
);
