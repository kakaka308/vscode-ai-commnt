import * as vscode from 'vscode';
import { getExtensionConfig, validateConfig } from '../config/config';
import { generateCommentWithOpenAI } from '../api/openai';
import { generateCommentWithQwen } from '../api/qwen';
import { generateCommentWithBaidu } from '../api/baidu';
import { AIError } from '../api/error';
import { AIServiceProvider, GenerateCommentParams, StreamChunkCallback } from '../api/types';

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
    cancellable: true
  }, async (progress, token) => {
    const abortController = new AbortController();
    token.onCancellationRequested(() => abortController.abort());

    try {
      const isValid = await validateConfig();
      if (!isValid) return;

      const config = await getExtensionConfig();
      const language = config.targetLanguage === 'auto'
        ? document.languageId
        : config.targetLanguage;

      const params: GenerateCommentParams = {
        code: fullCode,
        language,
        commentStyle: config.commentStyle,
        isWholeFile: true
      };

      if (config.commentMode === 'detailed') {
        await streamWholeFile(editor, document, fullCode, config, params, abortController.signal);
      } else {
        const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
        const result = await fn(params, undefined, abortController.signal);
        await editor.edit(editBuilder => {
          // 简洁模式：直接在顶部插入
          editBuilder.insert(new vscode.Position(0, 0), result.comment + '\n\n');
        });
      }

      if (!abortController.signal.aborted) {
        vscode.window.showInformationMessage('AI Comment: 全文件注释生成成功！');
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

async function streamWholeFile(
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
  originalCode: string,
  config: any,
  params: GenerateCommentParams,
  signal: AbortSignal
) {
  let initialized = false;
  
  // 【新增】编辑队列：确保流式片段按顺序写入，互不干扰
  let editQueue = Promise.resolve();

  const onChunk: StreamChunkCallback = async (chunk: string) => {
    if (signal.aborted) return;

    // 将编辑操作排队执行
    editQueue = editQueue.then(async () => {
      await editor.edit(editBuilder => {
        if (!initialized) {
          // 第一次：用第一块内容替换整个文件的原始代码
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          editBuilder.replace(fullRange, chunk);
          initialized = true;
        } else {
          // 后续：动态获取当前文档的最末尾位置并插入
          const lastLine = document.lineCount - 1;
          const lastChar = document.lineAt(lastLine).text.length;
          const endPos = new vscode.Position(lastLine, lastChar);
          editBuilder.insert(endPos, chunk);
        }
      }, { undoStopBefore: false, undoStopAfter: false });
    });

    // 必须等待队列处理完该 chunk，再接收下一个
    await editQueue;
  };

  const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
  await fn(params, onChunk, signal);

  // 用户中途取消：恢复原始内容
  if (signal.aborted && initialized) {
    const currentRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    await editor.edit(editBuilder => {
      editBuilder.replace(currentRange, originalCode);
    });
  }
}

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