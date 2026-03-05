import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIServiceProvider } from '../api/types';

let panel: vscode.WebviewPanel | undefined;

export function openConfigPanel(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'aiCommentConfig',
    'AI Comment 设置',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      // 允许 Webview 访问 ui/dist 目录下的资源
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'ui-dist')
      ]
    }
  );

  panel.webview.html = getWebviewHtml(panel.webview, context);

  // 接收 Vue 页面发来的消息
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'saveConfig': {
          const config = vscode.workspace.getConfiguration('aiComment');
          for (const key of Object.keys(message.data)) {
            await config.update(key, message.data[key], vscode.ConfigurationTarget.Global);
          }
          vscode.window.showInformationMessage('AI Comment: 配置已保存！');
          break;
        }
        case 'getConfig': {
          // Vue 页面请求当前配置
          const config = vscode.workspace.getConfiguration('aiComment');
          panel?.webview.postMessage({
            command: 'loadConfig',
            data: {
              apiKey: config.get('apiKey', ''),
              model: config.get('model', 'gpt-3.5-turbo'),
              commentStyle: config.get('commentStyle', 'default'),
              targetLanguage: config.get('targetLanguage', 'auto'),
              aiProvider: config.get('aiProvider', AIServiceProvider.OpenAI),
              commentMode: config.get('commentMode', 'concise'),
              openaiEndpoint: config.get('openaiEndpoint', ''),
              qwenApiKey: config.get('qwenApiKey', ''),
              qwenModel: config.get('qwenModel', 'qwen-turbo'),
              qwenEndpoint: config.get('qwenEndpoint', ''),
              baiduApiKey: config.get('baiduApiKey', ''),
              baiduSecretKey: config.get('baiduSecretKey', ''),
              baiduModel: config.get('baiduModel', 'ernie-4.0'),
            }
          });
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}

function getWebviewHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  // ui build 产物放在 extension 包根目录的 ui-dist 文件夹下
  const distPath = vscode.Uri.joinPath(context.extensionUri, 'ui-dist');
  const htmlPath = path.join(distPath.fsPath, 'index.html');

  let html = fs.readFileSync(htmlPath, 'utf-8');

  // 将 HTML 中的资源路径替换为 Webview 可访问的 vscode-resource URI
  const distWebviewUri = webview.asWebviewUri(distPath).toString();
  html = html.replace(/(src|href)="\.?\/(assets\/[^"]+)"/g, `$1="${distWebviewUri}/$2"`);

  return html;
}