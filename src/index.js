#!/usr/bin/env node

const https = require('https');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { program } = require('commander');
const { createProject } = require('./commands/create');
const { compareVersion } = require('./utils/version');
const pkgVersion = '0.0.1'; // 当前 CLI 版本
const repo = 'abu0306/codegen-cli'; // 替换为你的仓库

// 检查最新版本
function checkUpdate() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/latest`,
      headers: { 'User-Agent': 'codegen-cli' }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(data);
          const latest = json.tag_name ? json.tag_name.replace(/^v/, '') : null;
          if (latest && compareVersion(latest, pkgVersion) > 0) {
            console.log(chalk.yellow(
              `\n发现新版本: v${latest}，当前版本: v${pkgVersion}\n`
            ));
            const answer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'update',
                message: '是否立即下载安装最新版？（将自动运行 install.sh）',
                default: true
              }
            ]);
            if (answer.update) {
              // 自动下载并执行 install.sh
              const installUrl = `https://raw.githubusercontent.com/${repo}/master/install.sh`;
              const { execSync } = require('child_process');
              try {
                console.log(chalk.blue('\n正在下载安装脚本并自动更新...'));
                // 兼容 macOS/Linux
                execSync(`curl -fsSL "${installUrl}" | sh`, { stdio: 'inherit' });
                console.log(chalk.green('\n更新完成，请重新运行该命令。'));
                process.exit(0);
              } catch (e) {
                console.log(chalk.red('\n自动更新失败，请手动运行以下命令：'));
                console.log(`curl -fsSL "${installUrl}" | sh`);
                process.exit(1);
              }
            }
          }
        } catch (e) { /* 忽略错误 */ }
        resolve();
      });
    }).on('error', () => resolve());
  });
}

// 主程序入口
(async () => {
  await checkUpdate();
  program
    .version(pkgVersion)
    .description('Tauri React 项目脚手架工具')
    .command('create <project-name>')
    .description('创建一个新的 Tauri React 项目')
    .action(async (projectName) => {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: '请选择项目模板:',
            choices: [
              { name: 'React (TypeScript)', value: 'react-ts' },
              { name: 'React (JavaScript)', value: 'react' },
            ],
            default: ["react-ts", "react"]
          },
          {
            type: 'checkbox',
            name: 'features',
            message: '请选择需要添加的功能:',
            choices: [
              { name: 'Redux Toolkit 状态管理', value: 'rtk' },
              { name: 'React Router 路由', value: 'router' },
              { name: 'ESLint 配置', value: 'eslint' },
              { name: '前后端调用示例', value: 'api' }
            ],
            default: ['rtk', 'router', 'eslint', 'api']
          }
        ]);

        await createProject(projectName, answers);

        console.log(chalk.blue('\n开始使用:'));
        console.log(`  cd ${projectName}`);
        console.log('  npm install');
        console.log('  npm run tauri dev');
      } catch (error) {
        console.log(chalk.red('项目创建失败: ' + error.message));
        process.exit(1);
      }
    });

  program.parse(process.argv);
})();