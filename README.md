

# vscode-ai-comment

AI 智能代码注释生成插件

## 简介

vscode-ai-comment 是一款 VS Code 扩展插件，利用人工智能技术为代码自动生成注释。支持多种 AI 服务提供商，包括 OpenAI、阿里云 Qwen 和百度文心一言。

## 功能特性

- **AI 注释生成**：选中代码或整个文件，一键生成智能注释
- **多 AI 提供商支持**：
  - OpenAI (GPT 系列)
  - 阿里云 Qwen
  - 百度文心一言
- **多种注释风格**：
  - 简洁模式：生成简短的函数/代码说明
  - 详细模式：生成完整的文档注释
- **可视化配置**：通过 Webview 界面配置 AI 服务和参数
- **多语言支持**：支持 JavaScript、TypeScript、Python、Java 等多种编程语言

## 项目结构

```
vscode-ai-comment/
├── packages/
│   ├── extension/       # VS Code 扩展核心代码
│   │   ├── src/
│   │   │   ├── api/     # AI 服务接口 (OpenAI, Qwen, Baidu)
│   │   │   ├── commands/ # VS Code 命令实现
│   │   │   ├── config/  # 配置管理
│   │   │   └── ui/     # Webview UI
│   │   └── dist/       # 编译后的 JavaScript
│   ├── shared/         # 共享工具和类型定义
│   │   └── src/
│   │       ├── comment-style/  # 注释模板
│   │       ├── prompt/          # AI 提示词构建
│   │       └── utils/           # 工具函数
│   └── ui/             # Vue 3 配置界面
│       └── src/
│           ├── components/     # Vue 组件
│           └── composables/    # 组合式函数
└── pnpm-workspace.yaml  # pnpm 工作区配置
```

## 安装

### 前置要求

- Node.js (v18+)
- pnpm
- VS Code

### 开发环境安装

```bash
# 克隆项目
git clone https://gitee.com/qkkk6088/vscode-ai-comment.git
cd vscode-ai-comment

# 安装依赖
pnpm install

# 构建共享包
cd packages/shared
pnpm build

# 构建 UI
cd packages/ui
pnpm build

# 启动扩展调试
cd packages/extension
pnpm dev
```

## 使用方法

### 配置 AI 服务

1. 打开 VS Code 命令面板 (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. 输入 `AI Comment: Open Config` 打开配置面板
3. 选择 AI 服务提供商并填写 API Key

### 生成注释

- **选中代码注释**：选中代码后右键选择 `AI Comment: Generate Selected` 或使用快捷键
- **整个文件注释**：打开命令面板，选择 `AI Comment: Generate Whole File`

### 配置选项

在 VS Code 设置中或通过配置面板进行以下设置：

- `ai-comment.provider`: AI 服务提供商
- `ai-comment.apiKey`: API 密钥
- `ai-comment.model`: 使用的模型
- `ai-comment.commentStyle`: 注释风格 (concise/detailed)

## 技术栈

- **扩展核心**: TypeScript + VS Code Extension API
- **配置界面**: Vue 3 + TypeScript + Vite
- **AI 服务**: OpenAI API / 阿里云 Qwen API / 百度文心一言 API
- **包管理**: pnpm (工作区)

## 许可证

MIT License