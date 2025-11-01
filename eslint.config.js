import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: true,
          defaultProject: './tsconfig.base.json'
        }
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off'
    }
  }
);
