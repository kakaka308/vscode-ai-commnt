import * as vscode from 'vscode';
import { getExtensionConfig, validateConfig } from '../config/config';
import { generateComment } from '../api/aiService'; 
import { AIError } from '../api/error';
import { GenerateCommentParams } from '../api/types';

export function generateSelectedComment() {
  // 1. 获取当前编辑器实例
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('AI Comment: 未激活任何编辑器窗口！');
    return;
  }

  // 2. 获取选中的代码
  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showErrorMessage('AI Comment: 请先选中代码片段！');
    return;
  }
  const selectedCode = editor.document.getText(selection);
  if (!selectedCode.trim()) {
    vscode.window.showErrorMessage('AI Comment: 选中的代码为空！');
    return;
  }
  // 3. 验证配置
  if (!validateConfig()) {
    return;
  }

  // 4. 获取配置和文件信息
  const config = getExtensionConfig();
  const document = editor.document;
  const targetLanguage = config.targetLanguage === 'auto' 
    ? editor.document.languageId 
    : config.targetLanguage;

 const aiParams: GenerateCommentParams = {
    code: selectedCode,
    language: targetLanguage,
    commentStyle: config.commentStyle,
    isWholeFile: false
  };
  // 5. 调用AI生成注释（异步）
 vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'AI Comment: 正在生成注释...',
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ increment: 50 });
      const aiResponse = await generateComment(aiParams);

      if (!aiResponse.success || !aiResponse.comment.trim()) {
        throw new AIError('AI Comment: 生成的注释为空，请重试！');
      }

      // ========== 核心：分模式插入注释 ==========
      await editor.edit((editBuilder) => {
        let insertPosition: vscode.Position;
        
        if (config.commentMode === 'concise') {
          // 简洁模式：选中代码上方一行插入
          const insertLine = selection.start.line - 1 >= 0 ? selection.start.line - 1 : 0;
          insertPosition = new vscode.Position(insertLine, 0);
          editBuilder.insert(insertPosition, aiResponse.comment + '\n\n');
        } else {
          // 详细模式：选中代码起始位置插入（原有逻辑）
          insertPosition = new vscode.Position(selection.start.line, 0);
          editBuilder.insert(insertPosition, aiResponse.comment + '\n');
        }
      });

      vscode.window.showInformationMessage('AI Comment: 注释生成成功！');
    } catch (error) {
      if (error instanceof AIError) {
        vscode.window.showErrorMessage(`AI Comment: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`AI Comment: 生成失败 → ${(error as Error).message}`);
      }
    }
  });
}