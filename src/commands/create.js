const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { checkProgress } = require('../utils/checkProgress');
const { setupESLint } = require('../utils/eslint');
const { setupRTK } = require('../templates/rtk');
const { setupRouter } = require('../templates/router');

const globalSpinnerChars = ['-', '\\', '|', '/'];
let overallProgressSpinnerIndex = 0;

// Helper function to run a task (async function or command) with a spinner
async function runAsyncTaskWithSpinner({ taskFn, cmd, args, initialMessage, successMessage, failureMessage }) {
  const spinnerChars = ['-', '\\', '|', '/'];
  let spinnerIndex = 0;
  
  const updateSpinner = () => {
    process.stdout.write(`\r${spinnerChars[spinnerIndex]} ${initialMessage}`);
    spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
  };

  updateSpinner();
  const intervalId = setInterval(updateSpinner, 150);

  try {
    if (taskFn) {
      await taskFn();
    } else if (cmd && args) {
      await new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'pipe' });
        let stderrData = '';
        if (child.stderr) {
          child.stderr.on('data', (data) => stderrData += data.toString());
        }
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            const err = new Error(`Command "${cmd} ${args.join(' ')}" failed with code ${code}. Stderr: ${stderrData.trim()}`);
            err.stderrOutput = stderrData.trim();
            reject(err);
          }
        });
        child.on('error', (err) => {
          reject(err);
        });
      });
    } else {
      throw new Error('Either taskFn or cmd/args must be provided to runAsyncTaskWithSpinner');
    }
    clearInterval(intervalId);
    process.stdout.write(`\r${chalk.green('✔')} ${successMessage}\n`);
  } catch (error) {
    clearInterval(intervalId);
    process.stdout.write(`\r${chalk.red('✖')} ${failureMessage}\n`);
    if (error.stderrOutput) {
      console.error(chalk.red(`  Error details: ${error.stderrOutput}`));
    } else if (cmd) {
      console.error(chalk.red(`  Error during command "${cmd}": ${error.message}`));
    }
    throw error;
  }
}

// Auxiliary function: display task status (for synchronous tasks)
function showTaskStatus(message, status = 'busy') {
  let symbol;
  let colorFunc = chalk.blue;

  switch (status) {
    case 'busy':
      symbol = '⏳';
      process.stdout.write(colorFunc(`${symbol} ${message}... `));
      break;
    case 'success':
      symbol = '✔';
      colorFunc = chalk.green;
      process.stdout.write(`\r${colorFunc(`${symbol} ${message}`)}\n`);
      break;
    case 'fail':
      symbol = '✖';
      colorFunc = chalk.red;
      process.stdout.write(`\r${colorFunc(`${symbol} ${message}`)}\n`);
      break;
  }
}

// Auxiliary function: display # filled progress bar
function displayHashProgressBar(current, total, taskDescription, barWidth = 30) {
  const currentSpinnerChar = globalSpinnerChars[overallProgressSpinnerIndex];
  overallProgressSpinnerIndex = (overallProgressSpinnerIndex + 1) % globalSpinnerChars.length;

  const percentage = total === 0 ? 1 : current / total;
  const filledCount = Math.floor(percentage * barWidth);
  const emptyCount = barWidth - filledCount;
  const filledBar = '#'.repeat(filledCount);
  const emptyBar = '-'.repeat(emptyCount);

  process.stdout.write('\r' + ' '.repeat(process.stdout.columns > 0 ? process.stdout.columns -1 : 50) + '\r');
  process.stdout.write(chalk.cyan(`${taskDescription} ${currentSpinnerChar} `) + `[${chalk.green(filledBar)}${chalk.gray(emptyBar)}] ${current}/${total} (${Math.floor(percentage * 100)}%)`);
  if (current === total && total > 0) {
    process.stdout.write('\n');
  } else if (total === 0 && current === 0) {
    process.stdout.write('\n');
  }
}

