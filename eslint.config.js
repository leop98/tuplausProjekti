const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",        // import type {} where possible
      "@typescript-eslint/explicit-function-return-type": "error",  // all functions must declare return type

      // Imports
      "no-undef": "off",

      // Style — enforced without Prettier
      "eqeqeq": ["error", "always"],           // no == only ===
      "no-var": "error",                        // no var, only const/let
      "prefer-const": "error",                  // const wherever possible
      "curly": ["error", "all"],                // always use braces on if/else/for
      "no-console": ["warn", { allow: ["error"] }], // console.log left in by accident
      "quotes": ["error", "single", { avoidEscape: true }],
      "semi": ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      "object-curly-spacing": ["error", "always"],
      "arrow-spacing": "error",
      "space-before-function-paren": ["error", { anonymous: "never", named: "never", asyncArrow: "always" }],
      "keyword-spacing": "error",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];