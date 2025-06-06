const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const { checkProgress } = require("../utils/checkProgress");
const { setupESLint } = require("../utils/eslint");
const { setupRTK } = require("../templates/rtk");
const { setupRouter } = require("../templates/router");
const { setupHuskyLintStaged } = require("../utils/husky");
const { setupZustand } = require("../templates/zustand");
const inquirer = require("inquirer");

const globalSpinnerChars = ["-", "\\", "|", "/"];
let overallProgressSpinnerIndex = 0;

async function runAsyncTaskWithSpinner({
  taskFn,
  cmd,
  args,
  initialMessage,
  successMessage,
  failureMessage,
}) {
  const spinnerChars = ["-", "\\", "|", "/"];
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
        const child = spawn(cmd, args, { stdio: "pipe" });
        let stderrData = "";
        if (child.stderr) {
          child.stderr.on("data", (data) => (stderrData += data.toString()));
        }
        child.on("close", (code) => {
          if (
            code === 0 ||
            (cmd === "npm" && args[0] === "run" && args[1] === "lint:fix")
          ) {
            resolve();
          } else {
            const err = new Error(
              `Command "${cmd} ${args.join(
                " "
              )}" failed with code ${code}. Stderr: ${stderrData.trim()}`
            );
            err.stderrOutput = stderrData.trim();
            reject(err);
          }
        });
        child.on("error", (err) => {
          reject(err);
        });
      });
    } else {
      throw new Error(
        "Either taskFn or cmd/args must be provided to runAsyncTaskWithSpinner"
      );
    }
    clearInterval(intervalId);
    process.stdout.write(`\r${chalk.green("✔")} ${successMessage}\n`);
  } catch (error) {
    clearInterval(intervalId);
    process.stdout.write(`\r${chalk.red("✖")} ${failureMessage}\n`);
    if (error.stderrOutput) {
      console.error(chalk.red(`  Error details: ${error.stderrOutput}`));
    } else if (cmd) {
      console.error(
        chalk.red(`  Error during command "${cmd}": ${error.message}`)
      );
    }
    throw error;
  }
}

function showTaskStatus(message, status = "busy") {
  let symbol;
  let colorFunc = chalk.blue;

  switch (status) {
    case "busy":
      symbol = "⏳";
      process.stdout.write(colorFunc(`${symbol} ${message}... `));
      break;
    case "success":
      symbol = "✔";
      colorFunc = chalk.green;
      process.stdout.write(`\r${colorFunc(`${symbol} ${message}`)}\n`);
      break;
    case "fail":
      symbol = "✖";
      colorFunc = chalk.red;
      process.stdout.write(`\r${colorFunc(`${symbol} ${message}`)}\n`);
      break;
  }
}

function displayHashProgressBar(
  current,
  total,
  taskDescription,
  barWidth = 30
) {
  const currentSpinnerChar = globalSpinnerChars[overallProgressSpinnerIndex];
  overallProgressSpinnerIndex =
    (overallProgressSpinnerIndex + 1) % globalSpinnerChars.length;

  const percentage = total === 0 ? 1 : current / total;
  const filledCount = Math.floor(percentage * barWidth);
  const emptyCount = barWidth - filledCount;
  const filledBar = "#".repeat(filledCount);
  const emptyBar = "-".repeat(emptyCount);

  process.stdout.write(
    "\r" +
      " ".repeat(process.stdout.columns > 0 ? process.stdout.columns - 1 : 50) +
      "\r"
  );
  process.stdout.write(
    chalk.cyan(`${taskDescription} ${currentSpinnerChar} `) +
      `[${chalk.green(filledBar)}${chalk.gray(
        emptyBar
      )}] ${current}/${total} (${Math.floor(percentage * 100)}%)`
  );
  if (current === total && total > 0) {
    process.stdout.write("\n");
  } else if (total === 0 && current === 0) {
    process.stdout.write("\n");
  }
}

