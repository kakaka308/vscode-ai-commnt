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
        const result = await fn(params);
        await editor.edit(editBuilder => {
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

  const onChunk: StreamChunkCallback = async (chunk: string) => {
    if (signal.aborted) return;

    if (!initialized) {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(originalCode.length)
      );
      await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, chunk);
      });
      initialized = true;
    } else {
      // 全文件场景直接读文档末尾，比追踪 currentPos 更可靠
      const lastLine = document.lineCount - 1;
      const lastChar = document.lineAt(lastLine).text.length;
      const endPos = new vscode.Position(lastLine, lastChar);
      await editor.edit(editBuilder => {
        editBuilder.insert(endPos, chunk);
      });
    }
  };

  const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
  await fn(params, onChunk);

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

type GenerateFn = (params: GenerateCommentParams, onChunk?: StreamChunkCallback) => Promise<any>;

function getGenerateFn(provider: AIServiceProvider): GenerateFn {
  switch (provider) {
    case AIServiceProvider.OpenAI: return generateCommentWithOpenAI;
    case AIServiceProvider.Qwen:   return generateCommentWithQwen;
    case AIServiceProvider.Baidu:  return generateCommentWithBaidu;
    default: throw new AIError(`不支持的 AI 服务商：${provider}`);
  }
}