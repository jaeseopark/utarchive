const js = require("@eslint/js");
const ts = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/storybook-static/**",
      "tmp/**",
      "eslint.config.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...require("globals").browser,
        ...require("globals").node,
        RequestInfo: "readonly",
        RequestInit: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
      ...prettier.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-redeclare": "off",
      "no-redeclare": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression",
          message:
            'Type casting with "as" is not allowed. Use type-safe narrowing or proper typing instead. Only suppress this rule for API response parsing/deserialization with: // eslint-disable-next-line no-restricted-syntax',
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: {
        ...require("globals").vitest,
      },
    },
  },
];
