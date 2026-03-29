import axios, { AxiosError } from 'axios';
import { GenerateCommentParams, AIResponse, StreamChunkCallback } from './types';
import { AIRequestFailedError, AIResponseParseError, AIError } from './error';
import { getExtensionConfig } from '../config/config';
import { withRetry } from './retry';
import {
  buildPrompt,
  generateConciseComment,
  cleanDetailedResponse,
  cleanConciseResponse,
} from 'shared';

export async function generateCommentWithQwen(
  params: GenerateCommentParams,
  onChunk?: StreamChunkCallback,
  signal?: AbortSignal       // ← 新增
): Promise<AIResponse> {
  const config = await getExtensionConfig();
  const apiKey = config.qwenApiKey;
  const model = config.qwenModel || 'qwen-turbo';
  const endpoint = config.qwenEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  if (!apiKey) throw new AIError('未配置 Qwen API Key');

  const { code, language, commentStyle, isWholeFile } = params;
  if (!code?.trim()) throw new AIError('代码内容为空，无法生成注释');

  const { system, user } = buildPrompt(
    config.commentMode, language, code, commentStyle, isWholeFile ?? false
  );
  const userPrompt = `${system}\n\n${user}`;

  if (onChunk && config.commentMode === 'detailed') {
    return qwenStreamRequest(endpoint, apiKey, model, userPrompt, onChunk, signal);
  }

  try {
    const response = await withRetry(
      () => axios.post(
        endpoint,
        { model, messages: [{ role: 'user', content: userPrompt }] },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      ),
      { signal }             // ← 传入 signal
    );

    const data = response.data;
    if (data?.code && data.code !== 'Success') {
      throw new AIError(`Qwen API Error: [${data.code}] ${data.message}`);
    }
    if (!data?.choices?.[0]?.message?.content) {
      throw new AIResponseParseError();
    }

    const raw: string = data.choices[0].message.content;
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(cleanConciseResponse(raw), isWholeFile ?? false, language)
      : cleanDetailedResponse(raw);

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof AxiosError) {
      const detail = error.response?.data?.message || error.message;
      const status = error.response?.status ?? 0;
      throw new AIRequestFailedError(`[${status}] ${detail}`, status);
    }
    throw new AIError(`Qwen API Error: ${(error as Error).message}`);
  }
}

async function qwenStreamRequest(
  endpoint: string,
  apiKey: string,
  model: string,
  userPrompt: string,
  onChunk: StreamChunkCallback,
  signal?: AbortSignal       // ← 新增
): Promise<AIResponse> {
  const response = await withRetry(
    () => axios.post(
      endpoint,
      {
        model,
        messages: [{ role: 'user', content: userPrompt }],
        stream: true,
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 0
      }
    ),
    { signal }               // ← 传入 signal
  );

  return new Promise((resolve, reject) => {
    let fullText = '';
    let buffer = '';

    signal?.addEventListener('abort', () => {
      reject(new Error('用户已取消'));
    });

    response.data.on('data', (chunk: Buffer) => {
      if (signal?.aborted) return;
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') {
          resolve({ success: true, comment: fullText });
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // 忽略解析失败的行
        }
      }
    });

    response.data.on('error', (err: Error) => {
      reject(new AIError(`Qwen 流式请求失败: ${err.message}`));
    });

    response.data.on('end', () => {
      if (fullText) resolve({ success: true, comment: fullText });
      else reject(new AIError('Qwen 流式响应提前结束'));
    });
  });
}