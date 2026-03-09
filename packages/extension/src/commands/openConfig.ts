import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  getBaseConfig,
  getAllSecrets,
  SECRET_KEYS,
  setSecret,
  setBaseConfig, // 请确保 config.ts 中导出了这个函数
} from '../config/config';

let panel: vscode.WebviewPanel | undefined;

export function openConfigPanel(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    return;
  }

  const uiDistUri = vscode.Uri.joinPath(context.extensionUri, 'ui-dist');

  panel = vscode.window.createWebviewPanel(
    'aiCommentConfig',
    'AI Comment 设置',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [uiDistUri]
    }
  );

  panel.webview.html = getWebviewHtml(panel.webview, uiDistUri);

  // 关键修改：处理来自前端的消息
  panel.webview.onDidReceiveMessage(
    async (message) => {
      console.log(`[openConfig] received message: ${message.command}`);
      
      switch (message.command) {
        case 'getConfig': {
          const [base, secrets] = await Promise.all([
            getBaseConfig(),
            getAllSecrets(),
          ]);
          panel?.webview.postMessage({
            command: 'loadConfig',
            data: { ...base, ...secrets }
          });
          break;
        }

        case 'saveConfig': {
          // 这里是修复的核心：处理保存逻辑
          const newConfig = message.data;
          console.log('[openConfig] saving data...', newConfig);

          try {
            for (const key of Object.keys(newConfig)) {
              const value = newConfig[key];
              
              // 区分 Secret 存储和普通 Config 存储
              if ((SECRET_KEYS as readonly string[]).includes(key)) {
                await setSecret(key as any, value);
              } else {
                await setBaseConfig(key, value);
              }
            }
            vscode.window.showInformationMessage('AI Comment: 配置已成功保存！');
          } catch (err: any) {
            vscode.window.showErrorMessage(`AI Comment: 保存失败: ${err.message}`);
          }
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  // 初始加载
  setTimeout(async () => {
    const [base, secrets] = await Promise.all([
      getBaseConfig(),
      getAllSecrets(),
    ]);
    panel?.webview.postMessage({
      command: 'loadConfig',
      data: { ...base, ...secrets }
    });
  }, 500);

  panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}

function getWebviewHtml(webview: vscode.Webview, uiDistUri: vscode.Uri): string {
  const htmlPath = path.join(uiDistUri.fsPath, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  html = html.replace(/\s+crossorigin/g, '');
  const webviewBaseUri = webview.asWebviewUri(uiDistUri).toString();
  html = html.replace(/__WEBVIEW_BASE__/g, webviewBaseUri);
  html = html.replace(/(src|href)="\/([^"]+)"/g, `$1="${webviewBaseUri}/$2"`);

  const nonce = getNonce();
  html = html.replace(/<script type="module"/g, `<script nonce="${nonce}" type="module"`);

  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">`;
  html = html.replace('<head>', `<head>${csp}`);

  return html;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}