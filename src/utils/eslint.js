const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

async function setupESLint(template) {
  const fs = require("fs-extra");
  const chalk = require("chalk");

  const isTypeScript = template === "react-ts";

  // 生成 Flat Config 格式
  const configImports = [
    "import js from '@eslint/js'",
    "import globals from 'globals'",
    "import reactHooks from 'eslint-plugin-react-hooks'",
    "import reactRefresh from 'eslint-plugin-react-refresh'",
    isTypeScript ? "import tseslint from 'typescript-eslint'" : null,
    "import prettier from 'eslint-plugin-prettier'",
    "import eslintConfigPrettier from 'eslint-config-prettier'",
  ]
    .filter(Boolean)
    .join("\n");

  const configExport = `
export default ${isTypeScript ? "tseslint.config(" : ""} 
  { ignores: ['dist', 'node_modules', 'build'] },
  {
    extends: [js.configs.recommended${
      isTypeScript ? ", ...tseslint.configs.recommended" : ""
    }, eslintConfigPrettier],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        React: 'readonly',
      },
      ${isTypeScript ? "parser: tseslint.parser," : ""}
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'prettier/prettier': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'warn',
      'prefer-const': 'warn',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      ${
        isTypeScript
          ? `
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      `
          : ""
      }
    },
    settings: {
      react: { version: 'detect' },
    },
  }
${isTypeScript ? ")" : ""}
`.trim();

  // 写入 eslint.config.js
  await fs.outputFile(
    "eslint.config.js",
    `${configImports}\n\n${configExport}\n`
  );

  // 写入 .prettierrc
  const prettierConfigStr = `{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
`.trim();
  await fs.outputFile(".prettierrc", prettierConfigStr);

  const eslintIgnore = `
node_modules
dist
build
src-tauri
`.trim();
  await fs.outputFile(".eslintignore", eslintIgnore);

  const packageJsonPath = "package.json";
  try {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.scripts = {
      ...packageJson.scripts,
      lint: "eslint .",
      "lint:fix": "eslint . --fix",
    };
    packageJson.devDependencies = packageJson.devDependencies || {};
    packageJson.devDependencies["eslint"] =
      packageJson.devDependencies["eslint"] || "^8.0.0";
    packageJson.devDependencies["eslint-plugin-react-hooks"] =
      packageJson.devDependencies["eslint-plugin-react-hooks"] || "^4.0.0";
    packageJson.devDependencies["eslint-plugin-react-refresh"] =
      packageJson.devDependencies["eslint-plugin-react-refresh"] || "^0.4.0";
    packageJson.devDependencies["eslint-plugin-prettier"] =
      packageJson.devDependencies["eslint-plugin-prettier"] || "^4.0.0";
    packageJson.devDependencies["eslint-config-prettier"] =
      packageJson.devDependencies["eslint-config-prettier"] || "^8.0.0";
    packageJson.devDependencies["prettier"] =
      packageJson.devDependencies["prettier"] || "^2.0.0";
    packageJson.devDependencies["@eslint/js"] =
      packageJson.devDependencies["@eslint/js"] || "^8.0.0";
    packageJson.devDependencies["globals"] =
      packageJson.devDependencies["globals"] || "^13.0.0";
    if (isTypeScript) {
      packageJson.devDependencies["typescript-eslint"] =
        packageJson.devDependencies["typescript-eslint"] || "^7.0.0";
    }
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  } catch (error) {
    console.warn(
      chalk.yellow(
        `Warning: Could not update package.json for ESLint scripts/dependencies: ${error.message}`
      )
    );
  }
}
module.exports = {
  setupESLint,
};
