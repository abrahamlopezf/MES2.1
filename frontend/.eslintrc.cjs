module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'react/jsx-uses-vars': 'error',
    'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
  },
  overrides: [
    {
      files: ['*.config.js', 'vite.config.js', 'vitest.config.js', 'src/testing/**/*'],
      env: { node: true },
    },
  ],
  ignorePatterns: ['dist', 'node_modules'],
};
