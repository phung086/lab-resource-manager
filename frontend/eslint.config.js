import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const sharedRules = {
  "no-dupe-keys": "error",
  "no-unreachable": "error",
  "react/jsx-key": "error",
  "react/jsx-no-duplicate-props": "error",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
  "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
};

const reactPlugins = {
  react,
  "react-hooks": reactHooks,
  "react-refresh": reactRefresh
};

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: reactPlugins,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...sharedRules,
      "no-undef": "error"
    }
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      ...reactPlugins,
      "@typescript-eslint": tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...sharedRules,
      "no-undef": "off"
    }
  }
];
