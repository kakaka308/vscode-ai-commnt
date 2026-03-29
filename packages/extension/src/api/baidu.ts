import axios from 'axios';
import { GenerateCommentParams, AIResponse, StreamChunkCallback } from './types';
import { AIError } from './error';
import { getExtensionConfig } from '../config/config';
import { withRetry } from './retry';
import {
  buildPrompt,
  generateConciseComment,
  cleanDetailedResponse,
  cleanConciseResponse,
} from 'shared';

let cachedToken: string | null = null;
let tokenExpiresTime = 0;

async function getAccessToken(apiKey: string, secretKey: string): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresTime) {
    return cachedToken;
  }
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  const response = await axios.post(url);
  if (response.data.error) {
    throw new AIError(`Baidu Auth Failed: ${response.data.error_description}`);
  }
  cachedToken = response.data.access_token;
  tokenExpiresTime = Date.now() + (response.data.expires_in - 60) * 1000;
  return cachedToken!;
}

function getEndpoint(baiduModel: string): string {
  if (baiduModel?.includes('4.0')) {
    return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
  }
  return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
}

export async function generateCommentWithBaidu(
  params: GenerateCommentParams,
  onChunk?: StreamChunkCallback,
  signal?: AbortSignal       // ← 新增
): Promise<AIResponse> {
  const config = await getExtensionConfig();
  const apiKey = config.baiduApiKey;
  const secretKey = config.baiduSecretKey;

  if (!apiKey || !secretKey) throw new AIError('未配置 Baidu API Key 或 Secret Key');

  const accessToken = await getAccessToken(apiKey, secretKey);
  const endpoint = getEndpoint(config.baiduModel);

  const { code, language, commentStyle, isWholeFile } = params;
  const { system, user } = buildPrompt(
    config.commentMode, language, code, commentStyle, isWholeFile ?? false
  );
  const userPrompt = `${system}\n\n${user}`;

  if (onChunk && config.commentMode === 'detailed') {
    return baiduStreamRequest(endpoint, accessToken, userPrompt, onChunk, signal);
  }

  try {
    const response = await withRetry(
      () => axios.post(
        `${endpoint}?access_token=${accessToken}`,
        {
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.1
        },
        { headers: { 'Content-Type': 'application/json' } }
      ),
      { signal }             // ← 传入 signal
    );

    const data = response.data;
    if (data.error_code) {
      throw new AIError(`Baidu API Error: ${data.error_msg}`);
    }

    const raw: string = data.result;
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(cleanConciseResponse(raw), isWholeFile ?? false, language)
      : cleanDetailedResponse(raw);

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(`Baidu Request Error: ${(error as Error).message}`);
  }
}

async function baiduStreamRequest(
  endpoint: string,
  accessToken: string,
  userPrompt: string,
  onChunk: StreamChunkCallback,
  signal?: AbortSignal       // ← 新增
): Promise<AIResponse> {
  const response = await withRetry(
    () => axios.post(
      `${endpoint}?access_token=${accessToken}`,
      {
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.1,
        max_output_tokens: 4096,
        stream: true
      },
      {
        headers: { 'Content-Type': 'application/json' },
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

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.error_code) {
            reject(new AIError(`Baidu Stream Error: ${parsed.error_msg}`));
            return;
          }

          const delta = parsed.result ?? '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }

          if (parsed.is_end) {
            resolve({ success: true, comment: fullText });
          }
        } catch {
          // 忽略解析失败的行
        }
      }
    });

    response.data.on('error', (err: Error) => {
      reject(new AIError(`Baidu 流式请求失败: ${err.message}`));
    });

    response.data.on('end', () => {
      if (fullText) resolve({ success: true, comment: fullText });
      else reject(new AIError('Baidu 流式响应提前结束'));
    });
  });
}