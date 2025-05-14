const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function setupESLint(template) {
  const isTypeScript = template === 'react-ts';

  const eslintConfig = {
    env: {
      browser: true,
      es2021: true,
      node: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ],
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 'latest', // Use 'latest' for modern JavaScript features
      sourceType: 'module',
    },
    plugins: ['react'],
    rules: {
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ new JSX transform
      'react/prop-types': isTypeScript ? 'off' : 'warn', // Only warn for prop-types in JS
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  };

  if (isTypeScript) {
    eslintConfig.extends.push('plugin:@typescript-eslint/recommended');
    eslintConfig.parser = '@typescript-eslint/parser';
    eslintConfig.plugins.push('@typescript-eslint');
    eslintConfig.rules['@typescript-eslint/explicit-module-boundary-types'] = 'off';
    eslintConfig.rules['@typescript-eslint/no-explicit-any'] = 'warn';
  } else {
    // For JavaScript projects, you might consider adding a specific parser like @babel/eslint-parser
    // if you use experimental Babel features, but for standard React JS, default or React plugin might suffice.
    // We'll keep it simpler for now. If users have complex Babel setups, they can customize.
    // eslintConfig.parser = '@babel/eslint-parser'; 
    // eslintConfig.parserOptions.requireConfigFile = false; // If using @babel/eslint-parser without babel config
    // eslintConfig.parserOptions.babelOptions = {
    //   presets: [['@babel/preset-react', { runtime: "automatic" }]],
    // };
  }

  // 创建 .eslintrc.js
  await fs.outputFile(
    '.eslintrc.js',
    `module.exports = ${JSON.stringify(eslintConfig, null, 2)};`
  );

  // 创建 .eslintignore
  const eslintIgnore = `
node_modules
dist
build
src-tauri
.eslintrc.js
  `.trim();

  await fs.outputFile('.eslintignore', eslintIgnore);

  // 添加 lint 脚本到 package.json
  const packageJsonPath = 'package.json';
  try {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.scripts = {
      ...packageJson.scripts,
      lint: 'eslint src --ext .js,.jsx,.ts,.tsx',
      'lint:fix': 'eslint src --ext .js,.jsx,.ts,.tsx --fix',
    };
    // Ensure devDependencies for ESLint are appropriate
    packageJson.devDependencies = packageJson.devDependencies || {};
    packageJson.devDependencies['eslint'] = packageJson.devDependencies['eslint'] || '^8.0.0'; // Example version
    packageJson.devDependencies['eslint-plugin-react'] = packageJson.devDependencies['eslint-plugin-react'] || '^7.20.0';
    packageJson.devDependencies['eslint-plugin-react-hooks'] = packageJson.devDependencies['eslint-plugin-react-hooks'] || '^4.0.0';
    
    if (isTypeScript) {
      packageJson.devDependencies['@typescript-eslint/parser'] = packageJson.devDependencies['@typescript-eslint/parser'] || '^5.0.0';
      packageJson.devDependencies['@typescript-eslint/eslint-plugin'] = packageJson.devDependencies['@typescript-eslint/eslint-plugin'] || '^5.0.0';
    } else {
      // For JS, ensure TS specific dev deps are not there if they were somehow added previously
      // Or, if you want to be very explicit, remove them:
      // delete packageJson.devDependencies['@typescript-eslint/parser'];
      // delete packageJson.devDependencies['@typescript-eslint/eslint-plugin'];
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not update package.json for ESLint scripts/dependencies: ${error.message}`));
  }
}

module.exports = {
  setupESLint,
}; 