import * as vscode from 'vscode';
import { getExtensionConfig, validateConfig } from '../config/config';
import { generateCommentWithOpenAI } from '../api/openai';
import { generateCommentWithQwen } from '../api/qwen';
import { generateCommentWithBaidu } from '../api/baidu';
import { AIError } from '../api/error';
import { AIServiceProvider, GenerateCommentParams, StreamChunkCallback } from '../api/types';

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

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'AI Comment: 正在生成注释...',
    cancellable: false
  }, async () => {
    try {
      const isValid = await validateConfig();
      if (!isValid) return;

      const config = await getExtensionConfig();
      const language = config.targetLanguage === 'auto'
        ? editor.document.languageId
        : config.targetLanguage;

      const params: GenerateCommentParams = {
        code: selectedCode,
        language,
        commentStyle: config.commentStyle,
        isWholeFile: false
      };

      if (config.commentMode === 'detailed') {
        await streamToEditor(editor, selection, config, params);
      } else {
        // 简洁模式：普通请求，在选中内容上方插入一行注释
        const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
        const result = await fn(params);
        await editor.edit(editBuilder => {
          const pos = new vscode.Position(selection.start.line, 0);
          editBuilder.insert(pos, result.comment + '\n');
        });
      }

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

async function streamToEditor(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  config: any,
  params: GenerateCommentParams
) {
  // 详细模式：AI 返回「带注释的完整代码」替换选中内容
  // 策略：先收集所有流式内容，再一次性替换选中区域
  // 原因：流式边写边改会导致 selection 范围持续变化，位置计算错乱
  let fullText = '';

  const onChunk: StreamChunkCallback = (chunk: string) => {
    fullText += chunk;
  };

  const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
  await fn(params, onChunk);

  if (!fullText.trim()) {
    throw new AIError('生成的注释为空，请重试！');
  }

  // 全部收完后一次性替换选中内容（不会有重复问题）
  await editor.edit(editBuilder => {
    editBuilder.replace(selection, fullText);
  });
}

type GenerateFn = (params: GenerateCommentParams, onChunk?: StreamChunkCallback) => Promise<any>;

function getGenerateFn(provider: AIServiceProvider): GenerateFn {
  switch (provider) {
    case AIServiceProvider.OpenAI: return generateCommentWithOpenAI;
    case AIServiceProvider.Qwen:   return generateCommentWithQwen;
    case AIServiceProvider.Baidu:  return generateCommentWithBaidu;
    default: throw new AIError(`不支持的 AI 服务商：${provider}`);
  }
}