import { GenerateCommentParams, AIResponse, AIServiceProvider } from './types';
import { generateCommentWithOpenAI } from './openai';
import { AIError } from './error';
import { getExtensionConfig } from '../config/config';

/**
 * 统一 AI 注释生成入口（工厂模式：大厂扩展常用）
 * @param params 注释生成参数
 * @returns AIResponse
 */
export async function generateComment(params: GenerateCommentParams): Promise<AIResponse> {
  // 获取当前配置的 AI 服务商（默认 OpenAI）
  const config = getExtensionConfig();
  const provider = (config.aiProvider || AIServiceProvider.OpenAI) as AIServiceProvider;

  // 根据服务商选择具体实现（扩展时只需加 case）
  switch (provider) {
    case AIServiceProvider.OpenAI:
      return await generateCommentWithOpenAI(params);
    // case AIServiceProvider.XunFei:
    //   return await generateCommentWithXunFei(params); // 后续扩展
    // case AIServiceProvider.Baidu:
    //   return await generateCommentWithBaidu(params); // 后续扩展
    default:
      throw new AIError(`不支持的 AI 服务商：${provider}`);
  }
}