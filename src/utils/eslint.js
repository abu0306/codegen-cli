const fs = require('fs-extra');
const path = require('path');

async function setupESLint() {
  const eslintConfig = {
    env: {
      browser: true,
      es2021: true,
      node: true
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react-hooks/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      },
      ecmaVersion: 12,
      sourceType: 'module'
    },
    plugins: ['react', '@typescript-eslint'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  };

  // 创建 .eslintrc.js
  await fs.outputFile(
    '.eslintrc.js',
    `module.exports = ${JSON.stringify(eslintConfig, null, 2)}`
  );

  // 创建 .eslintignore
  const eslintIgnore = `
node_modules
dist
build
src-tauri
  `.trim();

  await fs.outputFile('.eslintignore', eslintIgnore);

  // 添加 lint 脚本到 package.json
  const packageJson = await fs.readJson('package.json');
  packageJson.scripts = {
    ...packageJson.scripts,
    'lint': 'eslint src --ext .js,.jsx,.ts,.tsx',
    'lint:fix': 'eslint src --ext .js,.jsx,.ts,.tsx --fix'
  };
  await fs.writeJson('package.json', packageJson, { spaces: 2 });
}

module.exports = {
  setupESLint
}; 