async function setupPathAliases(template) {
  const isTypeScript = template === 'react-ts';
  
  const viteConfigPath = `vite.config.${isTypeScript ? 'ts' : 'js'}`;
  let viteConfig = '';
  try {
    viteConfig = await fs.readFile(viteConfigPath, 'utf-8');
  } catch (e) {
    console.warn(chalk.yellow(`警告: 无法读取 ${viteConfigPath}，跳过 Vite 别名配置`));
  }

  if (viteConfig && !viteConfig.includes('resolve:') || !viteConfig.includes('alias:')) {
    const aliasConfig = `  resolve: {
    alias: {
      '@': '/src',
    },
  },`;

    if (viteConfig.includes('defineConfig(')) {
      const isAsyncConfig = viteConfig.includes('defineConfig(async');
      
      if (isAsyncConfig) {
        const configRegex = /defineConfig\(async\s*\([^)]*\)\s*=>\s*\(\{([\s\S]*?)\}\)\)/;
        const match = viteConfig.match(configRegex);
        
        if (match) {
          const configContent = match[1];
          let newConfig = configContent;

          if (configContent.includes('plugins:')) {
            const pluginsEndIndex = configContent.indexOf('],');
            if (pluginsEndIndex !== -1) {
              newConfig = configContent.slice(0, pluginsEndIndex + 2) + '\n' + aliasConfig + configContent.slice(pluginsEndIndex + 2);
            }
          } else {
            newConfig = configContent + '\n' + aliasConfig;
          }

          viteConfig = viteConfig.replace(configRegex, `defineConfig(async () => ({${newConfig}}))`);
        }
      } else {
        const configRegex = /defineConfig\(\{([\s\S]*?)\}\)/;
        const match = viteConfig.match(configRegex);
        
        if (match) {
          const configContent = match[1];
          let newConfig = configContent;

          if (configContent.includes('plugins:')) {
            const pluginsEndIndex = configContent.indexOf('],');
            if (pluginsEndIndex !== -1) {
              newConfig = configContent.slice(0, pluginsEndIndex + 2) + '\n' + aliasConfig + configContent.slice(pluginsEndIndex + 2);
            }
          } else {
            newConfig = configContent + '\n' + aliasConfig;
          }

          viteConfig = viteConfig.replace(configRegex, `defineConfig({${newConfig}})`);
        }
      }
      
      try {
        await fs.writeFile(viteConfigPath, viteConfig);
        console.log(chalk.green(`✓ 已更新 ${viteConfigPath} 的路径别名配置`));
      } catch (e) {
        console.warn(chalk.yellow(`警告: 无法写入 ${viteConfigPath}，跳过 Vite 别名配置`));
      }
    }
  } else {
    console.log(chalk.blue(`✓ ${viteConfigPath} 已包含路径别名配置`));
  }

  if (isTypeScript) {
    const tsconfigPath = 'tsconfig.json';
    let tsconfig = {};
    
    try {
      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf-8');
      tsconfig = JSON.parse(tsconfigContent);
    } catch (e) {
      console.warn(chalk.yellow(`警告: 无法读取 ${tsconfigPath}，将创建新的配置`));
      tsconfig = {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }]
      };
    }

    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    
    tsconfig.compilerOptions.baseUrl = '.';
    tsconfig.compilerOptions.paths = {
      '@/*': ['src/*']
    };

    try {
      await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log(chalk.green(`✓ 已更新 ${tsconfigPath} 的路径别名配置`));
    } catch (e) {
      console.warn(chalk.yellow(`警告: 无法写入 ${tsconfigPath}，跳过 TypeScript 路径配置`));
    }
  }
}

