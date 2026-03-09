import axios from 'axios';
import { GenerateCommentParams, AIResponse } from './types';
import { AIError } from './error';
import { getExtensionConfig } from '../config/config';
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

export async function generateCommentWithBaidu(params: GenerateCommentParams): Promise<AIResponse> {
  const config = await getExtensionConfig();
  const apiKey = config.baiduApiKey;
  const secretKey = config.baiduSecretKey;

  if (!apiKey || !secretKey) throw new AIError('未配置 Baidu API Key 或 Secret Key');

  const accessToken = await getAccessToken(apiKey, secretKey);

  let endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
  if (config.baiduModel?.includes('4.0')) {
    endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
  }

  const { code, language, commentStyle, isWholeFile } = params;
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
      `${endpoint}?access_token=${accessToken}`,
      { messages: [{ role: 'user', content: userPrompt }], temperature: 0.1 },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    if (data.error_code) {
      throw new AIError(`Baidu API Error: ${data.error_msg}`);
    }

    const rawContent: string = data.result;
    const comment = config.commentMode === 'concise'
      ? generateConciseComment(cleanConciseResponse(rawContent), isWholeFile ?? false, language)
      : cleanDetailedResponse(rawContent);

    return { success: true, comment };

  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(`Baidu Request Error: ${(error as Error).message}`);
  }
}