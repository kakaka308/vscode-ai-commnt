import { GenerateCommentParams, AIResponse, AIServiceProvider } from './types';
import { generateCommentWithOpenAI } from './openai';
import { generateCommentWithQwen } from './qwen';
import { generateCommentWithBaidu } from './baidu';
import { AIError } from './error';
import { getExtensionConfig } from '../config/config';

export async function generateComment(params: GenerateCommentParams): Promise<AIResponse> {
  const config = getExtensionConfig();
  const provider = (config.aiProvider || AIServiceProvider.OpenAI) as AIServiceProvider;

  switch (provider) {
    case AIServiceProvider.OpenAI:
      return await generateCommentWithOpenAI(params);
    case AIServiceProvider.Qwen:
      return await generateCommentWithQwen(params);
    case AIServiceProvider.Baidu:
      return await generateCommentWithBaidu(params);
    case AIServiceProvider.XunFei:
      throw new AIError('讯飞星火暂未支持 (需要 WebSocket)');
    default:
      throw new AIError(`不支持的 AI 服务商：${provider}`);
  }
}