const fs = require("fs-extra");
const chalk = require("chalk");
const { spawn } = require("child_process");

async function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "pipe", ...opts });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function setupHuskyLintStaged() {
  if (!(await fs.pathExists(".git"))) {
    await runCmd("git", ["init"]);
  }

  // 1. 安装依赖
  await runCmd("npm", ["install", "-D", "husky", "lint-staged"]);

  // 2. 配置 package.json
  const pkgPath = "package.json";
  const pkg = await fs.readJson(pkgPath);
  pkg["lint-staged"] = {
    "*.{js,jsx,ts,tsx}": ["npm run lint:fix", "git add"],
  };
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts["prepare"]) {
    pkg.scripts["prepare"] = "husky install";
  }
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  await runCmd("npx", ["husky", "install"]);
  const preCommitPath = ".husky/pre-commit";
  const preCommitContent =
    '#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\nnpx lint-staged\n';
  await fs.outputFile(preCommitPath, preCommitContent);
  await runCmd("chmod", ["+x", preCommitPath]);

  console.log(chalk.green("husky + lint-staged 配置完成！"));
}

module.exports = {
  setupHuskyLintStaged,
};