async function createProject(projectName, options) {
  const { template, features } = options;

  const targetDir = path.resolve(projectName);
  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      console.log(
        chalk.red(`\n目录 "${projectName}" 已存在且非空，无法创建项目。`)
      );
      throw new Error("目标目录非空，操作已取消。");
    }
  }

  const tauriCreateCommand = `curl -fsSL https://create.tauri.app/sh | sh -s -- -y ${projectName} --template ${template} --manager npm --identifier com.${projectName}.app`;
  await runAsyncTaskWithSpinner({
    cmd: "bash",
    args: ["-c", tauriCreateCommand],
    initialMessage: chalk.blue("正在创建 Tauri 项目..."),
    successMessage: chalk.green("Tauri 项目创建成功!"),
    failureMessage: chalk.red("Tauri 项目创建失败."),
  });

  const originalCwd = process.cwd();
  process.chdir(projectName);

  await runAsyncTaskWithSpinner({
    taskFn: setupHuskyLintStaged,
    initialMessage: chalk.blue("正在配置 husky + lint-staged..."),
    successMessage: chalk.green("husky + lint-staged 配置完成!"),
    failureMessage: chalk.red("husky + lint-staged 配置失败."),
  });

  const dependencies = [];
  if (features.includes("rtk")) {
    dependencies.push("@reduxjs/toolkit", "react-redux");
    await setupRTK(template);
  }
  if (features.includes("zustand")) {
    dependencies.push("zustand");
    await setupZustand(template);
  }
  if (features.includes("router")) {
    dependencies.push("react-router-dom");
  }

  const featureSetupTasks = [];
  if (features.includes("router")) {
    featureSetupTasks.push({
      name: "React Router",
      task: () => setupRouter(template),
    });
  }
  if (features.includes("eslint")) {
    featureSetupTasks.push({
      name: "ESLint",
      task: () => setupESLint(template),
    });
  }
  if (features.includes("api")) {
    featureSetupTasks.push({
      name: "API 示例",
      task: () => createApiExample(template),
    });
  }

  featureSetupTasks.push({
    name: "路径别名",
    task: () => setupPathAliases(template),
  });

  if (featureSetupTasks.length > 0) {
    console.log(chalk.magenta("\n开始配置项目功能:"));
    let completedTasks = 0;
    displayHashProgressBar(
      completedTasks,
      featureSetupTasks.length,
      "功能模块配置进度"
    );

    for (const taskInfo of featureSetupTasks) {
      await runAsyncTaskWithSpinner({
        taskFn: taskInfo.task,
        initialMessage: chalk.blue(`  配置功能: ${taskInfo.name}`),
        successMessage: chalk.green(`  功能 ${taskInfo.name} 配置完成`),
        failureMessage: chalk.red(`  功能 ${taskInfo.name} 配置失败`),
      });
      completedTasks++;
      displayHashProgressBar(
        completedTasks,
        featureSetupTasks.length,
        "功能模块配置进度"
      );
    }
    if (completedTasks === featureSetupTasks.length && completedTasks > 0) {
      console.log(chalk.green.bold("所有功能配置均已成功完成!"));
    }

    if (dependencies.length > 0) {
      await runAsyncTaskWithSpinner({
        cmd: "npm",
        args: ["install", ...dependencies],
        initialMessage: chalk.blue("正在安装额外依赖..."),
        successMessage: chalk.green("额外依赖安装成功!"),
        failureMessage: chalk.red("额外依赖安装失败."),
      });

      await runAsyncTaskWithSpinner({
        cmd: "npm",
        args: ["run", "lint:fix"],
        initialMessage: chalk.blue("正在执行 lint:fix..."),
        successMessage: chalk.green("lint:fix 执行成功!"),
        failureMessage: chalk.red("lint:fix 执行失败."),
      });
    } else {
      console.log(chalk.yellow("没有额外的依赖需要安装。"));
    }
  } else {
    console.log(chalk.yellow("\n没有选择额外的功能模块进行配置。"));
  }

  fs.appendFileSync(".gitignore", "\npackage-lock.json\nyarn.lock");

  process.chdir("src-tauri");
  await runAsyncTaskWithSpinner({
    cmd: "cargo",
    args: ["fmt"],
    initialMessage: chalk.blue("正在格式化 Rust 代码..."),
    successMessage: chalk.green("Rust 代码格式化成功!"),
    failureMessage: chalk.red("Rust 代码格式化失败."),
  });

  process.chdir(originalCwd);
  await checkProgress(projectName, features);
}

