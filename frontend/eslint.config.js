const browserGlobals = {
  Blob: "readonly",
  CustomEvent: "readonly",
  URL: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  window: "readonly"
};

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: browserGlobals
    },
    rules: {
      "no-dupe-keys": "error",
      "no-undef": "error",
      "no-unreachable": "error"
    }
  }
];
