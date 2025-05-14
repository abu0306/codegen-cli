# CodeGen CLI

一个基于 Tauri 的 React 项目脚手架工具，支持创建进度检查、ESLint 检查、前后端调用样例、RTK 状态管理和路由模板。

## 功能特点

- 🚀 基于 Tauri 的桌面应用开发
- 📦 支持 React 和 TypeScript
- 🔄 Redux Toolkit 状态管理
- 🛣️ React Router 路由管理
- 📝 ESLint 代码规范检查
- 🔌 前后端调用示例
- 📊 创建进度检查

## 安装

```bash
npm install -g codegen-cli
```

## 使用方法

1. 创建新项目：

```bash
codegen create my-app
```

2. 选择项目模板和功能：

- 选择项目模板（React/React+TypeScript）
- 选择需要添加的功能：
  - Redux Toolkit 状态管理
  - React Router 路由
  - ESLint 配置
  - 前后端调用示例

3. 进入项目目录并安装依赖：

```bash
cd my-app
npm install
```

4. 启动开发服务器：

```bash
npm run tauri dev
```

## 项目结构

```
my-app/
├── src/
│   ├── api/          # 前后端调用示例
│   ├── pages/        # 页面组件
│   ├── routes/       # 路由配置
│   ├── store/        # Redux 状态管理
│   └── App.tsx       # 应用入口
├── src-tauri/        # Tauri 后端代码
├── .eslintrc.js      # ESLint 配置
└── package.json      # 项目配置
```

## 开发

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/codegen-cli.git
cd codegen-cli
```

2. 安装依赖：

```bash
npm install
```

3. 链接到全局：

```bash
npm link
```

## 许可证

ISC 