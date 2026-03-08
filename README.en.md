# vscode-ai-comment

AI-powered code comment generation plugin

## Introduction

vscode-ai-comment is a VS Code extension that leverages artificial intelligence to automatically generate comments for code. It supports multiple AI service providers, including OpenAI, Alibaba Cloud Qwen, and Baidu ERNIE Bot.

## Features

- **AI Comment Generation**: Select code or an entire file and generate intelligent comments with a single click
- **Multi-AI Provider Support**:
  - OpenAI (GPT series)
  - Alibaba Cloud Qwen
  - Baidu ERNIE Bot
- **Multiple Comment Styles**:
  - Concise Mode: Generates brief function/code descriptions
  - Detailed Mode: Generates complete documentation-style comments
- **Visual Configuration**: Configure AI services and parameters via a Webview interface
- **Multi-Language Support**: Supports multiple programming languages including JavaScript, TypeScript, Python, Java, and more

## Project Structure

```
vscode-ai-comment/
├── packages/
│   ├── extension/       # VS Code extension core code
│   │   ├── src/
│   │   │   ├── api/     # AI service interfaces (OpenAI, Qwen, Baidu)
│   │   │   ├── commands/ # VS Code command implementations
│   │   │   ├── config/  # Configuration management
│   │   │   └── ui/      # Webview UI
│   │   └── dist/        # Compiled JavaScript
│   ├── shared/          # Shared utilities and type definitions
│   │   └── src/
│   │       ├── comment-style/  # Comment templates
│   │       ├── prompt/         # AI prompt construction
│   │       └── utils/          # Utility functions
│   └── ui/              # Vue 3 configuration interface
│       └── src/
│           ├── components/     # Vue components
│           └── composables/    # Composition functions
└── pnpm-workspace.yaml  # pnpm workspace configuration
```

## Installation

### Prerequisites

- Node.js (v18+)
- pnpm
- VS Code

### Development Environment Setup

```bash
# Clone the project
git clone https://gitee.com/qkkk6088/vscode-ai-comment.git
cd vscode-ai-comment

# Install dependencies
pnpm install

# Build shared package
cd packages/shared
pnpm build

# Build UI
cd packages/ui
pnpm build

# Start extension debugging
cd packages/extension
pnpm dev
```

## Usage

### Configure AI Service

1. Open the VS Code command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type `AI Comment: Open Config` to open the configuration panel
3. Select your AI service provider and enter your API key

### Generate Comments

- **Selected Code**: Select code, right-click, and choose `AI Comment: Generate Selected`, or use the keyboard shortcut
- **Entire File**: Open the command palette and select `AI Comment: Generate Whole File`

### Configuration Options

Configure the following settings in VS Code settings or via the configuration panel:

- `ai-comment.provider`: AI service provider
- `ai-comment.apiKey`: API key
- `ai-comment.model`: Model to use
- `ai-comment.commentStyle`: Comment style (concise/detailed)

## Technology Stack

- **Extension Core**: TypeScript + VS Code Extension API
- **Configuration UI**: Vue 3 + TypeScript + Vite
- **AI Services**: OpenAI API / Alibaba Cloud Qwen API / Baidu ERNIE Bot API
- **Package Manager**: pnpm (workspace)

## License

MIT License