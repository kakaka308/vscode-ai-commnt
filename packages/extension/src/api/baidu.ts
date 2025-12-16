import axios, { AxiosError } from 'axios';
import { GenerateCommentParams, AIResponse } from './types';
import { AIError } from './error';
import { getExtensionConfig } from '../config/config';
import { getDefaultStyleByLanguage, generateConciseComment } from 'vscode-ai-comment-shared';

let cachedToken: string | null = null;
let tokenExpiresTime = 0;

// 获取 Access Token
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
  tokenExpiresTime = Date.now() + (response.data.expires_in - 60) * 1000; // 提前60秒过期
  return cachedToken!;
}

export async function generateCommentWithBaidu(params: GenerateCommentParams): Promise<AIResponse> {
  const config = getExtensionConfig();
  const apiKey = config.baiduApiKey;
  const secretKey = config.baiduSecretKey;
  
  if (!apiKey || !secretKey) throw new AIError('未配置 Baidu API Key 或 Secret Key');

  const accessToken = await getAccessToken(apiKey, secretKey);
  
  // 映射模型到 Endpoint
  // ernie-4.0-8k-latest 对应 compeletions_pro (示例)
  // 实际需根据官方文档维护映射，这里简化处理
  let endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions'; // Ernie-Lite-8K
  if (config.baiduModel?.includes('4.0')) {
    endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
  }

  const { code, language, commentStyle, isWholeFile } = params;
  const actualDetailedStyle = commentStyle === 'default' ? getDefaultStyleByLanguage(language) : commentStyle;

  let prompt = '';
  if (config.commentMode === 'concise') {
    prompt = `请用中文一句话总结以下${language}代码的功能，不要返回代码，不要有多余解释：\n${code}`;
  } else {
    prompt = `请为以下${language}代码生成${actualDetailedStyle}风格的详细注释。直接返回带注释的代码，不要使用Markdown格式：\n${code}`;
  }

  try {
    const response = await axios.post(
      `${endpoint}?access_token=${accessToken}`,
      {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    if (data.error_code) {
      throw new AIError(`Baidu API Error: ${data.error_msg}`);
    }

    const rawContent = data.result;
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(rawContent, isWholeFile, language)
      : rawContent.replace(/^```[\w]*\n?|```$/g, '');

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(`Baidu Request Error: ${(error as Error).message}`);
  }
}