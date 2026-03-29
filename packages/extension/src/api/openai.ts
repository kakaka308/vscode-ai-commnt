import axios from 'axios';
import { getExtensionConfig } from '../config/config';
import { buildPrompt, cleanDetailedResponse,
         cleanConciseResponse, generateConciseComment } from 'shared';
import { APIKeyMissingError } from './error';
import { withRetry } from './retry';
import type { GenerateCommentParams, AIResponse, StreamChunkCallback } from './types';

export async function generateCommentWithOpenAI(
  params: GenerateCommentParams,
  onChunk?: StreamChunkCallback,
  signal?: AbortSignal       // ← 新增
): Promise<AIResponse> {
  const config = await getExtensionConfig();
  const apiKey = config.apiKey;
  if (!apiKey) throw new APIKeyMissingError();

  const { code, language, commentStyle, isWholeFile } = params;
  const { system, user } = buildPrompt(
    config.commentMode, language, code, commentStyle, isWholeFile ?? false
  );

  if (onChunk && config.commentMode === 'detailed') {
    return streamRequest(config.openaiEndpoint, apiKey, config.model, system, user, onChunk, signal);
  }

  const response = await withRetry(
    () => axios.post(config.openaiEndpoint, {
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 30000
    }),
    { signal }               // ← 传入 signal
  );

  const raw: string = response.data.choices[0].message.content;
  const comment = config.commentMode === 'concise'
    ? generateConciseComment(cleanConciseResponse(raw), isWholeFile ?? false, language)
    : cleanDetailedResponse(raw);

  return { success: true, comment };
}

async function streamRequest(
  endpoint: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  onChunk: StreamChunkCallback,
  signal?: AbortSignal       // ← 新增
): Promise<AIResponse> {
  const response = await withRetry(
    () => axios.post(endpoint, {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      stream: true,
      temperature: 0.2,
      max_tokens: 4096
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      responseType: 'stream',
      timeout: 0
    }),
    { signal }               // ← 传入 signal
  );

  return new Promise((resolve, reject) => {
    let fullText = '';
    let buffer = '';

    // 用户取消时中断流
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

    response.data.on('error', reject);
    response.data.on('end', () => {
      if (fullText) resolve({ success: true, comment: fullText });
      else reject(new Error('流式响应提前结束'));
    });
  });
}