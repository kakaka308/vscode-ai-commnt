import axios, { AxiosError } from 'axios';
import { GenerateCommentParams, AIResponse } from './types';
import { AIRequestFailedError, AIResponseParseError, AIError } from './error';
import { getExtensionConfig } from '../config/config';
import { getDefaultStyleByLanguage, generateConciseComment } from 'vscode-ai-comment-shared';

export async function generateCommentWithQwen(params: GenerateCommentParams): Promise<AIResponse> {
  const config = getExtensionConfig();
  const apiKey = config.qwenApiKey;
  const model = config.qwenModel || 'qwen-turbo';
  const endpoint = config.qwenEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  if (!apiKey) throw new AIError('未配置 Qwen API Key');

  const { code, language, commentStyle, isWholeFile } = params;

  if (!code || !code.trim()) {
    throw new AIError('代码内容为空，无法生成注释');
  }

  const actualDetailedStyle = commentStyle === 'default' ? getDefaultStyleByLanguage(language) : commentStyle;

  let userPrompt: string;

  if (config.commentMode === 'concise') {
    userPrompt = `你是代码总结专家。请用中文简要总结代码功能（一句话，不超过50字）。不要返回任何代码或额外解释。\n\n代码(${language}):\n${code}`;
  } else {
    userPrompt = `你是代码注释生成器，请遵循以下规则：\n1. 语言: ${language}\n2. 风格: ${actualDetailedStyle}\n3. 仅返回包含详细注释的代码片段，不要用Markdown包裹，不要解释。\n\n为以下代码生成注释:\n${code}`;
  }

  console.log('[Qwen Debug] model:', model);
  console.log('[Qwen Debug] endpoint:', endpoint);
  console.log('[Qwen Debug] prompt length:', userPrompt.length);
  console.log('[Qwen Debug] prompt preview:', userPrompt.slice(0, 200));

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

    const rawContent = data.choices[0].message.content;
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(rawContent, isWholeFile, language)
      : rawContent.replace(/^```[\w]*\n?|```$/g, '');

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof AxiosError) {
      const detail = error.response?.data?.message || error.response?.data?.error?.message || error.message;
      const status = error.response?.status ?? 0;
      console.error('[Qwen Debug] full error response:', JSON.stringify(error.response?.data));
      throw new AIRequestFailedError(`[${status}] ${detail}`, status);
    }
    throw new AIError(`Qwen API Error: ${(error as Error).message}`);
  }
}






















