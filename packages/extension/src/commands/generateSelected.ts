import * as vscode from 'vscode';
import { getExtensionConfig, validateConfig } from '../config/config';
import { generateComment } from '../api/aiService'; 
import { AIError } from '../api/error';
import { GenerateCommentParams } from '../api/types';

export function generateSelectedComment() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('AI Comment: 未激活任何编辑器窗口！');
    return;
  }

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

  if (!validateConfig()) {
    return;
  }

  const config = getExtensionConfig();
  const targetLanguage = config.targetLanguage === 'auto' 
    ? editor.document.languageId 
    : config.targetLanguage;

  const aiParams: GenerateCommentParams = {
    code: selectedCode,
    language: targetLanguage,
    commentStyle: config.commentStyle,
    isWholeFile: false
  };

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

      await editor.edit((editBuilder) => {
        if (config.commentMode === 'concise') {
          // 简洁模式：在选中代码上方插入一行注释
          const insertLine = selection.start.line - 1 >= 0 ? selection.start.line - 1 : 0;
          const insertPosition = new vscode.Position(insertLine, 0);
          editBuilder.insert(insertPosition, aiResponse.comment + '\n\n');
        } else {
          // 详细模式：AI 返回的是带注释的完整代码，直接替换选中区域
          editBuilder.replace(selection, aiResponse.comment);
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