module.exports = {
  root: true,
  extends: ['next/core-web-vitals', '../../packages/config/eslint-config-base.cjs'],
  parserOptions: { project: './tsconfig.json' },
}
