import axios from 'axios';
import { getExtensionConfig } from '../config/config';
import { buildPrompt, cleanDetailedResponse,
         cleanConciseResponse, generateConciseComment } from 'shared';
import { APIKeyMissingError, AIRequestFailedError } from './error';
import { withRetry } from './retry';
import type { GenerateCommentParams, AIResponse, StreamChunkCallback } from './types';

export async function generateCommentWithOpenAI(
  params: GenerateCommentParams,
  onChunk?: StreamChunkCallback
): Promise<AIResponse> {
  const config = await getExtensionConfig();
  const apiKey = config.apiKey;
  if (!apiKey) throw new APIKeyMissingError();

  const { code, language, commentStyle, isWholeFile } = params;
  const { system, user } = buildPrompt(
    config.commentMode, language, code, commentStyle, isWholeFile ?? false
  );

  if (onChunk && config.commentMode === 'detailed') {
    return streamRequest(config.openaiEndpoint, apiKey, config.model, system, user, onChunk);
  }

  // 普通请求接入 withRetry
  const response = await withRetry(() =>
    axios.post(config.openaiEndpoint, {
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 30000
    })
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
  onChunk: StreamChunkCallback
): Promise<AIResponse> {
  // 流式请求也接入 withRetry，连接失败时重试
  const response = await withRetry(() =>
    axios.post(endpoint, {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      stream: true,
      temperature: 0.2
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      responseType: 'stream',
      timeout: 60000
    })
  );

  return new Promise((resolve, reject) => {
    let fullText = '';
    let buffer = '';

    response.data.on('data', (chunk: Buffer) => {
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