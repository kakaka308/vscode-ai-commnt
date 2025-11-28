import * as vscode from 'vscode';
import { getExtensionConfig, validateConfig } from '../config/config';
import { generateComment } from '../api/aiService';
import { AIError } from '../api/error';
import { GenerateCommentParams } from '../api/types';

export function generateWholeFileComment() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('AI Comment: 未激活任何编辑器窗口！');
    return;
  }

  const document = editor.document;
  if (document.isClosed || (document.isDirty && !document.isUntitled)) {
    vscode.window.showWarningMessage('AI Comment: 当前文件不可编辑，请保存后重试！');
    return;
  }

  const fullCode = document.getText();
  if (!fullCode.trim()) {
    vscode.window.showErrorMessage('AI Comment: 当前文件内容为空！');
    return;
  }

  if (!validateConfig()) {
    return;
  }

  const config = getExtensionConfig();
  const targetLanguage = config.targetLanguage === 'auto' 
    ? document.languageId 
    : config.targetLanguage;

  const aiParams: GenerateCommentParams = {
    code: fullCode,
    language: targetLanguage,
    commentStyle: config.commentStyle,
    isWholeFile: true
  };

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'AI Comment: 正在为全文件生成注释...',
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
        if (config.commentMode === 'concise') {
          // 简洁模式：文件开头插入（仅加总结）
          const insertPosition = new vscode.Position(0, 0);
          editBuilder.insert(insertPosition, aiResponse.comment + '\n\n');
        } else {
          // 详细模式：替换全文件内容（原有逻辑）
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(fullCode.length)
          );
          editBuilder.replace(fullRange, aiResponse.comment);
        }
      });

      vscode.window.showInformationMessage('AI Comment: 全文件注释生成成功！');
    } catch (error) {
      if (error instanceof AIError) {
        vscode.window.showErrorMessage(`AI Comment: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`AI Comment: 生成失败 → ${(error as Error).message}`);
      }
    }
  });
}