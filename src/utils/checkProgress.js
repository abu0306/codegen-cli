const fs = require('fs-extra');
const chalk = require('chalk');

async function checkProgress(projectName, features) {
  console.log(chalk.blue('\n检查项目创建进度...'));
  
  const checks = [
    {
      name: '项目基础结构',
      check: async () => {
        const exists = await fs.pathExists(projectName);
        return exists;
      }
    },
    {
      name: 'package.json',
      check: async () => {
        const exists = await fs.pathExists(path.join(projectName, 'package.json'));
        return exists;
      }
    },
    {
      name: 'Tauri 配置',
      check: async () => {
        const exists = await fs.pathExists(path.join(projectName, 'src-tauri'));
        return exists;
      }
    }
  ];

  // 根据选择的功能添加检查项
  if (features.includes('rtk')) {
    checks.push({
      name: 'Redux Toolkit 配置',
      check: async () => {
        const exists = await fs.pathExists(path.join(projectName, 'src/store'));
        return exists;
      }
    });
  }

  if (features.includes('router')) {
    checks.push({
      name: 'React Router 配置',
      check: async () => {
        const exists = await fs.pathExists(path.join(projectName, 'src/routes'));
        return exists;
      }
    });
  }

  if (features.includes('eslint')) {
    checks.push({
      name: 'ESLint 配置',
      check: async () => {
        const exists = await fs.pathExists(path.join(projectName, '.eslintrc.js'));
        return exists;
      }
    });
  }

  if (features.includes('api')) {
    checks.push({
      name: 'API 示例',
      check: async () => {
        const exists = await fs.pathExists(path.join(projectName, 'src/api'));
        return exists;
      }
    });
  }

  // 执行检查
  for (const check of checks) {
    const result = await check.check();
    console.log(
      result
        ? chalk.green(`✓ ${check.name} 已配置`)
        : chalk.red(`✗ ${check.name} 未配置`)
    );
  }
}

module.exports = {
  checkProgress
}; 