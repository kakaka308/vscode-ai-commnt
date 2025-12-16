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
  const actualDetailedStyle = commentStyle === 'default' ? getDefaultStyleByLanguage(language) : commentStyle;

  let systemPrompt = '';
  let userPrompt = '';

  if (config.commentMode === 'concise') {
    systemPrompt = `你是代码总结专家。请用中文简要总结代码功能（一句话，不超过50字）。不要返回任何代码或额外解释。`;
    userPrompt = `代码(${language}):\n${code}`;
  } else {
    systemPrompt = `你是代码注释生成器。
    1. 语言: ${language}
    2. 风格: ${actualDetailedStyle}
    3. 仅返回包含详细注释的代码片段，不要用Markdown包裹，不要解释。`;
    userPrompt = `为以下代码生成注释:\n${code}`;
  }

  try {
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
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
    if (!data?.choices?.[0]?.message?.content) {
      throw new AIResponseParseError();
    }

    const rawContent = data.choices[0].message.content;
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(rawContent, isWholeFile, language)
      : rawContent.replace(/^```[\w]*\n?|```$/g, ''); // 去除可能存在的 markdown 标记

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AxiosError) {
      throw new AIRequestFailedError(error.message, error.response?.status);
    }
    throw new AIError(`Qwen API Error: ${(error as Error).message}`);
  }
}