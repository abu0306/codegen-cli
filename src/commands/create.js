const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { checkProgress } = require('../utils/checkProgress');
const { setupESLint } = require('../utils/eslint');
const { setupRTK } = require('../templates/rtk');
const { setupRouter } = require('../templates/router');

async function createProject(projectName, options) {

  const { template, features } = options;

  // 创建 Tauri 项目
  console.log(chalk.blue('正在创建 Tauri 项目...'));
  execSync(`bash -c 'curl -fsSL https://create.tauri.app/sh | sh -s -- -y ${projectName} --template ${template} --manager npm --identifier com.${projectName}.app'`, { stdio: 'pipe' });

  const originalCwd = process.cwd();
  process.chdir(projectName);

  // 安装额外依赖
  // console.log(chalk.blue('正在安装项目依赖...'));
  const dependencies = [];
  if (features.includes('rtk')) {
    dependencies.push('@reduxjs/toolkit', 'react-redux');
  }
  if (features.includes('router')) {
    dependencies.push('react-router-dom');
  }
  if (dependencies.length > 0) {
    execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'pipe' });
  }

  // 设置功能
  if (features.includes('rtk')) {
    await setupRTK(template);
  }
  if (features.includes('router')) {
    await setupRouter(template);
  }
  if (features.includes('eslint')) {
    await setupESLint(template);
  }

  // 创建前后端调用示例
  if (features.includes('api')) {
    await createApiExample(template);
  }

  fs.appendFileSync('.gitignore', "\npackage-lock.json\nyarn.lock");

  process.chdir(originalCwd);

  // 检查进度
  await checkProgress(projectName, features);
}

async function createApiExample(template) {
  // 创建前端 API 调用示例
  const apiExample = `
import { invoke } from '@tauri-apps/api/tauri';

export async function fetchData() {
  try {
    const response = await invoke('fetch_data');
    return response;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}
`;

  // 创建后端 Rust 示例
  const rustExample = `
#[tauri::command]
async fn fetch_data() -> Result<String, String> {
    // 这里添加你的业务逻辑
    Ok("Hello from Rust!".to_string())
}
`;

  const fileExtension = template === 'react-ts' ? 'ts' : 'js';

  // 写入文件
  await fs.outputFile(`src/api/index.${fileExtension}`, apiExample);
  await fs.outputFile('src-tauri/src/commands.rs', rustExample);
}

module.exports = {
  createProject
}; 