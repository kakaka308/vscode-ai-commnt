import * as vscode from 'vscode';
import { generateSelectedComment } from './commands/generateSelected';
import { generateWholeFileComment } from './commands/generateWholeFile';
import { openConfigPanel } from './commands/openConfig'; // 导入新命令

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Comment Generator activated!');

  // 1. 注册「选中代码注释」命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-comment.generateSelected', () => generateSelectedComment())
  );

  // 2. 注册「全文件注释」命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-comment.generateWholeFile', () => generateWholeFileComment())
  );

  // 3. 注册「打开设置面板」命令
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-comment.openConfig', () => openConfigPanel(context))
  );

  // 监听配置变更提示
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('aiComment')) {
      // 可以在这里做一些自动刷新的逻辑，目前仅提示
      // vscode.window.showInformationMessage('AI Comment config updated!');
    }
  });
}

export function deactivate() {
  console.log('AI Comment Generator deactivated!');
}