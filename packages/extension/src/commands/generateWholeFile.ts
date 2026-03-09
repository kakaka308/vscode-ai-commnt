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
  const fullCode = document.getText();
  if (!fullCode.trim()) {
    vscode.window.showErrorMessage('AI Comment: 当前文件内容为空！');
    return;
  }

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'AI Comment: 正在为全文件生成注释...',
    cancellable: false
  }, async (progress) => {
    try {
      // validateConfig 和 getExtensionConfig 都改为 async
      const isValid = await validateConfig();
      if (!isValid) return;

      const config = await getExtensionConfig();
      const targetLanguage = config.targetLanguage === 'auto'
        ? document.languageId
        : config.targetLanguage;

      const aiParams: GenerateCommentParams = {
        code: fullCode,
        language: targetLanguage,
        commentStyle: config.commentStyle,
        isWholeFile: true
      };

      progress.report({ increment: 50 });
      const aiResponse = await generateComment(aiParams);

      if (!aiResponse.success || !aiResponse.comment.trim()) {
        throw new AIError('生成的注释为空，请重试！');
      }

      await editor.edit((editBuilder) => {
        if (config.commentMode === 'concise') {
          const insertPosition = new vscode.Position(0, 0);
          editBuilder.insert(insertPosition, aiResponse.comment + '\n\n');
        } else {
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