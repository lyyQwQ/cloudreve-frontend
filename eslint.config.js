import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
      "jsx-a11y": {
        rules: {
          "no-static-element-interactions": {
            meta: { type: "problem", schema: [] },
            create: () => ({}),
          },
          "click-events-have-key-events": {
            meta: { type: "problem", schema: [] },
            create: () => ({}),
          },
        },
      },
    },
  },
  {
    ignores: ["build/**", "dev-dist/**", "public/assets/**", "src/i18n.ts"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-extra-non-null-assertion": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-namespace": "off",
      "no-var": "off",
      "prefer-const": "off",
      "prefer-spread": "off",
      "react/prop-types": "off",
      "react/jsx-key": "off",
      "react/display-name": "off",
      "react/no-unknown-property": "off",
      "react-hooks/exhaustive-deps": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/click-events-have-key-events": "off",
    },
  },
]);
