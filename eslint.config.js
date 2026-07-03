import js from "eslint/config";

export default [
  {
    ignores: ["fixtures/**", "examples/**/node_modules/**", "node_modules/**"],
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-implicit-globals": "error",
      "no-shadow": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-fallthrough": "error",
      "no-const-assign": "error",
    },
  },
];
