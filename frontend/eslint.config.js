import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Patterns établis dans l'app (sync form state, modales, cache API).
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx}'],
    rules: {
      // Vitest compile le JSX en runtime classique ; React reste requis.
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    },
  },
  {
    files: ['playwright.config.js', 'e2e/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
