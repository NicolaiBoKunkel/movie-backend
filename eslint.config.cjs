const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [

  // 1. Ignore frontend, build output, JS files, coverage, temp
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "frontend/**",
      "**/*.js",
      "coverage/**",
      "tmp/**"
    ],
  },

  // 2. Base ESLint recommended rules
  js.configs.recommended,

  // 3. Standard TypeScript files
  {
    files: ["**/*.ts"],

    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2021,
      sourceType: "module",

      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        module: "readonly",

        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly"
      }
    },

    plugins: {
      "@typescript-eslint": tseslint
    },

    rules: {
      ...tseslint.configs.recommended.rules,

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off"
    }
  },

  // 4. Cypress E2E Tests — Allow variables like `cy`, `Cypress`, etc.
  {
    files: ["Tests/cypress/**/*.ts"],
    languageOptions: {
      globals: {
        cy: "readonly",
        Cypress: "readonly",
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        after: "readonly",
        afterEach: "readonly"
      }
    }
  },

  // 5. Migration + Entity folders — disable strict typing
  {
    files: [
      "migrater_new/**/*.ts",
      "src/entities/**/*.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },

  // 6. Scripts/seed files using require()
  {
    files: [
      "prisma/**/*.ts",
      "scripts/**/*.ts"
    ],
    languageOptions: {
      globals: {
        require: "readonly"
      }
    }
  }
];
