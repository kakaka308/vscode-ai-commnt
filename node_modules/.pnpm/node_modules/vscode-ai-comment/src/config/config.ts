import * as vscode from 'vscode';
import { AIServiceProvider } from '../api/types';

// 扩展配置类型（必须包含 commentMode）
export interface AICommentConfig {
  apiKey: string;
  model: string;
  commentStyle: string;
  targetLanguage: string;
  aiProvider: AIServiceProvider;
  commentMode: string; // 核心：注释模式（concise/detailed）
}

// 获取插件配置
export function getExtensionConfig(): AICommentConfig {
  const config = vscode.workspace.getConfiguration('aiComment');
  return {
    apiKey: config.get('apiKey', ''),
    model: config.get('model', 'gpt-3.5-turbo'),
    commentStyle: config.get('commentStyle', 'default'),
    targetLanguage: config.get('targetLanguage', 'auto'),
    aiProvider: config.get('aiProvider', AIServiceProvider.OpenAI),
    commentMode: config.get('commentMode', 'detailed')
  };
}

// 验证配置
export function validateConfig(): boolean {
  const { apiKey } = getExtensionConfig();
  if (!apiKey) {
    vscode.window.showErrorMessage(
      'AI Comment: 请在 VSCode 设置中配置 API Key（设置 > AI Comment Generator > apiKey）'
    );
    return false;
  }
  return true;
}