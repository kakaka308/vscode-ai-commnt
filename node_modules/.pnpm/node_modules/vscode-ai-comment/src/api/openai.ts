import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';
import { OpenAIRequest, GenerateCommentParams, AIResponse } from './types';
import { APIKeyMissingError, AIRequestFailedError, AIResponseParseError, AIError } from './error';
import { getExtensionConfig } from '../config/config';
// 引入共享包的注释模板
import { 
  getDefaultStyleByLanguage, 
  generateConciseComment,
  commentTemplates 
} from 'vscode-ai-comment-shared';

/**
 * OpenAI 注释生成实现
 * @param params 注释生成参数
 * @returns AIResponse
 */
export async function generateCommentWithOpenAI(params: GenerateCommentParams): Promise<AIResponse> {
  // 1. 获取插件配置（API Key/模型/注释模式）
  const config = getExtensionConfig();
  const apiKey = config.apiKey;
  const model = config.model || 'gpt-3.5-turbo';

  // 2. 校验 API Key
  if (!apiKey) {
    throw new APIKeyMissingError();
  }

  // 3. 构建提示词（分简洁/详细模式）
  let systemPrompt = '';
  let userPrompt = '';
  const { code, language, commentStyle, isWholeFile } = params;
  // 自动匹配当前语言的默认详细注释风格
  const actualDetailedStyle = commentStyle === 'default' 
    ? getDefaultStyleByLanguage(language) 
    : commentStyle;

  // ========== 核心：补全两种模式的 Prompt ==========
  if (config.commentMode === 'concise') {
    // 简洁模式 Prompt（你已有的逻辑）
    systemPrompt = `你是专业的代码总结助手，需严格遵循以下规则：
      1. 仅输出**一句话**总结（不超过50字），无需多余解释、无换行、无复杂标签；
      2. 总结需精准概括代码功能/逻辑，语言为中文，简洁易懂；
      3. 不修改原有代码，仅输出总结文本（无注释符号，注释符号由调用方添加）；
      4. 示例：
        - 输入代码：function add(a,b) { return a+b; }
        - 输出总结：实现两个数字的加法运算
        - 输入全文件代码：包含多个工具函数的JS工具库
        - 输出总结：提供数组、对象、字符串的常用操作工具函数`;

    userPrompt = isWholeFile 
      ? `总结以下${language}文件的核心功能（仅一句话）：\n${code}`
      : `总结以下${language}代码片段的核心功能（仅一句话）：\n${code}`;
  } else {
    // ========== 新增：详细模式 Prompt ==========
    systemPrompt = `你是一个专业的代码注释生成工具，需遵循以下规则：
    1. 注释风格：${actualDetailedStyle}（如 javadoc 用 /** ... */，godoc 用 // ...）；
    2. 语言：${language}；
    3. 详细注释需包含功能说明、参数说明（如有）、返回值说明（如有）；
    4. 全文件注释需按模块/函数拆分，选中代码注释仅针对选中部分；
    5. 注释语言：中文；
    6. 输出格式：仅返回带注释的代码（无多余解释）。`;

    userPrompt = isWholeFile 
      ? `为以下${language}文件生成${actualDetailedStyle}风格的详细注释：\n${code}`
      : `为以下${language}代码片段生成${actualDetailedStyle}风格的详细注释：\n${code}`;
  }

  // 4. 构建 OpenAI 请求参数
  const requestData: OpenAIRequest = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2 // 低随机性，保证注释稳定
  };

  try {
    // 5. 调用 OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      }
    );

    // 6. 解析响应（分模式生成注释）
    const data = response.data;
    if (!data || !data.choices || data.choices.length === 0) {
      throw new AIResponseParseError();
    }

    let comment = '';
    const rawContent = data.choices[0].message?.content || '';
    
    // ========== 核心：分模式生成注释 ==========
    if (config.commentMode === 'concise') {
      // 简洁模式：调用简洁注释生成函数
      comment = generateConciseComment(rawContent, isWholeFile);
    } else {
      // 详细模式：直接使用 AI 返回的完整注释（AI已包含注释符号）
      comment = rawContent;
    }

    return {
      comment,
      success: true
    };

  } catch (error) {
    // 7. 错误分类处理
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      throw new AIRequestFailedError(message, statusCode);
    } else if (error instanceof AIError) {
      throw error;
    } else {
      throw new AIError(`未知错误：${(error as Error).message}`);
    }
  }
}