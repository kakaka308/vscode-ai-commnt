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
    cancellable: false
  }, async () => {
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
        // 详细模式：流式写入，替换整个文件内容
        await streamWholeFile(editor, document, fullCode, config, params);
      } else {
        // 简洁模式：普通请求，在文件第一行插入一句话总结
        const fn = getGenerateFn(config.aiProvider as AIServiceProvider);
        const result = await fn(params);
        await editor.edit(editBuilder => {
          editBuilder.insert(new vscode.Position(0, 0), result.comment + '\n\n');
        });
      }

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

async function streamWholeFile(
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
  originalCode: string,
  config: any,
  params: GenerateCommentParams
) {
  // 详细模式全文件流式策略：
  // 先清空文件内容，然后流式追加 AI 返回的内容
  // 等全部收完后一次性替换，避免中间状态用户看到乱码
  // 这里选择「收集完再替换」而不是「边收边写」
  // 原因：全文件替换时流式边写边改会导致行号错乱

  let fullText = '';

  const onChunk: StreamChunkCallback = (chunk: string) => {
    fullText += chunk;
    // 可选：实时更新状态栏显示已生成字数
    // vscode.window.setStatusBarMessage(`AI Comment: 已生成 ${fullText.length} 字...`);
  };

  const fn = getStreamFn(config.aiProvider as AIServiceProvider);
  await fn(params, onChunk);

  if (!fullText.trim()) {
    throw new AIError('生成的注释为空，请重试！');
  }

  // 全部收完后一次性替换整个文件
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(originalCode.length)
  );

  await editor.edit(editBuilder => {
    editBuilder.replace(fullRange, fullText);
  });
}

// ── 路由函数 ─────────────────────────────────────────────

type GenerateFn = (params: GenerateCommentParams, onChunk?: StreamChunkCallback) => Promise<any>;

function getGenerateFn(provider: AIServiceProvider): GenerateFn {
  switch (provider) {
    case AIServiceProvider.OpenAI:  return generateCommentWithOpenAI;
    case AIServiceProvider.Qwen:    return generateCommentWithQwen;
    case AIServiceProvider.Baidu:   return generateCommentWithBaidu;
    default: throw new AIError(`不支持的 AI 服务商：${provider}`);
  }
}

function getStreamFn(provider: AIServiceProvider): GenerateFn {
  // 流式和普通共用同一个函数，通过 onChunk 参数区分
  return getGenerateFn(provider);
}