async function createApiExample(template) {
  const apiExample = `
import { invoke } from '@tauri-apps/api/core';

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

  const sseUtilContent =
    template === "react-ts"
      ? `
import { Channel, invoke } from '@tauri-apps/api/core';

interface SseOptions {
  path: string;
  headers: Record<string, string>;
  body: string;
  onMessage: (msg: string) => void;
}

export async function sseRequest({ path, headers, body, onMessage }: SseOptions): Promise<void> {
  const onEvent = new Channel<Uint8Array>();
  const decoder = new TextDecoder('utf-8');
  onEvent.onmessage = value => {
    let bytes: Uint8Array;
    if (value instanceof Uint8Array) {
      bytes = value;
    } else if (typeof value === 'string') {
      bytes = new TextEncoder().encode(value);
    } else {
      bytes = new Uint8Array(Object.values(value));
    }
    const text = decoder.decode(bytes);
    const lines = text.split(String.fromCharCode(10));
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const message = line.slice(6);
        if (message.trim()) {
          onMessage(message);
        }
      }
    }
  };

  await invoke<string>('stream', {
    request: {
      path,
      method: 'POST',
      headers,
      body,
    },
    onEvent,
  });
}
`
      : `
import { Channel, invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} SseOptions
 * @property {string} path - The SSE endpoint path
 * @property {Object.<string, string>} headers - Request headers
 * @property {string} body - Request body
 * @property {function(string): void} onMessage - Callback for SSE messages
 */

/**
 * Makes an SSE request to the specified endpoint
 * @param {SseOptions} options - The SSE request options
 */
export async function sseRequest({ path, headers, body, onMessage }) {
    const onEvent = new Channel();
    const decoder = new TextDecoder('utf-8');
    onEvent.onmessage = (value) => {
        let bytes;
        if (value instanceof Uint8Array) {
            bytes = value;
        } else if (typeof value === 'string') {
            bytes = new TextEncoder().encode(value);
        } else {
            bytes = new Uint8Array(Object.values(value));
        }
        const text = decoder.decode(bytes);
        const lines = text.split(String.fromCharCode(10));
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const message = line.slice(6);
                if (message.trim()) {
                    onMessage(message);
                }
            }
        }
    };

    await invoke('stream', {
        request: {
            path,
            method: 'POST',
            headers,
            body,
        },
        onEvent,
    });
}
`;

  const sseExampleContent =
    template === "react-ts"
      ? `
import { sseRequest } from '../utils/sseRequest';

export async function startSseStream() {
    try {
        await sseRequest({
            path: '/api/stream',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: 'example' }),
            onMessage: (message) => {
                console.log('Received SSE message:', message);
            },
        });
    } catch (error) {
        console.error('Error in SSE stream:', error);
        throw error;
    }
}
`
      : `
import { sseRequest } from '../utils/sseRequest';

export async function startSseStream() {
    try {
        await sseRequest({
            path: '/api/stream',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: 'example' }),
            onMessage: (message) => {
                console.log('Received SSE message:', message);
            },
        });
    } catch (error) {
        console.error('Error in SSE stream:', error);
        throw error;
    }
}
`;

  const fileExtension = template === "react-ts" ? "ts" : "js";
  await fs.outputFile(`src/api/index.${fileExtension}`, apiExample);
  await fs.outputFile(`src/utils/sseRequest.${fileExtension}`, sseUtilContent);
  await fs.outputFile(`src/api/sseExample.${fileExtension}`, sseExampleContent);

  const pkgJsonPath = path.resolve("package.json");

  let pkgJson = {};
  if (await fs.pathExists(pkgJsonPath)) {
    console.log(chalk.blue("正在读取 package.json..."));

    pkgJson = await fs.readJson(pkgJsonPath);

    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

    // 2. 检查 @tauri-apps/api 是否存在
    if (!deps["@tauri-apps/api"]) {
      console.log(chalk.blue("正在安装 @tauri-apps/api..."));
      await runAsyncTaskWithSpinner({
        cmd: "npm",
        args: ["install", "@tauri-apps/api"],
        initialMessage: chalk.blue("安装 @tauri-apps/api..."),
        successMessage: chalk.green("@tauri-apps/api 安装成功!"),
        failureMessage: chalk.red("@tauri-apps/api 安装失败!"),
      });
    }
  }

  const commandsRsContent = `
