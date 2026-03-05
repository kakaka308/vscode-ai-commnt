import axios, { AxiosError } from 'axios';
import { GenerateCommentParams, AIResponse } from './types';
import { AIRequestFailedError, AIResponseParseError, AIError } from './error';
import { getExtensionConfig } from '../config/config';
import {
  buildPrompt,
  generateConciseComment,
  cleanDetailedResponse,
  cleanConciseResponse,
} from 'shared';

export async function generateCommentWithQwen(params: GenerateCommentParams): Promise<AIResponse> {
  const config = getExtensionConfig();
  const apiKey = config.qwenApiKey;
  const model = config.qwenModel || 'qwen-turbo';
  const endpoint = config.qwenEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  if (!apiKey) throw new AIError('未配置 Qwen API Key');

  const { code, language, commentStyle, isWholeFile } = params;

  if (!code?.trim()) throw new AIError('代码内容为空，无法生成注释');

  const { system, user } = buildPrompt(
    config.commentMode,
    language,
    code,
    commentStyle,
    isWholeFile ?? false
  );
  const userPrompt = `${system}\n\n${user}`;

  try {
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [{ role: 'user', content: userPrompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const data = response.data;

    if (data?.code && data.code !== 'Success') {
      throw new AIError(`Qwen API Error: [${data.code}] ${data.message}`);
    }

    if (!data?.choices?.[0]?.message?.content) {
      throw new AIResponseParseError();
    }

    const rawContent: string = data.choices[0].message.content;

    const comment = config.commentMode === 'concise'
      ? generateConciseComment(cleanConciseResponse(rawContent), isWholeFile ?? false, language)
      : cleanDetailedResponse(rawContent);

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof AxiosError) {
      const detail = error.response?.data?.message || error.response?.data?.error?.message || error.message;
      const status = error.response?.status ?? 0;
      throw new AIRequestFailedError(`[${status}] ${detail}`, status);
    }
    throw new AIError(`Qwen API Error: ${(error as Error).message}`);
  }
}