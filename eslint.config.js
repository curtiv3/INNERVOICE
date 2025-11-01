import eslintJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginImport from "eslint-plugin-import";

export default [
  {
    ignores: [
      "node_modules",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**"
    ]
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}", "**/*.cjs"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.base.json",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: eslintPluginImport
    },
    rules: {
      ...eslintJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "import/order": [
        "error",
        {
          "groups": [
            ["builtin", "external"],
            ["internal"],
            ["parent", "sibling", "index"]
          ],
          "newlines-between": "always"
        }
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "react/react-in-jsx-scope": "off"
    }
  }
];