async function createProject(projectName, options) {
  const { template, features } = options;

  // Create Tauri project using runAsyncTaskWithSpinner
  const tauriCreateCommand = `curl -fsSL https://create.tauri.app/sh | sh -s -- -y ${projectName} --template ${template} --manager npm --identifier com.${projectName}.app`;
  await runAsyncTaskWithSpinner({
    cmd: 'bash',
    args: ['-c', tauriCreateCommand],
    initialMessage: chalk.blue('正在创建 Tauri 项目...'),
    successMessage: chalk.green('Tauri 项目创建成功!'),
    failureMessage: chalk.red('Tauri 项目创建失败.'),
  });

  const originalCwd = process.cwd();
  process.chdir(projectName);

  const dependencies = [];
  if (features.includes('rtk')) {
    dependencies.push('@reduxjs/toolkit', 'react-redux');
  }
  if (features.includes('router')) {
    dependencies.push('react-router-dom');
  }

  if (dependencies.length > 0) {
    await runAsyncTaskWithSpinner({
      cmd: 'npm',
      args: ['install', ...dependencies],
      initialMessage: chalk.blue('正在安装额外依赖...'),
      successMessage: chalk.green('额外依赖安装成功!'),
      failureMessage: chalk.red('额外依赖安装失败.'),
    });
  } else {
    console.log(chalk.yellow('没有额外的依赖需要安装。'));
  }

  const featureSetupTasks = [];
  if (features.includes('rtk')) {
    featureSetupTasks.push({ name: 'Redux Toolkit', task: () => setupRTK(template) });
  }
  if (features.includes('router')) {
    featureSetupTasks.push({ name: 'React Router', task: () => setupRouter(template) });
  }
  if (features.includes('eslint')) {
    featureSetupTasks.push({ name: 'ESLint', task: () => setupESLint(template) });
  }
  if (features.includes('api')) {
    featureSetupTasks.push({ name: 'API 示例', task: () => createApiExample(template) });
  }

  if (featureSetupTasks.length > 0) {
    console.log(chalk.magenta('\n开始配置项目功能:'));
    let completedTasks = 0;
    displayHashProgressBar(completedTasks, featureSetupTasks.length, '功能模块配置进度');

    for (const taskInfo of featureSetupTasks) {
      await runAsyncTaskWithSpinner({
        taskFn: taskInfo.task,
        initialMessage: chalk.blue(`  配置功能: ${taskInfo.name}`),
        successMessage: chalk.green(`  功能 ${taskInfo.name} 配置完成`),
        failureMessage: chalk.red(`  功能 ${taskInfo.name} 配置失败`),
      });
      completedTasks++;
      displayHashProgressBar(completedTasks, featureSetupTasks.length, '功能模块配置进度');
    }
    if (completedTasks === featureSetupTasks.length && completedTasks > 0) {
       console.log(chalk.green.bold('所有功能配置均已成功完成!'));
    }
  } else {
    console.log(chalk.yellow('\n没有选择额外的功能模块进行配置。'));
  }

  fs.appendFileSync('.gitignore', "\npackage-lock.json\nyarn.lock");
  process.chdir(originalCwd);
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
  const fileExtension = template === 'react-ts' ? 'ts' : 'js';
  await fs.outputFile(`src/api/index.${fileExtension}`, apiExample);

  // commands.rs 内容
  const commandsRsContent = `
#[tauri::command]
async fn fetch_data() -> Result<String, String> {
    // 这里添加你的业务逻辑
    Ok("Hello from Rust! From commands.rs".to_string())
}

pub fn handler() -> impl Fn(tauri::Invoke) {
    tauri::generate_handler![fetch_data]
}
`;
  // 始终写入新的 commands.rs 文件
  await fs.outputFile('src-tauri/src/commands.rs', commandsRsContent);

  // --- 开始处理 main.rs --- 
  const mainRsPath = 'src-tauri/src/main.rs';
  let mainRsContentOriginal;
  try {
    mainRsContentOriginal = await fs.readFile(mainRsPath, 'utf-8');
  } catch (e) {
    console.error(chalk.red(`Error reading ${mainRsPath}: ${e.message}`));
    console.log(chalk.yellow("Skipping main.rs modification for API handler due to read error."));
    return; // Cannot proceed if main.rs is unreadable
  }
  
  let mainRsContentModified = mainRsContentOriginal; // Work on a copy

  // 检测 main.rs 是否委托给库 (e.g., pdf_lib::run())
  const libRunPattern = /([a-zA-Z_][a-zA-Z0-9_]*)::run\(\)/;
  const hasLibRunCall = libRunPattern.test(mainRsContentOriginal);
  const mainDoesNotHaveBuilder = !mainRsContentOriginal.includes("tauri::Builder::default");
  
  // Debugging logs
  console.log(chalk.magentaBright(`[DEBUG] Checking for library delegation in main.rs:`));
  console.log(chalk.magentaBright(`  - main.rs content (first 100 chars): "${mainRsContentOriginal.substring(0,100).replace(/\n/g, "\\n")}"`));
  console.log(chalk.magentaBright(`  - Pattern '${libRunPattern.toString()}' test (hasLibRunCall): ${hasLibRunCall}`));
  console.log(chalk.magentaBright(`  - Does not include 'tauri::Builder::default' (mainDoesNotHaveBuilder): ${mainDoesNotHaveBuilder}`));

  const mainRsDelegatesToLib = hasLibRunCall && mainDoesNotHaveBuilder;
  console.log(chalk.magentaBright(`  - Calculated mainRsDelegatesToLib: ${mainRsDelegatesToLib}`));

  if (mainRsDelegatesToLib) {
    const libNameMatch = mainRsContentOriginal.match(libRunPattern);
    const libName = libNameMatch ? libNameMatch[1] : "your_library_module";

    console.log(chalk.yellowBright(`[INFO] Detected that 'src-tauri/src/main.rs' seems to use a library pattern (e.g., '${libName}::run()').`));
    console.log(chalk.yellowBright("       Automatic configuration of 'main.rs' for the API handler will be largely skipped."));
    console.log(chalk.magenta("       Please perform the following manual steps for API setup:"));
    console.log(chalk.cyan  ("       1. Ensure 'src-tauri/src/commands.rs' was created (it contains 'fetch_data' and 'handler')."));

    if (!mainRsContentOriginal.includes("mod commands;")) {
      mainRsContentModified = "mod commands;\n" + mainRsContentOriginal;
      await fs.outputFile(mainRsPath, mainRsContentModified);
      console.log(chalk.green("       + Automatically added 'mod commands;' to 'src-tauri/src/main.rs'. This is likely needed for 'crate::commands' in your lib."));
    } else {
      console.log(chalk.blue("       - 'mod commands;' already present in 'src-tauri/src/main.rs'."));
    }
    console.log(chalk.cyan  ("       2. In your Rust library file (e.g., 'src-tauri/src/lib.rs' or 'src-tauri/src/" + libName + ".rs'),"));
    console.log(chalk.cyan  ("          find your 'tauri::Builder::default()' chain."));
    console.log(chalk.cyan  ("       3. Add '.invoke_handler(crate::commands::handler())' to the builder chain."));
    console.log(chalk.gray(
`          Example (within your library's run() function):
          // ...
          tauri::Builder::default()
              .invoke_handler(crate::commands::handler()) // <-- ADD THIS LINE
              // ... other builder methods ...
              .run(tauri::generate_context!())
              // ...
`));
    return; // IMPORTANT: Exit early, no further main.rs mods for handler here
  }

  // ---- 如果不是委托给库的模式，则执行标准的 main.rs 修改逻辑 ----
  let successfullyConfiguredMainRs = false;

  // 确保 main.rs 顶部有 mod commands;
  if (!mainRsContentModified.includes("mod commands;")) {
    mainRsContentModified = "mod commands;\n" + mainRsContentModified;
  }

  const invokeHandlerRegex = /\.invoke_handler\(.*?\)/s;
  const newInvokeHandler = ".invoke_handler(commands::handler())";
  const builderDefaultRegex = /(tauri::Builder::default\(\))(\s*\.\s*)/;

  if (mainRsContentModified.includes("commands::handler()")) {
    console.log(chalk.blue("invoke_handler in main.rs already uses commands::handler()."));
    successfullyConfiguredMainRs = true; 
  } else if (invokeHandlerRegex.test(mainRsContentModified)) {
    mainRsContentModified = mainRsContentModified.replace(invokeHandlerRegex, newInvokeHandler);
    console.log(chalk.yellow("Replaced existing invoke_handler in main.rs with commands::handler(). Please verify."));
    successfullyConfiguredMainRs = true;
  } else if (builderDefaultRegex.test(mainRsContentModified)) {
    mainRsContentModified = mainRsContentModified.replace(
        builderDefaultRegex,
        `$1\n      ${newInvokeHandler}$2` 
    );
    console.log(chalk.yellow("Attempted to insert invoke_handler after tauri::Builder::default(). Please verify main.rs."));
    successfullyConfiguredMainRs = true;
  } else if (mainRsContentModified.includes(".run(tauri::generate_context!())")) {
    mainRsContentModified = mainRsContentModified.replace(".run(tauri::generate_context!())", `${newInvokeHandler}\n        .run(tauri::generate_context!())`);
    console.log(chalk.yellow("Added commands::handler() before .run() in main.rs. Please verify."));
    successfullyConfiguredMainRs = true;
  }

  if (mainRsContentModified !== mainRsContentOriginal) {
      await fs.outputFile(mainRsPath, mainRsContentModified);
  }

  if (!successfullyConfiguredMainRs) {
    // All automatic attempts for main.rs failed (and it wasn't a lib delegation case)
    console.log(chalk.red("Could not automatically configure invoke_handler in src-tauri/src/main.rs."));
    console.log(chalk.yellow("Please manually ensure your 'src-tauri/src/main.rs' includes 'mod commands;' at the top (if not already present)."));
    console.log(chalk.yellow("Then, ensure your tauri::Builder sequence calls '.invoke_handler(commands::handler())'."));
    console.log(chalk.yellow("Example structure:"));
    console.log(chalk.gray(
`// src-tauri/src/main.rs
mod commands;

fn main() {
  tauri::Builder::default()
    .invoke_handler(commands::handler()) // <--- Ensure this line
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`));
    if (mainRsContentModified !== mainRsContentOriginal && mainRsContentModified.includes("mod commands;\n") && !mainRsContentOriginal.includes("mod commands;")){
        console.log(chalk.yellow("Note: 'mod commands;' was added to main.rs, but full handler setup failed. Check main.rs and the instructions above."));
    } else if (mainRsContentModified === mainRsContentOriginal){
        // This means no modification was even attempted or deemed necessary before this final error.
        // This case might be rare if 'mod commands;' is always added if missing.
    }
  }
}

module.exports = {
  createProject
}; 