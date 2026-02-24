// @ts-check
import nextConfig from 'eslint-config-next'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: ['lib/generated/**', 'node_modules/**', '.next/**'],
  },
  ...nextConfig,
  ...nextTypescript,
  {
    rules: {
      'no-console': 'warn',
    },
  },
]

export default eslintConfig
