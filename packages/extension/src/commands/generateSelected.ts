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
    cancellable: true
  }, async (progress, token) => {
    const abortController = new AbortController();
    token.onCancellationRequested(() => abortController.abort());

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
        await streamReplaceSelection(editor, selection, config, params, abortController.signal);
      } else {
        const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
        const result = await fn(params);
        await editor.edit(editBuilder => {
          const pos = new vscode.Position(selection.start.line, 0);
          editBuilder.insert(pos, result.comment + '\n');
        });
      }

      if (!abortController.signal.aborted) {
        vscode.window.showInformationMessage('AI Comment: 注释生成成功！');
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      if (error instanceof AIError) {
        vscode.window.showErrorMessage(`AI Comment: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`AI Comment: 生成失败 → ${(error as Error).message}`);
      }
    }
  });
}

async function streamReplaceSelection(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  config: any,
  params: GenerateCommentParams,
  signal: AbortSignal
) {
  const insertLine = selection.start.line;
  const insertPos = new vscode.Position(insertLine, 0);
  let currentPos = insertPos;
  let initialized = false;

  const onChunk: StreamChunkCallback = async (chunk: string) => {
    if (signal.aborted) return;

    if (!initialized) {
      await editor.edit(editBuilder => {
        editBuilder.delete(selection);
        editBuilder.insert(insertPos, chunk);
      });
      initialized = true;
    } else {
      await editor.edit(editBuilder => {
        editBuilder.insert(currentPos, chunk);
      });
    }

    // 根据本次写入内容更新 currentPos
    const lines = chunk.split('\n');
    if (lines.length > 1) {
      currentPos = new vscode.Position(
        currentPos.line + lines.length - 1,
        lines[lines.length - 1].length
      );
    } else {
      currentPos = new vscode.Position(
        currentPos.line,
        currentPos.character + chunk.length
      );
    }
  };

  const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
  await fn(params, onChunk);
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