use std::collections::HashMap;
use tauri::ipc::Channel;

#[tauri::command]
pub async fn fetch_data() -> Result<String, String> {
    // 这里添加你的业务逻辑
    Ok("Hello from Rust! From commands.rs".to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct HttpRequest<T> {
    path: String,
    method: String,
    body: Option<T>,
    headers: HashMap<String, String>,
}

#[tauri::command]
pub async fn stream(
    request: HttpRequest<String>,
    on_event: Channel<Vec<u8>>,
) -> Result<(), String> {
    // 输出请求内容
    println!("Request path: {}", request.path);
    println!("Request method: {}", request.method);
    println!("Request headers: {:?}", request.headers);
    if let Some(body) = request.body {
        println!("Request body: {}", body);
    }

    // Mock 数据流
    for i in 0..5 {
        let message = format!("data: Mock message {}", i);
        on_event
            .send(message.into_bytes())
            .map_err(|e| e.to_string())?;
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    Ok(())
}
`;
  await fs.outputFile("src-tauri/src/commands.rs", commandsRsContent);

  const mainRsPath = "src-tauri/src/main.rs";
  let mainRsContentOriginal;
  try {
    mainRsContentOriginal = await fs.readFile(mainRsPath, "utf-8");
  } catch (e) {
    console.error(chalk.red(`Error reading ${mainRsPath}: ${e.message}`));
    console.log(
      chalk.yellow(
        "Skipping main.rs modification for API handler due to read error."
      )
    );
    return;
  }
  let mainRsContentModified = mainRsContentOriginal;

  const libRunPattern = /([a-zA-Z_][a-zA-Z0-9_]*)::run\(\)/;
  const hasLibRunCall = libRunPattern.test(mainRsContentOriginal);
  const mainDoesNotHaveBuilder = !mainRsContentOriginal.includes(
    "tauri::Builder::default"
  );
  const mainRsDelegatesToLib = hasLibRunCall && mainDoesNotHaveBuilder;

  if (mainRsDelegatesToLib) {
    await patchLibRsForApiHandler();
    return;
  }

  let successfullyConfiguredMainRs = false;
  if (!mainRsContentModified.includes("mod commands;")) {
    mainRsContentModified = "mod commands;\n" + mainRsContentModified;
  }
  const invokeHandlerRegex = /\.invoke_handler\(.*?\)/s;
  const newInvokeHandler = ".invoke_handler(commands::handler())";
  const builderDefaultRegex = /(tauri::Builder::default\(\))(\s*\.\s*)/;

  if (mainRsContentModified.includes("commands::handler()")) {
    console.log(
      chalk.blue("invoke_handler in main.rs already uses commands::handler().")
    );
    successfullyConfiguredMainRs = true;
  } else if (invokeHandlerRegex.test(mainRsContentModified)) {
    mainRsContentModified = mainRsContentModified.replace(
      invokeHandlerRegex,
      newInvokeHandler
    );
    console.log(
      chalk.yellow(
        "Replaced existing invoke_handler in main.rs with commands::handler(). Please verify."
      )
    );
    successfullyConfiguredMainRs = true;
  } else if (builderDefaultRegex.test(mainRsContentModified)) {
    mainRsContentModified = mainRsContentModified.replace(
      builderDefaultRegex,
      `$1\n      ${newInvokeHandler}$2`
    );
    console.log(
      chalk.yellow(
        "Attempted to insert invoke_handler after tauri::Builder::default(). Please verify main.rs."
      )
    );
    successfullyConfiguredMainRs = true;
  } else if (
    mainRsContentModified.includes(".run(tauri::generate_context!())")
  ) {
    mainRsContentModified = mainRsContentModified.replace(
      ".run(tauri::generate_context!())",
      `${newInvokeHandler}\n        .run(tauri::generate_context!())`
    );
    console.log(
      chalk.yellow(
        "Added commands::handler() before .run() in main.rs. Please verify."
      )
    );
    successfullyConfiguredMainRs = true;
  }

  if (mainRsContentModified !== mainRsContentOriginal) {
    await fs.outputFile(mainRsPath, mainRsContentModified);
  }

  if (!successfullyConfiguredMainRs) {
    console.log(
      chalk.red(
        "Could not automatically configure invoke_handler in src-tauri/src/main.rs."
      )
    );
    console.log(
      chalk.yellow(
        "Please manually ensure your 'src-tauri/src/main.rs' includes 'mod commands;' at the top (if not already present)."
      )
    );
    console.log(
      chalk.yellow(
        "Then, ensure your tauri::Builder sequence calls '.invoke_handler(commands::handler())'."
      )
    );
    console.log(chalk.yellow("Example structure:"));
    console.log(
      chalk.gray(
        `// src-tauri/src/main.rs
mod commands;

fn main() {
  tauri::Builder::default()
    .invoke_handler(commands::handler())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`
      )
    );
  }
}

async function patchLibRsForApiHandler(libName = "lib") {
  const libRsPath = `src-tauri/src/${libName}.rs`;
  let libContent;
  try {
    libContent = await fs.readFile(libRsPath, "utf-8");
  } catch (e) {
    console.error(chalk.red(`Error reading ${libRsPath}: ${e.message}`));
    return;
  }
  if (!libContent.includes("mod commands;")) {
    libContent = "mod commands;\n" + libContent;
    console.log(chalk.green("Added 'mod commands;' to lib.rs"));
  }

  const invokeHandlerBlockPattern = /\.invoke_handler\(([\s\S]*?)\)/m;
  const handlerPattern = /(tauri::generate_handler!\[)([\s\S]*?)\]/g;

  const match = libContent.match(invokeHandlerBlockPattern);
  if (match) {
    const inner = match[1];
    if (inner.includes("#[cfg(")) {
      const replaced = inner.replace(handlerPattern, (m, prefix, list) => {
        if (list.includes("commands::fetch_data")) return m;
        const trimmed = list.trim().replace(/,\s*$/, "");
        const newList = trimmed
          ? `${trimmed}, commands::fetch_data, commands::stream`
          : "commands::fetch_data, commands::stream";
        return `${prefix}${newList}]`;
      });
      libContent = libContent.replace(
        invokeHandlerBlockPattern,
        `.invoke_handler(${replaced})`
      );
      console.log(
        chalk.green(
          "Patched multi-platform invoke_handler in lib.rs to include commands::fetch_data"
        )
      );
    } else {
      const handlerMatch = inner.match(
        /tauri::generate_handler!\[([\s\S]*?)\]/m
      );
      const handlerList = handlerMatch
        ? handlerMatch[1].trim().replace(/,\s*$/, "")
        : "";
      const newHandlerList = handlerList.includes("commands::fetch_data")
        ? handlerList
        : handlerList
        ? `${handlerList}, commands::fetch_data, commands::stream`
        : "commands::fetch_data, commands::stream";
      const multiPlatformBlock = [
        ".invoke_handler(",
        '            #[cfg(not(target_os = "windows"))]',
        `            tauri::generate_handler![${newHandlerList}],`,
        '            #[cfg(target_os = "windows")]',
        `            tauri::generate_handler![${newHandlerList}]`,
        "        )",
      ].join("\n");
      libContent = libContent.replace(
        invokeHandlerBlockPattern,
        multiPlatformBlock
      );
      console.log(
        chalk.green(
          "Converted to multi-platform invoke_handler and included commands::fetch_data"
        )
      );
    }
  } else {
    console.log(
      chalk.yellow("No invoke_handler found in lib.rs, please check manually.")
    );
  }
  await fs.writeFile(libRsPath, libContent);
}

module.exports = {
  createProject,
};
