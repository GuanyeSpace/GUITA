module.exports = {
  root: true,
  extends: ['./packages/config/eslint-preset.js'],
  ignorePatterns: [
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/miniprogram_npm/**',
    '**/miniapp_npm/**',
    'apps/miniapp/typings/**/*.d.ts'
  ],
  overrides: [
    {
      files: ['apps/admin/**/*.{ts,tsx}'],
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    {
      files: ['apps/miniapp/**/*.ts'],
      globals: {
        App: 'readonly',
        Component: 'readonly',
        Page: 'readonly',
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        wx: 'readonly'
      }
    }
  ]
}
