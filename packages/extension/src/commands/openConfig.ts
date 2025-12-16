import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getExtensionConfig } from '../config/config';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

export function openConfigPanel(context: vscode.ExtensionContext) {
  const column = vscode.window.activeTextEditor
    ? vscode.ViewColumn.Two
    : vscode.ViewColumn.One;

  if (currentPanel) {
    currentPanel.reveal(column);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'aiCommentConfig',
    'AI Comment Settings',
    column,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, 'dist', 'ui'))
      ],
      retainContextWhenHidden: true
    }
  );

  currentPanel.webview.html = getWebviewContent(currentPanel.webview, context);

  currentPanel.onDidDispose(() => { currentPanel = undefined; }, null, context.subscriptions);

  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'loadConfig':
          currentPanel?.webview.postMessage(getExtensionConfig());
          break;
        case 'saveConfig':
          await saveConfiguration(message.config);
          vscode.window.showInformationMessage('AI Comment Configuration Saved!');
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}

async function saveConfiguration(newConfig: any) {
  const config = vscode.workspace.getConfiguration('aiComment');
  const keys = [
    'apiKey', 'model', 'commentStyle', 'commentMode', 'targetLanguage', 'aiProvider',
    'openaiApiKey', 'openaiModel', 'openaiEndpoint',
    'qwenApiKey', 'qwenModel', 'qwenEndpoint',
    'baiduApiKey', 'baiduSecretKey', 'baiduModel',
    'xunfeiAppId', 'xunfeiApiKey', 'xunfeiApiSecret'
  ];
  for (const key of keys) {
    if (newConfig[key] !== undefined) {
      await config.update(key, newConfig[key], vscode.ConfigurationTarget.Global);
    }
  }
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const uiDistPath = path.join(context.extensionPath, 'dist', 'ui');
  const indexPath = path.join(uiDistPath, 'index.html');

  let html = '';
  try {
    html = fs.readFileSync(indexPath, 'utf-8');
  } catch (err) {
    console.error('Failed to load index.html', err);
    return `<h3>Error: Could not load UI</h3><p>Path: ${indexPath}</p><p>Please run 'pnpm -r build'</p>`;
  }

  const assetsUri = webview.asWebviewUri(vscode.Uri.file(path.join(uiDistPath, 'assets')));
  
  // 1. 替换资源路径 (兼容 ./ 和 /)
  html = html.replace(/(src|href)="(?:\.\/|\/)?assets\//g, `$1="${assetsUri}/`);
  html = html.replace(/(src|href)="(?:\.\/|\/)?vite.svg"/g, `$1="${webview.asWebviewUri(vscode.Uri.file(path.join(uiDistPath, 'vite.svg')))}"`);

  // 2. 注入 VS Code API (关键修复)
  // 这段脚本将 acquireVsCodeApi 挂载到 window.vscode 上，供 Vue Store 使用
  const vscodeScript = `
    <script>
      (function() {
        if (!window.vscode) {
          try {
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
            console.log('VS Code API acquired');
          } catch (e) {
            console.error('Failed to acquire VS Code API:', e);
          }
        }
      })();
    </script>
  `;
  // 插入到 body 最前面，确保在 app 运行前就绪
  html = html.replace('<body>', `<body>${vscodeScript}`);

  // 3. 注入 CSP
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:;">`;
  html = html.replace('<head>', `<head>${csp}`);

  return html;
}