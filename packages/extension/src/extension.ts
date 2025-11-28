import * as vscode from 'vscode';
import { generateSelectedComment } from './commands/generateSelected';
import { generateWholeFileComment } from './commands/generateWholeFile';
import { getExtensionConfig } from './config/config';

// 插件激活时执行（VSCode启动/触发命令时）
export function activate(context: vscode.ExtensionContext) {
  console.log('AI Comment Generator activated!');

  // 1. 注册「选中代码注释」命令
  const generateSelectedDisposable = vscode.commands.registerCommand(
    'ai-comment.generateSelected',
    () => generateSelectedComment()
  );

  // 2. 注册「全文件注释」命令
  const generateWholeFileDisposable = vscode.commands.registerCommand(
    'ai-comment.generateWholeFile',
    () => generateWholeFileComment()
  );

  // 3. 订阅配置变更（可选）
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('aiComment')) {
      vscode.window.showInformationMessage('AI Comment config updated!');
    }
  });

  // 4. 将命令加入上下文（确保插件销毁时释放）
  context.subscriptions.push(
    generateSelectedDisposable,
    generateWholeFileDisposable
  );
}

// 插件销毁时执行
export function deactivate() {
  console.log('AI Comment Generator deactivated!');
}