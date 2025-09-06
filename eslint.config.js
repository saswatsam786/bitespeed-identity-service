// @ts-check
import eslint from 'eslint';
import tseslint from 'typescript-eslint';
import pluginImport from 'eslint-plugin-import';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...eslint.configs.recommended[0].languageOptions?.globals,
      },
      parserOptions: {
        project: false,
      },
    },
    plugins: {
      import: pluginImport,
    },
    settings: {
      'import/resolver': {
        typescript: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
