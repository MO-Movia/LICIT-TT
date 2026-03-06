// @ts-check
const config = require('@modusoperandi/eslint-config');
module.exports = [
  ...config.getFlatConfig({
    strict: false,
    header: config.header.mit,
  }),
  {
    files: config.TS_FILES,
    rules: {
      'import/no-cycle': 'warn',
      'no-constant-binary-expression': 'warn',
      'import/no-named-as-default-member': 'warn',
      'import/no-named-as-default': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
  {
    files: config.TEST_FILES,
    rules: {
      'jest/valid-expect': 'warn',
      'jest/no-done-callback': 'warn',
      'jest/expect-expect': 'warn',
      'jest/no-identical-title': 'warn',
      'jest/no-conditional-expect': 'warn',
      'jest/require-top-level-describe': 'warn',
    },
  },
];
