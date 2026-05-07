import { defineConfig } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  {
    ignores: ['.claude/**', '.opencode/**', '.playwright-mcp/**'],
  },
  ...nextVitals,
  ...nextTypescript,
])

export default eslintConfig
