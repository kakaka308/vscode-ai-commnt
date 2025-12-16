import * as vscode from 'vscode';
import { AIServiceProvider } from '../api/types';

// 扩展配置类型
export interface AICommentConfig {
  apiKey: string; // 通用/默认 Key (OpenAI用)
  model: string;
  commentStyle: string;
  targetLanguage: string;
  aiProvider: AIServiceProvider;
  commentMode: string;
  
  // 厂商特定配置
  openaiEndpoint?: string;
  qwenApiKey?: string;
  qwenModel?: string;
  qwenEndpoint?: string;
  baiduApiKey?: string;
  baiduSecretKey?: string;
  baiduModel?: string;
  // xunfei... (暂略，需 ws 库)
}

// 获取插件配置
export function getExtensionConfig(): AICommentConfig {
  const config = vscode.workspace.getConfiguration('aiComment');
  return {
    // 通用
    apiKey: config.get('apiKey', ''),
    model: config.get('model', 'gpt-3.5-turbo'),
    commentStyle: config.get('commentStyle', 'default'),
    targetLanguage: config.get('targetLanguage', 'auto'),
    aiProvider: config.get('aiProvider', AIServiceProvider.OpenAI),
    commentMode: config.get('commentMode', 'concise'),

    // OpenAI
    openaiEndpoint: config.get('openaiEndpoint', 'https://api.openai.com/v1/chat/completions'),

    // Qwen (通义千问)
    qwenApiKey: config.get('qwenApiKey', ''),
    qwenModel: config.get('qwenModel', 'qwen-turbo'),
    qwenEndpoint: config.get('qwenEndpoint', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'),

    // Baidu (文心一言)
    baiduApiKey: config.get('baiduApiKey', ''),
    baiduSecretKey: config.get('baiduSecretKey', ''),
    baiduModel: config.get('baiduModel', 'ernie-4.0'),
  };
}

// 验证配置 (根据当前 Provider 验证)
export function validateConfig(): boolean {
  const config = getExtensionConfig();
  
  if (config.aiProvider === AIServiceProvider.OpenAI && !config.apiKey) {
    vscode.window.showErrorMessage('AI Comment: 请配置 OpenAI API Key');
    return false;
  }
  
  if (config.aiProvider === AIServiceProvider.Qwen && !config.qwenApiKey) {
    vscode.window.showErrorMessage('AI Comment: 请配置 Qwen API Key');
    return false;
  }

  if (config.aiProvider === AIServiceProvider.Baidu && (!config.baiduApiKey || !config.baiduSecretKey)) {
    vscode.window.showErrorMessage('AI Comment: 请配置 Baidu API Key 和 Secret Key');
    return false;
  }

  return true;
}