#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { createProject } = require('./commands/create');

program
  .version('1.0.0')
  .description('Tauri React 项目脚手架工具')
  .command('create <project-name>')
  .description('创建一个新的 Tauri React 项目')
  .action(async (projectName) => {
    const spinner = ora('正在创建项目...').start();
    
    try {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: '请选择项目模板:',
          choices: ['react', 'react-ts'],
          default: 'react'
        },
        {
          type: 'list',
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
      spinner.succeed(chalk.green('项目创建成功！'));
      
      console.log(chalk.blue('\n开始使用:'));
      console.log(`  cd ${projectName}`);
      console.log('  npm install');
      console.log('  npm run tauri dev');
    } catch (error) {
      spinner.fail(chalk.red('项目创建失败: ' + error.message));
      process.exit(1);
    }
  });

program.parse(process.argv); 