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
        await streamSelected(editor, editor.document, selection, config, params, abortController.signal);
      } else {
        const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
        const result = await fn(params, undefined, abortController.signal);
        await editor.edit(editBuilder => {
          editBuilder.insert(selection.start, result.comment + '\n');
        });
      }

      if (!abortController.signal.aborted) {
        vscode.window.showInformationMessage('AI Comment: 注释生成成功！');
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      vscode.window.showErrorMessage(`AI Comment: ${(error as Error).message}`);
    }
  });
}

async function streamSelected(
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
  selection: vscode.Selection,
  config: any,
  params: GenerateCommentParams,
  signal: AbortSignal
) {
  const insertLine = selection.start.line;
  const insertPos = new vscode.Position(insertLine, 0);
  let currentPos = insertPos;
  let initialized = false;

  // 【新增】编辑队列，确保流式写入有序
  let editQueue = Promise.resolve();

  const onChunk: StreamChunkCallback = async (chunk: string) => {
    if (signal.aborted) return;

    // 将编辑操作排队
    editQueue = editQueue.then(async () => {
      await editor.edit(editBuilder => {
        if (!initialized) {
          // 第一次：替换掉选中的原始代码（或在上方插入）
          // 如果你的逻辑是“替换”，用 delete；如果是“上方插入”，删掉 delete 行
          editBuilder.delete(selection);
          editBuilder.insert(insertPos, chunk);
          initialized = true;
        } else {
          // 后续：在当前偏移位置追加
          editBuilder.insert(currentPos, chunk);
        }
      }, { undoStopBefore: false, undoStopAfter: false });

      // 【核心】计算下一次插入的准确位置
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
    });

    await editQueue;
  };

  const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
  await fn(params, onChunk, signal);
}

// signal 作为第三个参数
type GenerateFn = (
  params: GenerateCommentParams,
  onChunk?: StreamChunkCallback,
  signal?: AbortSignal
) => Promise<any>;

function getGenerateFn(provider: AIServiceProvider): GenerateFn {
  switch (provider) {
    case AIServiceProvider.OpenAI: return generateCommentWithOpenAI;
    case AIServiceProvider.Qwen:   return generateCommentWithQwen;
    case AIServiceProvider.Baidu:  return generateCommentWithBaidu;
    default: throw new AIError(`不支持的 AI 服务商：${provider}`);
  }
}