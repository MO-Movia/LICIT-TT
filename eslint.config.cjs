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
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
];
