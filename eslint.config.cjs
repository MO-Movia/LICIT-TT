const config = require('@modusoperandi/eslint-config');
module.exports = [
  ...config.getFlatConfig({
    strict: false,
    header: config.header.mit,
  }),
  {
    rules: {
      'no-console': 'off', // console.warn and console.error are not flagged by this rule.
      'prefer-const': 'off',
      'no-constant-binary-expression': 'off',
      'import/no-cycle': 'off',
      'import/no-named-as-default-member': 'off',
      'jest/no-done-callback': 'off',
      'jest/expect-expect': 'off',
      'jest/no-identical-title': 'off',
      'jest/require-top-level-describe': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'sonarjs/prefer-single-boolean-return': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/prefer-regexp-exec': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/constructor-for-side-effects': 'off',
      'sonarjs/unused-import': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/no-undefined-argument': 'off',
    },
  },
];
