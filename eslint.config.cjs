const config = require('@modusoperandi/eslint-config');
module.exports = [
  ...config.getFlatConfig({
    strict: false,
    header: config.header.mit,
  }),
  {
    rules: {
      'jest/no-identical-title': 'warn',
      'jest/require-top-level-describe': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
