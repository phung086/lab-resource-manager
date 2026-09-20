const nodeGlobals = {
  Buffer: "readonly",
  URL: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  globalThis: "readonly",
  process: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  structuredClone: "readonly"
};

export default [
  {
    files: ["**/*.{js,mjs}"],
    ignores: [
      "node_modules/**",
      "test/**",
      "prisma/migrations/**"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals
    },
    rules: {
      "no-dupe-keys": "error",
      "no-undef": "error",
      "no-unreachable": "error"
    }
  }
];
