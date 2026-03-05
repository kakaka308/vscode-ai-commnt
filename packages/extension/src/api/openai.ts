import axios, { AxiosError } from 'axios';
import { OpenAIRequest, GenerateCommentParams, AIResponse } from './types';
import { APIKeyMissingError, AIRequestFailedError, AIResponseParseError, AIError } from './error';
import { getExtensionConfig } from '../config/config';
import {
  buildPrompt,
  generateConciseComment,
  cleanDetailedResponse,
  cleanConciseResponse,
} from 'shared';

export async function generateCommentWithOpenAI(params: GenerateCommentParams): Promise<AIResponse> {
  const config = getExtensionConfig();
  const apiKey = config.apiKey;
  const model = config.model || 'gpt-3.5-turbo';
  const endpoint = config.openaiEndpoint || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) throw new APIKeyMissingError();

  const { code, language, commentStyle, isWholeFile } = params;

  // 统一使用 shared 的 buildPrompt 构建
  const { system: systemPrompt, user: userPrompt } = buildPrompt(
    config.commentMode,
    language,
    code,
    commentStyle,
    isWholeFile ?? false
  );

  const requestData: OpenAIRequest = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2
  };

  try {
    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const data = response.data;
    if (!data?.choices?.[0]?.message?.content) {
      throw new AIResponseParseError();
    }

    const rawContent: string = data.choices[0].message.content;

    // 统一使用 shared 的清洗函数处理响应
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(cleanConciseResponse(rawContent), isWholeFile ?? false, language)
      : cleanDetailedResponse(rawContent);

    return { comment, success: true };

  } catch (error) {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.error?.message || error.message;
      throw new AIRequestFailedError(message, error.response?.status);
    }
    if (error instanceof AIError) throw error;
    throw new AIError(`未知错误：${(error as Error).message}`);
  }
}